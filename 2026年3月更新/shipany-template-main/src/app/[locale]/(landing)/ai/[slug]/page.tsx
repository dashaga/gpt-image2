import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { MODELS, MODEL_BY_SLUG, ModelPage, SeedancePage, UnifiedImagePage, UnifiedVideoPage, VideoModelPage } from '@/shared/blocks/model-page';

export const revalidate = 3600;

export function generateStaticParams() {
  // Pre-render every model page across every locale at build time.
  return locales.flatMap((locale) =>
    MODELS.map((m) => ({ locale, slug: m.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const meta = MODEL_BY_SLUG[slug];
  if (!meta) return {};

  const lang = (locale === 'zh' ? 'zh' : 'en') as 'en' | 'zh';
  const name = meta.name[lang] ?? meta.name.en;
  const generatorLabel =
    lang === 'zh'
      ? meta.type === 'image'
        ? 'AI 图像生成'
        : 'AI 视频生成'
      : meta.type === 'image'
        ? 'AI Image Generator'
        : 'AI Video Generator';
  const title = `${name} – ${generatorLabel}`;
  const description = meta.description[lang] ?? meta.description.en;

  return {
    title,
    description,
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/ai/${slug}`
          : `${envConfigs.app_url}/ai/${slug}`,
    },
  };
}

export default async function AiModelPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!MODEL_BY_SLUG[slug]) notFound();

  // All three video models share UnifiedVideoPage
  const VIDEO_SLUGS = ['seedance2', 'hailuo', 'grok-video'];
  if (VIDEO_SLUGS.includes(slug)) return <UnifiedVideoPage slug={slug} />;

  // Unified image page: 4 primary models + legacy models still work via direct URL
  const UNIFIED_SLUGS = ['gpt-image-2', 'nano-banana-pro', 'seedream5', 'ai-image-upscaler',
                          'flux-2-pro', 'ideogram-v3'];
  if (UNIFIED_SLUGS.includes(slug)) return <UnifiedImagePage slug={slug} />;

  return <ModelPage slug={slug} />;
}
