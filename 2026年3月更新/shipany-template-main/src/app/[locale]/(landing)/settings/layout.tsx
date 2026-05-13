import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { ConsoleLayout } from '@/shared/blocks/console/layout';

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('settings.sidebar');

  // settings nav
  const nav = t.raw('nav');

  return (
    <ConsoleLayout
      nav={nav}
      className="py-16 md:py-20"
    >
      {children}
    </ConsoleLayout>
  );
}
