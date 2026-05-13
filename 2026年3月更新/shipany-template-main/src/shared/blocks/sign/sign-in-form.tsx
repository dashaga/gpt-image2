'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { authClient, signIn } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { defaultLocale } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAppContext } from '@/shared/contexts/app';

import { SocialProviders } from './social-providers';

const RESEND_COOLDOWN_SECONDS = 60;

export function SignInForm({
  callbackUrl = '/',
  className,
}: {
  callbackUrl: string;
  className?: string;
  // Note: registration is intentionally not exposed in the UI — sign-up is
  // handled implicitly the first time someone verifies an OTP / OAuth code.
  onSwitchToSignUp?: never;
}) {
  const t = useTranslations('common.sign');
  const router = useRouter();
  const locale = useLocale();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const { configs, setIsShowSignModal, setUser, fetchUserInfo } =
    useAppContext();

  const isGoogleAuthEnabled = configs.google_auth_enabled === 'true';
  const isGithubAuthEnabled = configs.github_auth_enabled === 'true';
  const isEmailAuthEnabled =
    configs.email_auth_enabled !== 'false' ||
    (!isGoogleAuthEnabled && !isGithubAuthEnabled);

  if (callbackUrl) {
    if (
      locale !== defaultLocale &&
      callbackUrl.startsWith('/') &&
      !callbackUrl.startsWith(`/${locale}`)
    ) {
      callbackUrl = `/${locale}${callbackUrl}`;
    }
  }

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(
      () => setResendSeconds((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const startResendCooldown = () => setResendSeconds(RESEND_COOLDOWN_SECONDS);

  const otpInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (step === 'otp') {
      otpInputRef.current?.focus();
    }
  }, [step]);

  const sendOtp = async ({ resend = false }: { resend?: boolean } = {}) => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error(t('email_required'));
      return false;
    }

    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: 'sign-in',
      });
      if (error) {
        toast.error(error.message || t('otp_send_failed'));
        return false;
      }
      if (resend) toast.success(t('otp_resend_sent'));
      startResendCooldown();
      return true;
    } catch (e: any) {
      toast.error(e?.message || t('otp_send_failed'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (loading) return;
    const ok = await sendOtp();
    if (ok) setStep('otp');
  };

  const handleVerify = async () => {
    if (loading) return;
    const code = otp.trim();
    if (!code || code.length < 4) {
      toast.error(t('otp_required'));
      return;
    }

    setLoading(true);
    try {
      await signIn.emailOtp(
        { email: email.trim(), otp: code },
        {
          onSuccess: async () => {
            try {
              const res: any = await authClient.getSession();
              const freshUser = res?.data?.user ?? res?.user ?? null;
              if (freshUser) {
                setUser(freshUser);
                fetchUserInfo();
              }
            } catch {}
            setIsShowSignModal(false);
            setLoading(false);
            router.refresh();
          },
          onError: (e: any) => {
            toast.error(e?.error?.message || 'sign in failed');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      toast.error(e?.message || 'sign in failed');
      setLoading(false);
    }
  };

  return (
    <div className={`w-full md:max-w-md ${className ?? ''}`}>
      <div className="grid gap-4">
        {isEmailAuthEnabled && step === 'email' && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendCode();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="email">{t('email_title')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('email_placeholder')}
                required
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <p>{t('send_code_title')}</p>
              )}
            </Button>
          </form>
        )}

        {isEmailAuthEnabled && step === 'otp' && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleVerify();
            }}
          >
            <p className="text-sm text-neutral-500">
              {t('otp_sent_to', { email })}
            </p>

            <div className="grid gap-2">
              <Label htmlFor="otp-modal">{t('otp_title')}</Label>
              <Input
                id="otp-modal"
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder={t('otp_placeholder')}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\s+/g, '').trim())
                }
                required
              />
              <p className="text-xs text-neutral-500">
                {t('otp_new_user_hint')}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <p>{t('otp_continue_title')}</p>
              )}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-white/80"
                onClick={() => {
                  if (loading) return;
                  setOtp('');
                  setStep('email');
                }}
              >
                <ArrowLeft size={12} />
                {t('otp_use_different_email')}
              </button>

              <button
                type="button"
                className="text-neutral-500 underline-offset-2 hover:underline disabled:opacity-50"
                disabled={loading || resendSeconds > 0}
                onClick={() => {
                  void sendOtp({ resend: true });
                }}
              >
                {resendSeconds > 0
                  ? t('otp_resend_countdown', { seconds: resendSeconds })
                  : t('otp_resend')}
              </button>
            </div>
          </form>
        )}

        <SocialProviders
          configs={configs}
          callbackUrl={callbackUrl || '/'}
          loading={loading}
          setLoading={setLoading}
        />
      </div>
    </div>
  );
}
