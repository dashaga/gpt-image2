import { XCircle } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';

export default async function PaymentCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <XCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">支付已取消</h1>
        <p className="text-muted-foreground text-sm">
          你取消了本次支付，积分未到账
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={() => history.back()} asChild>
          <Link href="/#pricing-plans">返回定价页</Link>
        </Button>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </main>
  );
}
