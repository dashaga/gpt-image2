import {
  PaymentStatus,
  PaymentType,
} from '@/extensions/payment/types';
import { respErr } from '@/shared/lib/resp';
import { findOrderByOrderNo, OrderStatus } from '@/shared/models/order';
import { handleCheckoutSuccess } from '@/shared/services/payment';

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
    const body = await req.text();
    const params: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(body)) {
      params[k] = v;
    }

    if (!process.env.ALIPAY_APP_ID) {
      return new Response('alipay not configured', { status: 500 });
    }

    const sdk = getAlipayClient();
    const signValid = sdk.checkNotifySign(params);
    if (!signValid) {
      console.error('[alipay/notify] invalid signature');
      return new Response('fail', { status: 400 });
    }

    const tradeStatus = params.trade_status;
    const orderNo = params.out_trade_no;
    const transactionId = params.trade_no;
    const paymentAmount = Math.round(parseFloat(params.total_amount || '0') * 100);

    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      return new Response('success');
    }

    const order = await findOrderByOrderNo(orderNo);
    if (!order) {
      console.error('[alipay/notify] order not found:', orderNo);
      return new Response('success');
    }

    await handleCheckoutSuccess({
      order,
      session: {
        provider: 'alipay',
        paymentStatus: PaymentStatus.SUCCESS,
        paymentInfo: {
          transactionId,
          paymentAmount,
          paymentCurrency: 'cny',
          paymentEmail: params.buyer_logon_id || '',
          paymentUserName: params.buyer_logon_id || '',
          paymentUserId: params.buyer_id || '',
          paidAt: new Date(),
          discountAmount: 0,
          discountCurrency: 'cny',
          discountCode: '',
        },
        paymentResult: params,
        metadata: { order_no: orderNo },
      },
    });

    return new Response('success');
  } catch (e: any) {
    console.error('[alipay/notify] error:', e);
    return new Response('fail', { status: 500 });
  }
}
