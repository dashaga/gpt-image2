'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBrandWechat, IconChevronRight, IconLoader2, IconQrcode, IconX } from '@tabler/icons-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

// ─── Icon components ──────────────────────────────────────────────────────────

export function AlipayIcon({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: '#1677FF',
        fontSize: size * 0.55,
      }}
    >
      支
    </span>
  );
}

export function WechatIcon({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md text-white"
      style={{ width: size, height: size, backgroundColor: '#07C160' }}
    >
      <IconBrandWechat size={size * 0.7} stroke={1.8} />
    </span>
  );
}

export function StripeIcon({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md text-white"
      style={{ width: size, height: size, backgroundColor: '#635BFF' }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.65, height: size * 0.65 }}
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    </span>
  );
}

// ─── WeChat QR Panel ──────────────────────────────────────────────────────────

function WechatQrPanel({
  qrCodeUrl,
  orderNo,
  onClose,
}: {
  qrCodeUrl: string;
  orderNo: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    import('qrcode').then((mod) => {
      mod.toDataURL(qrCodeUrl, { width: 200, margin: 2 }).then(setDataUrl);
    });
  }, [qrCodeUrl]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/order-status?order_no=${orderNo}`);
        const { data } = await res.json();
        if (data?.status === 'paid') {
          clearInterval(pollRef.current!);
          window.location.href = '/payment/success';
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);
    return () => clearInterval(pollRef.current!);
  }, [orderNo]);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <WechatIcon size={22} />
        <span>微信扫码支付</span>
      </div>
      {dataUrl ? (
        <Image
          src={dataUrl}
          alt="WeChat Pay QR Code"
          width={200}
          height={200}
          className="rounded-lg border"
        />
      ) : (
        <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border">
          <IconLoader2 className="animate-spin text-gray-400" size={28} />
        </div>
      )}
      <p className="text-center text-xs text-gray-500">
        请使用微信扫描二维码完成支付
        <br />
        支付成功后页面将自动跳转
      </p>
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
      >
        <IconX size={14} />
        取消支付
      </button>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type WechatQr = { qrCodeUrl: string; orderNo: string } | null;

interface CnPayModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
}

export function CnPayModal({ open, onClose, productId }: CnPayModalProps) {
  const locale = useLocale();
  const [loading, setLoading] = useState<'alipay' | 'wechat' | null>(null);
  const [wechatQr, setWechatQr] = useState<WechatQr>(null);

  // reset state when closed
  useEffect(() => {
    if (!open) {
      setLoading(null);
      setWechatQr(null);
    }
  }, [open]);

  const handleAlipay = async () => {
    try {
      setLoading('alipay');
      const res = await fetch('/api/checkout/alipay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, locale }),
      });
      const { code, message, data } = await res.json();
      if (code !== 0) throw new Error(message);
      if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (e: any) {
      toast.error('支付宝支付失败：' + e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleWechat = async () => {
    try {
      setLoading('wechat');
      const res = await fetch('/api/checkout/wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, locale }),
      });
      const { code, message, data } = await res.json();
      if (code !== 0) throw new Error(message);
      if (data?.qrCodeUrl) setWechatQr({ qrCodeUrl: data.qrCodeUrl, orderNo: data.orderNo });
    } catch (e: any) {
      toast.error('微信支付失败：' + e.message);
    } finally {
      setLoading(null);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">选择支付方式</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* QR mode */}
        {wechatQr ? (
          <WechatQrPanel
            qrCodeUrl={wechatQr.qrCodeUrl}
            orderNo={wechatQr.orderNo}
            onClose={() => setWechatQr(null)}
          />
        ) : (
          <div className="space-y-3">
            {/* Alipay */}
            <button
              onClick={handleAlipay}
              disabled={!!loading}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
            >
              <AlipayIcon size={40} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">支付宝 Alipay</p>
              </div>
              {loading === 'alipay' ? (
                <IconLoader2 className="animate-spin text-gray-400" size={18} />
              ) : (
                <IconChevronRight className="text-gray-400" size={18} />
              )}
            </button>

            {/* WeChat */}
            <button
              onClick={handleWechat}
              disabled={!!loading}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-green-300 hover:bg-green-50 disabled:opacity-60"
            >
              <WechatIcon size={40} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">微信支付 WeChat Pay</p>
              </div>
              {loading === 'wechat' ? (
                <IconLoader2 className="animate-spin text-gray-400" size={18} />
              ) : (
                <IconChevronRight className="text-gray-400" size={18} />
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
