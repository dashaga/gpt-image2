import { getTranslations } from 'next-intl/server';

import { getSnowId, getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import {
  createOrder,
  NewOrder,
  OrderStatus,
  updateOrderByOrderNo,
} from '@/shared/models/order';
import { getUserInfo } from '@/shared/models/user';

function getAlipayClient() {
  const { AlipaySdk } = require('alipay-sdk');
  return new AlipaySdk({
    appId: process.env.ALIPAY_APP_ID!,
    privateKey: (process.env.ALIPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    alipayPublicKey: (process.env.ALIPAY_PUBLIC_KEY || '').replace(/\\n/g, '\n'),
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
  });
}

export async function POST(req: Request) {
  try {
    if (!process.env.ALIPAY_APP_ID) {
      return respErr('Alipay is not configured');
    }

    const { product_id, locale } = await req.json();
    if (!product_id) return respErr('product_id is required');

    const t = await getTranslations({ locale: locale || 'en', namespace: 'pages.pricing' });
    const pricing = t.raw('page.sections.pricing');
    const pricingItem = pricing.items.find((item: any) => item.product_id === product_id);
    if (!pricingItem) return respErr('pricing item not found');

    const user = await getUserInfo();
    if (!user || !user.email) return respErr('no auth, please sign in');

    const configs = await getAllConfigs();
    const appUrl = configs.app_url || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const orderNo = getSnowId();
    // Alipay uses CNY fen. Amount in pricing is USD cents - treat as fen here.
    // In production, set proper CNY amounts in pricing config.
    const totalAmount = ((pricingItem.amount || 0) / 100).toFixed(2);

    const order: NewOrder = {
      id: getUuid(),
      orderNo,
      userId: user.id,
      userEmail: user.email,
      status: OrderStatus.PENDING,
      amount: pricingItem.amount,
      currency: 'CNY',
      productId: pricingItem.product_id,
      paymentType: 'one-time',
      paymentInterval: pricingItem.interval || 'one-time',
      paymentProvider: 'alipay',
      checkoutInfo: '',
      createdAt: new Date(),
      productName: pricingItem.product_name || pricingItem.title,
      description: pricingItem.description,
      creditsAmount: pricingItem.credits,
      creditsValidDays: pricingItem.valid_days,
      planName: pricingItem.plan_name || '',
    };
    await createOrder(order);

    try {
      const sdk = getAlipayClient();
      const checkoutUrl = sdk.pageExec('alipay.trade.page.pay', 'GET', {
        returnUrl: `${appUrl}/payment/success?order_no=${orderNo}`,
        notifyUrl: `${appUrl}/api/checkout/alipay/notify`,
        bizContent: {
          outTradeNo: orderNo,
          productCode: 'FAST_INSTANT_TRADE_PAY',
          totalAmount,
          subject: pricingItem.product_name || pricingItem.title || 'GPT Image 2',
        },
      });

      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.CREATED,
        checkoutUrl,
      });

      return respData({ checkoutUrl });
    } catch (e: any) {
      await updateOrderByOrderNo(orderNo, { status: OrderStatus.COMPLETED });
      return respErr('alipay checkout failed: ' + e.message);
    }
  } catch (e: any) {
    console.error('[alipay] checkout error:', e);
    return respErr('checkout failed: ' + e.message);
  }
}
