import { redirect } from '@/core/i18n/navigation';

// Sign-up is intentionally folded into the sign-in flow:
// new users are auto-created on first verified OTP / OAuth sign-in.
// We keep this route only to preserve any old bookmarks / external links.
export default async function SignUpPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const { locale } = await params;

  const target = callbackUrl
    ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/sign-in';

  redirect({ href: target, locale });
}
