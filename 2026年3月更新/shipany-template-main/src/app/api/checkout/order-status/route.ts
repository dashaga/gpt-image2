import { respData, respErr } from '@/shared/lib/resp';
import { findOrderByOrderNo } from '@/shared/models/order';
import { getUserInfo } from '@/shared/models/user';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNo = searchParams.get('order_no');
    if (!orderNo) return respErr('order_no is required');

    const user = await getUserInfo();
    if (!user) return respErr('no auth');

    const order = await findOrderByOrderNo(orderNo);
    if (!order || order.userId !== user.id) return respErr('order not found');

    return respData({ status: order.status });
  } catch (e: any) {
    return respErr(e.message);
  }
}
