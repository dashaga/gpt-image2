'use client';

import { useState } from 'react';
import { Building2, Check, Crown, Rocket, Shield, ShieldCheck, User, Zap } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  AlipayIcon,
  CnPayModal,
  StripeIcon,
  WechatIcon,
} from '@/shared/blocks/payment/cn-pay-modal';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

// ─── Static data (non-translatable: IDs, prices, icons, amounts) ─────────────

const CREDIT_PACK_STATIC = [
  { id: 'credits_starter', icon: Zap, usdPrice: '$29.99', usdOriginal: '$40', cnyPrice: '¥99.99', cnyOriginal: '¥199', featured: false },
  { id: 'credits_creator', icon: Crown, usdPrice: '$99.99', usdOriginal: '$120', cnyPrice: '¥349', cnyOriginal: '¥699', featured: true },
  { id: 'credits_pro', icon: Rocket, usdPrice: '$229', usdOriginal: '$400', cnyPrice: '¥799', cnyOriginal: '¥1600', featured: false },
];

const MONTHLY_PLAN_STATIC = [
  { id: 'plan_basic_monthly', icon: User, usdPrice: '$9.9', cnyPrice: '¥69', featured: false },
  { id: 'plan_pro_monthly', icon: Crown, usdPrice: '$29', cnyPrice: '¥209', featured: true },
  { id: 'plan_flagship_monthly', icon: Building2, usdPrice: '$79', cnyPrice: '¥569', featured: false },
];

const YEARLY_PLAN_STATIC = [
  { id: 'plan_basic_yearly', icon: User, usdPrice: '$7.9', usdOriginal: '$9.9', cnyPrice: '¥56', cnyOriginal: '¥69', featured: false },
  { id: 'plan_pro_yearly', icon: Crown, usdPrice: '$23', usdOriginal: '$29', cnyPrice: '¥166', cnyOriginal: '¥209', featured: true },
  { id: 'plan_flagship_yearly', icon: Building2, usdPrice: '$63', usdOriginal: '$79', cnyPrice: '¥455', cnyOriginal: '¥569', featured: false },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type CreditPack = (typeof CREDIT_PACK_STATIC)[number] & {
  name: string; subtitle: string; discount_tag: string;
  description: string; features: string[]; promo: string;
  note: string; featured_label?: string;
};

type MonthlyPlan = (typeof MONTHLY_PLAN_STATIC)[number] & {
  name: string; subtitle: string; price_suffix: string;
  description: string; features: string[];
  note: string; featured_label?: string;
};

type YearlyPlan = (typeof YEARLY_PLAN_STATIC)[number] & {
  name: string; subtitle: string; price_suffix: string;
  saving_tag: string; yearly_note: string;
  description: string; features: string[];
  note: string; featured_label?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function OrangeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: '#f97316' }}
    >
      {children}
    </span>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: '#6366F1' }}
      >
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </span>
      {text}
    </li>
  );
}

// ─── Payment buttons ──────────────────────────────────────────────────────────

function PayButtons({
  productId,
  featured,
  label,
  onStripe,
  onCnPay,
}: {
  productId: string;
  featured: boolean;
  label: string;
  onStripe: (id: string) => void;
  onCnPay: (id: string) => void;
}) {
  const t = useTranslations('pages.pricing.custom');
  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        onClick={() => onStripe(productId)}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: featured ? '#6366F1' : '#1a1a2e' }}
      >
        <StripeIcon size={18} />
        {label} ⚡
      </button>
      <div className="flex items-center overflow-hidden rounded-xl border border-gray-200">
        <button
          onClick={() => onCnPay(productId)}
          className="flex flex-1 items-center gap-1.5 px-3 py-2.5 transition hover:bg-gray-50"
        >
          <WechatIcon size={18} />
          <AlipayIcon size={18} />
          <span className="text-xs font-medium text-gray-700">{t('wechat_alipay')}</span>
        </button>
        <button
          onClick={() => onCnPay(productId)}
          className="border-l border-gray-200 px-2.5 py-2.5 text-xs font-medium transition hover:bg-orange-50"
          style={{ color: '#f97316' }}
        >
          {t('payment_failed')}
        </button>
      </div>
    </div>
  );
}

// ─── Credit Pack Card ─────────────────────────────────────────────────────────

function CreditCard({
  pack,
  onStripe,
  onCnPay,
}: {
  pack: CreditPack;
  onStripe: (id: string) => void;
  onCnPay: (id: string) => void;
}) {
  const t = useTranslations('pages.pricing.custom');
  const Icon = pack.icon;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6',
        pack.featured ? 'border-2' : 'border-gray-200 bg-white'
      )}
      style={pack.featured ? { backgroundColor: '#EEEEFF', borderColor: '#6366F1' } : {}}
    >
      {pack.featured && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: '#6366F1' }}
          >
            {pack.featured_label || ''}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col pt-4">
        <div
          className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: pack.featured ? '#6366F1' : '#1a1a2e' }}
        >
          <Icon className="h-5 w-5 shrink-0 text-white" />
        </div>

        <h3 className="text-lg font-bold text-gray-900">{pack.name}</h3>
        {pack.subtitle ? (
          <p className="mt-0.5 text-xs text-gray-500">{pack.subtitle}</p>
        ) : (
          <p className="mt-0.5 text-xs text-transparent select-none">-</p>
        )}

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gray-900">{pack.usdPrice}</span>
          <span className="text-sm text-gray-400 line-through">{pack.usdOriginal}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-base font-semibold text-gray-600">{pack.cnyPrice}</span>
          <span className="text-xs text-gray-400 line-through">{pack.cnyOriginal}</span>
          <OrangeBadge>{pack.discount_tag}</OrangeBadge>
        </div>

        <p className="mt-3 text-sm text-gray-500">{pack.description}</p>

        <PayButtons
          productId={pack.id}
          featured={pack.featured}
          label={t('buy_now')}
          onStripe={onStripe}
          onCnPay={onCnPay}
        />

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('includes_label')}
          </p>
          <ul className="space-y-2">
            {pack.features.map((f, i) => <FeatureItem key={i} text={f} />)}
          </ul>
        </div>

        <p className="mt-4 text-sm font-medium text-[#f97316]">{pack.promo}</p>
        <p className="mt-2 text-xs text-gray-400">{pack.note}</p>
      </div>
    </div>
  );
}

// ─── Monthly Card ─────────────────────────────────────────────────────────────

function MonthlyCard({
  plan,
  onStripe,
  onCnPay,
}: {
  plan: MonthlyPlan;
  onStripe: (id: string) => void;
  onCnPay: (id: string) => void;
}) {
  const t = useTranslations('pages.pricing.custom');
  const Icon = plan.icon;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6',
        plan.featured ? 'border-2' : 'border-gray-200 bg-white'
      )}
      style={plan.featured ? { backgroundColor: '#EEEEFF', borderColor: '#6366F1' } : {}}
    >
      {plan.featured && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: '#6366F1' }}
          >
            {plan.featured_label || ''}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col pt-4">
        <div
          className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: plan.featured ? '#6366F1' : '#1a1a2e' }}
        >
          <Icon className="h-5 w-5 shrink-0 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{plan.subtitle}</p>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-gray-900">{plan.usdPrice}</span>
          <span className="text-sm text-gray-500">{plan.price_suffix}</span>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-base font-semibold text-gray-600">{plan.cnyPrice}</span>
          <span className="text-sm text-gray-500">{plan.price_suffix}</span>
        </div>

        <p className="mt-3 text-sm text-gray-500">{plan.description}</p>

        <PayButtons
          productId={plan.id}
          featured={plan.featured}
          label={t('subscribe_now')}
          onStripe={onStripe}
          onCnPay={onCnPay}
        />

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('includes_label')}
          </p>
          <ul className="space-y-2">
            {plan.features.map((f, i) => <FeatureItem key={i} text={f} />)}
          </ul>
        </div>
        <p className="mt-4 text-xs text-gray-400">{plan.note}</p>
      </div>
    </div>
  );
}

// ─── Yearly Card ──────────────────────────────────────────────────────────────

function YearlyCard({
  plan,
  onStripe,
  onCnPay,
}: {
  plan: YearlyPlan;
  onStripe: (id: string) => void;
  onCnPay: (id: string) => void;
}) {
  const t = useTranslations('pages.pricing.custom');
  const Icon = plan.icon;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6',
        plan.featured ? 'border-2' : 'border-gray-200 bg-white'
      )}
      style={plan.featured ? { backgroundColor: '#EEEEFF', borderColor: '#6366F1' } : {}}
    >
      {plan.featured && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: '#6366F1' }}
          >
            {plan.featured_label || ''}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col pt-4">
        <div
          className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: plan.featured ? '#6366F1' : '#1a1a2e' }}
        >
          <Icon className="h-5 w-5 shrink-0 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{plan.subtitle}</p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gray-900">{plan.usdPrice}</span>
          <span className="text-sm text-gray-400 line-through">{plan.usdOriginal}</span>
          <span className="text-sm text-gray-500">{plan.price_suffix}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-base font-semibold text-gray-600">{plan.cnyPrice}</span>
          <span className="text-xs text-gray-400 line-through">{plan.cnyOriginal}</span>
          <span className="text-sm text-gray-500">{plan.price_suffix}</span>
          <OrangeBadge>{plan.saving_tag}</OrangeBadge>
        </div>
        <p className="mt-1 text-xs text-gray-400">{plan.yearly_note}</p>

        <p className="mt-3 text-sm text-gray-500">{plan.description}</p>

        <PayButtons
          productId={plan.id}
          featured={plan.featured}
          label={t('subscribe_now')}
          onStripe={onStripe}
          onCnPay={onCnPay}
        />

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('includes_label')}
          </p>
          <ul className="space-y-2">
            {plan.features.map((f, i) => <FeatureItem key={i} text={f} />)}
          </ul>
        </div>
        <p className="mt-4 text-xs text-gray-400">{plan.note}</p>
      </div>
    </div>
  );
}

// ─── Main block ───────────────────────────────────────────────────────────────

type Tab = 'credits' | 'monthly' | 'yearly';

export function PricingCustom({ section }: { section: Section }) {
  const [tab, setTab] = useState<Tab>('credits');
  const [cnPayProductId, setCnPayProductId] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  const { user, setIsShowSignModal } = useAppContext();
  const locale = useLocale();
  const t = useTranslations('pages.pricing');

  const cpI18n = t.raw('custom.credit_packs') as any[];
  const mpI18n = t.raw('custom.monthly_plans') as any[];
  const ypI18n = t.raw('custom.yearly_plans') as any[];

  const creditPacks = CREDIT_PACK_STATIC.map((s, i) => ({ ...s, ...cpI18n[i] })) as CreditPack[];
  const monthlyPlans = MONTHLY_PLAN_STATIC.map((s, i) => ({ ...s, ...mpI18n[i] })) as MonthlyPlan[];
  const yearlyPlans = YEARLY_PLAN_STATIC.map((s, i) => ({ ...s, ...ypI18n[i] })) as YearlyPlan[];

  const requireAuth = () => {
    if (!user) {
      setIsShowSignModal(true);
      return false;
    }
    return true;
  };

  const handleStripe = async (productId: string) => {
    if (!requireAuth()) return;
    try {
      setStripeLoading(true);
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          currency: 'USD',
          locale,
          payment_provider: 'stripe',
        }),
      });
      if (res.status === 401) {
        setIsShowSignModal(true);
        return;
      }
      const { code, message, data } = await res.json();
      if (code !== 0) throw new Error(message);
      if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (e: any) {
      toast.error(t('custom.stripe_error') + e.message);
    } finally {
      setStripeLoading(false);
    }
  };

  const handleCnPay = (productId: string) => {
    if (!requireAuth()) return;
    setCnPayProductId(productId);
  };

  const tabs: { key: Tab; label: string; badge?: string }[] = [
    { key: 'monthly', label: t('custom.tab_monthly') },
    { key: 'yearly', label: t('custom.tab_yearly'), badge: t('custom.tab_yearly_badge') },
    { key: 'credits', label: t('custom.tab_credits'), badge: t('custom.tab_credits_badge') },
  ];

  return (
    <section id={section.id || 'pricing-plans'} className="py-[30px]">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl dark:text-white">
            {t('custom.header_title')}
          </h2>
          <p className="inline-flex items-center gap-2 text-base text-gray-500 dark:text-gray-400">
            <Shield className="h-4 w-4 text-[#6366F1]" />
            {t('custom.header_tagline')}
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1">
            {tabs.map(({ key, label, badge }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  tab === key ? 'text-white shadow' : 'text-gray-600 hover:text-gray-900'
                )}
                style={tab === key ? { backgroundColor: '#6366F1' } : {}}
              >
                {label}
                {badge && (
                  <span
                    className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: '#f97316' }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cancel hint */}
        <div className="mb-8 flex items-center justify-center gap-1.5 text-[13px] text-gray-500">
          <ShieldCheck className="h-4 w-4 text-[#6366F1]" />
          {t('custom.cancel_hint')}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {tab === 'credits' && creditPacks.map((pack) => (
            <CreditCard key={pack.id} pack={pack} onStripe={handleStripe} onCnPay={handleCnPay} />
          ))}
          {tab === 'monthly' && monthlyPlans.map((plan) => (
            <MonthlyCard key={plan.id} plan={plan} onStripe={handleStripe} onCnPay={handleCnPay} />
          ))}
          {tab === 'yearly' && yearlyPlans.map((plan) => (
            <YearlyCard key={plan.id} plan={plan} onStripe={handleStripe} onCnPay={handleCnPay} />
          ))}
        </div>
      </div>

      <CnPayModal
        open={!!cnPayProductId}
        onClose={() => setCnPayProductId(null)}
        productId={cnPayProductId ?? ''}
      />
    </section>
  );
}
