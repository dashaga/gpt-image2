import { CheckCircle } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">支付成功！</h1>
        <p className="text-muted-foreground text-sm">
          积分已到账，可前往个人中心查看余额
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings/credits">查看积分</Link>
        </Button>
      </div>
    </main>
  );
}
