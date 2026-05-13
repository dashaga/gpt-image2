import Link from 'next/link';
import moment from 'moment';
import { getTranslations } from 'next-intl/server';
import { CreditCard } from 'lucide-react';

import { Empty } from '@/shared/blocks/common';
import { TableCard } from '@/shared/blocks/table';
import {
  getCurrentSubscription,
  getSubscriptions,
  getSubscriptionsCount,
  SubscriptionStatus,
} from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; status?: string }>;
}) {
  const { page: pageNum, pageSize, status } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.billing');

  const currentSubscription = await getCurrentSubscription(user.id);

  const total = await getSubscriptionsCount({
    userId: user.id,
    status,
  });

  const subscriptions = await getSubscriptions({
    userId: user.id,
    status,
    page,
    limit,
  });

  const table: Table = {
    title: t('list.title'),
    columns: [
      {
        name: 'subscriptionNo',
        title: t('fields.subscription_no'),
        type: 'copy',
      },
      {
        name: 'interval',
        title: t('fields.interval'),
        callback: function (item) {
          if (!item.interval || !item.intervalCount) {
            return '-';
          }
          return <div>{`${item.intervalCount}-${item.interval}`}</div>;
        },
      },
      {
        name: 'status',
        title: t('fields.status'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        title: t('fields.amount'),
        callback: function (item) {
          const currency = (item.currency || 'USD').toUpperCase();

          let prefix = '';
          if (currency === 'USD') {
            prefix = `$`;
          } else if (currency === 'EUR') {
            prefix = `€`;
          } else if (currency === 'CNY') {
            prefix = `¥`;
          } else {
            prefix = `${currency} `;
          }

          return (
            <div className="text-primary">{`${prefix}${item.amount / 100}`}</div>
          );
        },
      },
      {
        name: 'createdAt',
        title: t('fields.created_at'),
        type: 'time',
      },
      {
        title: t('fields.end_time'),
        callback: function (item) {
          if (item.canceledEndAt) {
            return <div>{moment(item.canceledEndAt).format('YYYY-MM-DD')}</div>;
          }
          return '-';
        },
      },
      {
        title: t('fields.action'),
        type: 'dropdown',
        callback: function (item) {
          if (
            item.status !== SubscriptionStatus.ACTIVE &&
            item.status !== SubscriptionStatus.TRIALING
          ) {
            return null;
          }

          return [
            {
              title: t('view.buttons.cancel'),
              url: `/settings/billing/cancel?subscription_no=${item.subscriptionNo}`,
              icon: 'Ban',
              size: 'sm',
              variant: 'outline',
            },
          ];
        },
      },
    ],
    data: subscriptions,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const tabs: Tab[] = [
    {
      title: t('list.tabs.all'),
      name: 'all',
      url: '/settings/billing',
      is_active: !status || status === 'all',
    },
    {
      title: t('list.tabs.active'),
      name: 'active',
      url: '/settings/billing?status=active',
      is_active: status === 'active',
    },
    {
      title: t('list.tabs.paused'),
      name: 'paused',
      url: '/settings/billing?status=paused',
      is_active: status === 'paused',
    },
    {
      title: t('list.tabs.expired'),
      name: 'expired',
      url: '/settings/billing?status=expired',
      is_active: status === 'expired',
    },
    {
      title: t('list.tabs.pending_cancel'),
      name: 'pending_cancel',
      url: '/settings/billing?status=pending_cancel',
      is_active: status === 'pending_cancel',
    },
    {
      title: t('list.tabs.canceled'),
      name: 'canceled',
      url: '/settings/billing?status=canceled',
      is_active: status === 'canceled',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Billing banner */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* Left: icon + plan info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-white/75">{t('view.title')}</p>
                {currentSubscription?.status && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/20">
                    {currentSubscription.status}
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold mt-0.5 leading-tight">
                {currentSubscription?.planName || t('view.no_subscription')}
              </p>
              {currentSubscription && (
                <p className={`text-sm mt-1 ${
                  currentSubscription.status === SubscriptionStatus.ACTIVE ||
                  currentSubscription.status === SubscriptionStatus.TRIALING
                    ? 'text-white/75'
                    : 'text-red-200'
                }`}>
                  {currentSubscription.status === SubscriptionStatus.ACTIVE ||
                  currentSubscription.status === SubscriptionStatus.TRIALING
                    ? t('view.tip', {
                        date: moment(currentSubscription.currentPeriodEnd).format('YYYY-MM-DD'),
                      })
                    : t('view.end_tip', {
                        date: moment(currentSubscription.canceledEndAt).format('YYYY-MM-DD'),
                      })}
                </p>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {currentSubscription ? (
              <>
                <Link
                  href="/pricing"
                  target="_blank"
                  className="px-4 py-2 rounded-lg bg-white text-[#6366F1] text-sm font-semibold hover:bg-white/90 transition-colors"
                >
                  {t('view.buttons.adjust')}
                </Link>
                {currentSubscription.paymentUserId && (
                  <Link
                    href={`/settings/billing/retrieve?subscription_no=${currentSubscription.subscriptionNo}`}
                    target="_blank"
                    className="px-4 py-2 rounded-lg bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors border border-white/30"
                  >
                    {t('view.buttons.manage')}
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/pricing"
                target="_blank"
                className="px-4 py-2 rounded-lg bg-white text-[#6366F1] text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                {t('view.buttons.subscribe')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
