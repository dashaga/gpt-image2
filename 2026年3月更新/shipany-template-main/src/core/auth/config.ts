import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP, oneTap } from 'better-auth/plugins';
import { getLocale } from 'next-intl/server';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { isCloudflareWorker } from '@/shared/lib/env';
import { LoginOtpEmail } from '@/shared/blocks/email/login-otp';
import {
  getCookieFromCtx,
  getHeaderValue,
  guessLocaleFromAcceptLanguage,
} from '@/shared/lib/cookie';
import { getUuid } from '@/shared/lib/hash';
import { getClientIp } from '@/shared/lib/ip';
import { grantCreditsForNewUser } from '@/shared/models/credit';
import { getEmailService } from '@/shared/services/email';
import { grantRoleForNewUser } from '@/shared/services/rbac';

// Static auth options - NO database connection
// This ensures zero database calls during build time
const authOptions = {
  appName: envConfigs.app_name,
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  trustedOrigins: envConfigs.app_url ? [envConfigs.app_url] : [],
  user: {
    // Allow persisting custom columns on user table.
    // Without this, better-auth may ignore extra properties during create/update.
    additionalFields: {
      utmSource: {
        type: 'string',
        // Not user-editable input; we set it internally.
        input: false,
        required: false,
        defaultValue: '',
      },
      ip: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
      locale: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
    },
  },
  advanced: {
    database: {
      generateId: () => getUuid(),
    },
  },
  logger: {
    verboseLogging: false,
    // Disable all logs during build and production
    disabled: true,
  },
};

// get auth options with configs
export async function getAuthOptions(configs: Record<string, string>) {
  const emailOtpEnabled =
    configs.email_auth_enabled !== 'false' && !!configs.resend_api_key;

  return {
    ...authOptions,
    // Add database connection only when actually needed (runtime)
    // D1 is only available inside Cloudflare Workers runtime (not during build)
    database: (envConfigs.database_url || (envConfigs.database_provider === 'd1' && isCloudflareWorker))
      ? drizzleAdapter(db(), {
          provider: getDatabaseProvider(envConfigs.database_provider),
          schema: schema,
        })
      : null,
    databaseHooks: {
      user: {
        create: {
          before: async (user: any, ctx: any) => {
            try {
              const ip = await getClientIp();
              if (ip) {
                user.ip = ip;
              }

              // Prefer NEXT_LOCALE cookie (next-intl). Fallback to accept-language.
              const localeFromCookie = getCookieFromCtx(ctx, 'NEXT_LOCALE');

              const localeFromHeader = guessLocaleFromAcceptLanguage(
                getHeaderValue(ctx, 'accept-language')
              );

              const locale =
                (localeFromCookie || localeFromHeader || (await getLocale())) ??
                '';

              if (locale && typeof locale === 'string') {
                user.locale = locale.slice(0, 20);
              }

              // Only set on first creation; never overwrite later.
              if (user?.utmSource) return user;

              const raw = getCookieFromCtx(ctx, 'utm_source');
              if (!raw || typeof raw !== 'string') return user;

              // Keep it small & safe.
              const decoded = decodeURIComponent(raw).trim();
              const sanitized = decoded
                .replace(/[^\w\-.:]/g, '') // allow a-zA-Z0-9_ - . :
                .slice(0, 100);

              if (sanitized) {
                user.utmSource = sanitized;
              }
            } catch {
              // best-effort only
            }
            return user;
          },
          after: async (user: any) => {
            try {
              if (!user.id) {
                throw new Error('user id is required');
              }

              // grant credits for new user
              await grantCreditsForNewUser(user);

              // grant role for new user
              await grantRoleForNewUser(user);
            } catch (e) {
              console.log('grant credits or role for new user failed', e);
            }
          },
        },
      },
    },
    socialProviders: await getSocialProviders(configs),
    plugins: [
      ...(emailOtpEnabled
        ? [
            emailOTP({
              // OTP-only login: new users are auto-created on first verified code.
              // 6-digit code, valid for 10 minutes, 5 attempts.
              otpLength: 6,
              expiresIn: 60 * 10,
              allowedAttempts: 5,
              // Bind delivery to the Resend-backed email service used elsewhere.
              sendVerificationOTP: async ({ email, otp, type }) => {
                if (type !== 'sign-in') return;
                try {
                  const emailService = await getEmailService(configs as any);
                  const logoUrl = envConfigs.app_logo?.startsWith('http')
                    ? envConfigs.app_logo
                    : `${envConfigs.app_url}${envConfigs.app_logo?.startsWith('/') ? '' : '/'}${envConfigs.app_logo || ''}`;
                  await emailService.sendEmail({
                    to: email,
                    subject: `${otp} is your sign-in code - ${envConfigs.app_name}`,
                    react: LoginOtpEmail({
                      appName: envConfigs.app_name,
                      logoUrl,
                      otp,
                    }),
                  });
                } catch (e) {
                  console.log('send login otp email failed:', e);
                }
              },
            }),
          ]
        : []),
      ...(configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [oneTap()]
        : []),
    ],
  };
}

// get social providers with configs
export async function getSocialProviders(configs: Record<string, string>) {
  const providers: any = {};

  // google auth
  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  // github auth
  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

// convert database provider to better-auth database provider
export function getDatabaseProvider(
  provider: string
): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'sqlite':
      return 'sqlite';
    case 'turso':
      return 'sqlite';
    case 'd1':
      return 'sqlite';
    case 'postgresql':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
