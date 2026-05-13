import { setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import { ShowcaseGallery } from '@/themes/default/blocks/showcase-gallery';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.showcases.metadata',
  canonicalUrl: '/showcases',
});

export default async function ShowcasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ShowcaseGallery locale={locale} />;
}
