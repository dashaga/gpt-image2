import { PaymentStatus } from '@/extensions/payment/types';
import { findOrderByOrderNo } from '@/shared/models/order';
import { handleCheckoutSuccess } from '@/shared/services/payment';

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
      return new Response(JSON.stringify({ code: 'FAIL', message: 'not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.text();
    const timestamp = req.headers.get('Wechatpay-Timestamp') || '';
    const nonce = req.headers.get('Wechatpay-Nonce') || '';
    const serial = req.headers.get('Wechatpay-Serial') || '';
    const signature = req.headers.get('Wechatpay-Signature') || '';
    const apiSecret = process.env.WECHAT_API_V3_KEY || '';

    const pay = getWechatClient();

    // Verify signature
    const valid = await pay.verifySign({ timestamp, nonce, body: rawBody, serial, signature, apiSecret });
    if (!valid) {
      console.error('[wechat/notify] invalid signature');
      return new Response(JSON.stringify({ code: 'FAIL', message: 'invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const resource = payload.resource;
    if (!resource) {
      return new Response(JSON.stringify({ code: 'SUCCESS' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Decrypt resource
    const decrypted = pay.decipher_gcm(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce,
      apiSecret
    );
    const tradeResult = JSON.parse(decrypted);

    if (tradeResult.trade_state !== 'SUCCESS') {
      return new Response(JSON.stringify({ code: 'SUCCESS' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderNo = tradeResult.out_trade_no;
    const transactionId = tradeResult.transaction_id;
    const paymentAmount = tradeResult.amount?.payer_total || tradeResult.amount?.total || 0;

    const order = await findOrderByOrderNo(orderNo);
    if (!order) {
      console.error('[wechat/notify] order not found:', orderNo);
      return new Response(JSON.stringify({ code: 'SUCCESS' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await handleCheckoutSuccess({
      order,
      session: {
        provider: 'wechat',
        paymentStatus: PaymentStatus.SUCCESS,
        paymentInfo: {
          transactionId,
          paymentAmount,
          paymentCurrency: 'cny',
          paymentEmail: tradeResult.payer?.openid || '',
          paymentUserName: '',
          paymentUserId: tradeResult.payer?.openid || '',
          paidAt: new Date(),
          discountAmount: 0,
          discountCurrency: 'cny',
          discountCode: '',
        },
        paymentResult: tradeResult,
        metadata: { order_no: orderNo },
      },
    });

    return new Response(JSON.stringify({ code: 'SUCCESS' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[wechat/notify] error:', e);
    return new Response(JSON.stringify({ code: 'FAIL', message: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
