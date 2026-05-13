'use client';

import { Coins } from 'lucide-react';
import { useLocale } from 'next-intl';

import { useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useAppContext } from '@/shared/contexts/app';

export function InsufficientCreditsModal() {
  const { isShowInsufficientCreditsModal, setIsShowInsufficientCreditsModal } =
    useAppContext();
  const router = useRouter();
  const locale = useLocale();
  const zh = locale === 'zh';

  const handleGoToPricing = () => {
    setIsShowInsufficientCreditsModal(false);
    router.push('/pricing');
  };

  return (
    <Dialog
      open={isShowInsufficientCreditsModal}
      onOpenChange={setIsShowInsufficientCreditsModal}
    >
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <div className="mb-2 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Coins className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center">
            {zh ? '积分不足' : 'Insufficient Credits'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {zh
              ? '您的积分余额不足，请购买套餐获取更多积分以继续使用 AI 生成功能。'
              : 'You do not have enough credits. Please purchase a plan to continue using AI generation.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleGoToPricing}>
            {zh ? '去购买套餐' : 'View Pricing Plans'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsShowInsufficientCreditsModal(false)}
          >
            {zh ? '取消' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
