'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, QrCode, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { useAppContext } from '@/shared/contexts/app';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { PricingItem } from '@/shared/types/blocks/pricing';

import { PaymentProviders } from './payment-providers';

type WechatQrState = { qrCodeUrl: string; orderNo: string } | null;

function WechatQrPanel({
  qr,
  onClose,
  onPaid,
}: {
  qr: WechatQrState;
  onClose: () => void;
  onPaid: () => void;
}) {
  const router = useRouter();
  const [QRCode, setQRCode] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    import('qrcode').then((mod) => setQRCode(mod));
  }, []);

  // Render QR code into canvas
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!qr || !QRCode) return;
    QRCode.toDataURL(qr.qrCodeUrl, { width: 200, margin: 2 }).then(setDataUrl);
  }, [qr, QRCode]);

  // Poll for payment result
  useEffect(() => {
    if (!qr) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/order-status?order_no=${qr.orderNo}`);
        const { data } = await res.json();
        if (data?.status === 'paid') {
          clearInterval(pollRef.current!);
          onPaid();
          router.push('/payment/success');
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);
    return () => clearInterval(pollRef.current!);
  }, [qr]);

  if (!qr) return null;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <QrCode className="size-4 text-green-600" />
        <span>微信扫码支付</span>
      </div>
      {dataUrl ? (
        <Image src={dataUrl} alt="WeChat Pay QR Code" width={200} height={200} className="rounded-lg border" />
      ) : (
        <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
      <p className="text-muted-foreground text-center text-xs">
        请使用微信扫描二维码完成支付
        <br />
        支付成功后页面将自动跳转
      </p>
      <Button variant="outline" size="sm" onClick={onClose} className="gap-1">
        <X className="size-3" />
        取消支付
      </Button>
    </div>
  );
}

function ModalContent({
  isLoading,
  pricingItem,
  onCheckout,
  wechatQr,
  setWechatQr,
}: {
  isLoading: boolean;
  pricingItem: PricingItem | null;
  onCheckout: (item: PricingItem, paymentProvider?: string) => void;
  wechatQr: WechatQrState;
  setWechatQr: (v: WechatQrState) => void;
}) {
  const t = useTranslations('common.payment');
  const { configs, setIsShowPaymentModal } = useAppContext();
  const locale = useLocale();

  if (wechatQr) {
    return (
      <WechatQrPanel
        qr={wechatQr}
        onClose={() => setWechatQr(null)}
        onPaid={() => { setWechatQr(null); setIsShowPaymentModal(false); }}
      />
    );
  }

  return (
    <>
      <DialogHeader className="hidden sm:block">
        <DialogTitle>{t('choose_payment_method')}</DialogTitle>
        <DialogDescription>{t('choose_payment_method_description')}</DialogDescription>
      </DialogHeader>
      <PaymentProviders
        configs={configs}
        loading={isLoading}
        pricingItem={pricingItem}
        onCheckout={onCheckout}
        onWechatQr={setWechatQr}
        locale={locale}
      />
    </>
  );
}

export function PaymentModal({
  isLoading,
  pricingItem,
  onCheckout,
}: {
  isLoading: boolean;
  pricingItem: PricingItem | null;
  onCheckout: (item: PricingItem, paymentProvider?: string) => void;
}) {
  const { isShowPaymentModal, setIsShowPaymentModal } = useAppContext();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [wechatQr, setWechatQr] = useState<WechatQrState>(null);

  const handleClose = (open: boolean) => {
    if (!open) setWechatQr(null);
    setIsShowPaymentModal(open);
  };

  if (isDesktop) {
    return (
      <Dialog open={isShowPaymentModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <ModalContent
            isLoading={isLoading}
            pricingItem={pricingItem}
            onCheckout={onCheckout}
            wechatQr={wechatQr}
            setWechatQr={setWechatQr}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isShowPaymentModal} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>选择支付方式</DrawerTitle>
          <DrawerDescription>请选择你的支付方式</DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          <ModalContent
            isLoading={isLoading}
            pricingItem={pricingItem}
            onCheckout={onCheckout}
            wechatQr={wechatQr}
            setWechatQr={setWechatQr}
          />
        </div>
        {!wechatQr && (
          <DrawerFooter className="pt-4">
            <DrawerClose asChild>
              <Button variant="outline">取消</Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
