'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { PricingItem } from '@/shared/types/blocks/pricing';

type WechatQrState = { qrCodeUrl: string; orderNo: string } | null;

export function PaymentProviders({
  configs,
  loading,
  pricingItem,
  onCheckout,
  onWechatQr,
  locale,
  className,
}: {
  configs: Record<string, string>;
  loading: boolean;
  pricingItem: PricingItem | null;
  onCheckout: (item: PricingItem, paymentProvider?: string) => void;
  onWechatQr: (qr: WechatQrState) => void;
  locale?: string;
  callbackUrl?: string;
  setLoading?: (v: boolean) => void;
  className?: string;
}) {
  const t = useTranslations('common.payment');
  const router = useRouter();
  const { setIsShowPaymentModal, user, setIsShowSignModal } = useAppContext();
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const isLoading = loading || activeProvider !== null;

  const handleAlipay = async () => {
    if (!pricingItem) { toast.error('请先选择套餐'); return; }
    if (!user) { setIsShowSignModal(true); return; }
    setActiveProvider('alipay');
    try {
      const res = await fetch('/api/checkout/alipay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: pricingItem.product_id, locale }),
      });
      const { code, message, data } = await res.json();
      if (code !== 0) throw new Error(message);
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      toast.error('支付宝跳转失败：' + e.message);
      setActiveProvider(null);
    }
  };

  const handleWechat = async () => {
    if (!pricingItem) { toast.error('请先选择套餐'); return; }
    if (!user) { setIsShowSignModal(true); return; }
    setActiveProvider('wechat');
    try {
      const res = await fetch('/api/checkout/wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: pricingItem.product_id, locale }),
      });
      const { code, message, data } = await res.json();
      if (code !== 0) throw new Error(message);
      onWechatQr({ qrCodeUrl: data.qrCodeUrl, orderNo: data.orderNo });
    } catch (e: any) {
      toast.error('微信支付失败：' + e.message);
    } finally {
      setActiveProvider(null);
    }
  };

  const handleStripe = () => {
    if (!pricingItem) return;
    onCheckout(pricingItem, 'stripe');
  };

  const handleCreem = () => {
    if (!pricingItem) return;
    onCheckout(pricingItem, 'creem');
  };

  const handlePaypal = () => {
    if (!pricingItem) return;
    onCheckout(pricingItem, 'paypal');
  };

  const allowedProviders = pricingItem?.payment_providers;
  const isAllowed = (name: string) =>
    !allowedProviders || allowedProviders.length === 0 || allowedProviders.includes(name);

  const alipayEnabled = !!process.env.NEXT_PUBLIC_ALIPAY_ENABLED || configs.alipay_enabled === 'true';
  const wechatEnabled = !!process.env.NEXT_PUBLIC_WECHAT_ENABLED || configs.wechat_pay_enabled === 'true';

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {configs.stripe_enabled === 'true' && isAllowed('stripe') && (
        <ProviderButton
          name="stripe"
          label="Stripe"
          iconUrl="/imgs/icons/stripe.png"
          active={activeProvider}
          disabled={isLoading}
          onClick={() => { setActiveProvider('stripe'); handleStripe(); }}
        />
      )}

      {configs.creem_enabled === 'true' && isAllowed('creem') && (
        <ProviderButton
          name="creem"
          label="Creem"
          iconUrl="/imgs/icons/creem.png"
          active={activeProvider}
          disabled={isLoading}
          onClick={() => { setActiveProvider('creem'); handleCreem(); }}
        />
      )}

      {configs.paypal_enabled === 'true' && isAllowed('paypal') && (
        <ProviderButton
          name="paypal"
          label="PayPal"
          iconUrl="/imgs/icons/paypal.svg"
          active={activeProvider}
          disabled={isLoading}
          onClick={() => { setActiveProvider('paypal'); handlePaypal(); }}
        />
      )}

      {isAllowed('alipay') && (
        <ProviderButton
          name="alipay"
          label="支付宝 Alipay"
          iconUrl="/imgs/icons/alipay.png"
          active={activeProvider}
          disabled={isLoading}
          onClick={handleAlipay}
          fallbackEmoji="💙"
        />
      )}

      {isAllowed('wechat') && (
        <ProviderButton
          name="wechat"
          label="微信支付 WeChat Pay"
          iconUrl="/imgs/icons/wechat.png"
          active={activeProvider}
          disabled={isLoading}
          onClick={handleWechat}
          fallbackEmoji="💚"
        />
      )}
    </div>
  );
}

function ProviderButton({
  name,
  label,
  iconUrl,
  active,
  disabled,
  onClick,
  fallbackEmoji,
}: {
  name: string;
  label: string;
  iconUrl: string;
  active: string | null;
  disabled: boolean;
  onClick: () => void;
  fallbackEmoji?: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      disabled={disabled}
      onClick={onClick}
    >
      {imgError || !iconUrl ? (
        <span className="text-base">{fallbackEmoji || '💳'}</span>
      ) : (
        <Image
          src={iconUrl}
          alt={label}
          width={24}
          height={24}
          className="rounded-full"
          onError={() => setImgError(true)}
        />
      )}
      <span>{label}</span>
      {active === name && <Loader2 className="size-4 animate-spin" />}
    </Button>
  );
}
