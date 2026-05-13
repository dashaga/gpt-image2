import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Coins } from 'lucide-react';

import { Empty } from '@/shared/blocks/common';
import { TableCard } from '@/shared/blocks/table';
import {
  Credit,
  CreditStatus,
  CreditTransactionType,
  getCredits,
  getCreditsCount,
  getRemainingCredits,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; type?: string }>;
}) {
  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.credits');

  const total = await getCreditsCount({
    transactionType: type as CreditTransactionType,
    userId: user.id,
    status: CreditStatus.ACTIVE,
  });

  const credits = await getCredits({
    userId: user.id,
    status: CreditStatus.ACTIVE,
    transactionType: type as CreditTransactionType,
    page,
    limit,
  });

  const table: Table = {
    title: t('list.title'),
    columns: [
      {
        name: 'transactionNo',
        title: t('fields.transaction_no'),
        type: 'copy',
      },
      { name: 'description', title: t('fields.description') },
      {
        name: 'transactionType',
        title: t('fields.type'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'transactionScene',
        title: t('fields.scene'),
        type: 'label',
        placeholder: '-',
        metadata: { variant: 'outline' },
      },
      {
        name: 'credits',
        title: t('fields.credits'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'createdAt',
        title: t('fields.created_at'),
        type: 'time',
      },
    ],
    data: credits,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const remainingCredits = await getRemainingCredits(user.id);

  const tabs: Tab[] = [
    {
      title: t('list.tabs.all'),
      name: 'all',
      url: '/settings/credits',
      is_active: !type || type === 'all',
    },
    {
      title: t('list.tabs.grant'),
      name: 'grant',
      url: '/settings/credits?type=grant',
      is_active: type === 'grant',
    },
    {
      title: t('list.tabs.consume'),
      name: 'consume',
      url: '/settings/credits?type=consume',
      is_active: type === 'consume',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Credits banner */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* Left: icon + balance */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/75">{t('view.banner_label')}</p>
              <p className="text-4xl font-bold mt-0.5 leading-none">{remainingCredits}</p>
            </div>
          </div>
          {/* Right: hint + purchase button */}
          <div className="flex flex-col items-start sm:items-end gap-3">
            <p className="text-sm text-white/75">{t('view.hint')}</p>
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-lg bg-white text-[#6366F1] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              {t('view.buttons.purchase')}
            </Link>
          </div>
        </div>
      </div>

      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
