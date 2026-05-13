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

function getWechatClient() {
  const WechatPay = require('wechatpay-node-v3');
  return new WechatPay({
    appid: process.env.WECHAT_APP_ID!,
    mchid: process.env.WECHAT_MCH_ID!,
    publicKey: (process.env.WECHAT_PUBLIC_KEY || '').replace(/\\n/g, '\n'),
    privateKey: (process.env.WECHAT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    serial_no: process.env.WECHAT_SERIAL_NO!,
  });
}

export async function POST(req: Request) {
  try {
    if (!process.env.WECHAT_APP_ID) {
      return respErr('WeChat Pay is not configured');
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
    // WeChat Pay requires CNY fen. Amount in pricing is USD cents.
    // In production, configure CNY prices and convert properly.
    const amountTotal = pricingItem.amount || 1;

    const order: NewOrder = {
      id: getUuid(),
      orderNo,
      userId: user.id,
      userEmail: user.email,
      status: OrderStatus.PENDING,
      amount: amountTotal,
      currency: 'CNY',
      productId: pricingItem.product_id,
      paymentType: 'one-time',
      paymentInterval: pricingItem.interval || 'one-time',
      paymentProvider: 'wechat',
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
      const pay = getWechatClient();
      const result = await pay.transactions_native({
        description: pricingItem.product_name || pricingItem.title || 'GPT Image 2',
        out_trade_no: orderNo,
        amount: { total: amountTotal, currency: 'CNY' },
        notify_url: `${appUrl}/api/checkout/wechat/notify`,
      });

      const qrCodeUrl = result.data?.code_url || result.code_url;
      if (!qrCodeUrl) throw new Error('WeChat Pay did not return a QR code URL');

      await updateOrderByOrderNo(orderNo, { status: OrderStatus.CREATED });

      return respData({ qrCodeUrl, orderNo });
    } catch (e: any) {
      await updateOrderByOrderNo(orderNo, { status: OrderStatus.COMPLETED });
      return respErr('wechat checkout failed: ' + e.message);
    }
  } catch (e: any) {
    console.error('[wechat] checkout error:', e);
    return respErr('checkout failed: ' + e.message);
  }
}
