import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { MultiModeGenerator } from '@/shared/blocks/generator/multi-mode-generator';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'common.multi_generator',
  });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/ai/generator`
          : `${envConfigs.app_url}/ai/generator`,
    },
  };
}

export default async function AiGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MultiModeGenerator />;
}
