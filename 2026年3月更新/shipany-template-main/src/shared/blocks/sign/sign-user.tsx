'use client';

import { useEffect, useRef, useState } from 'react';
import { Coins, Loader2, LogOut, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { authClient, signOut, useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { User as UserType } from '@/shared/models/user';
import { UserNav } from '@/shared/types/blocks/common';

import { SignModal } from './sign-modal';

function extractSessionUser(data: any): UserType | null {
  const u = data?.user ?? data?.data?.user ?? null;
  return u && typeof u === 'object' ? (u as UserType) : null;
}

export function SignUser({
  isScrolled,
  signButtonSize = 'sm',
  userNav,
}: {
  isScrolled?: boolean;
  signButtonSize?: 'default' | 'sm' | 'lg' | 'icon';
  userNav?: UserNav;
}) {
  const t = useTranslations('common.sign');
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // get app context values
  const {
    configs,
    fetchConfigs,
    setIsShowSignModal,
    isCheckSign,
    setIsCheckSign,
    user,
    setUser,
    fetchUserInfo,
    showOneTap,
  } = useAppContext();

  // get session
  const { data: session, isPending } = useSession();
  const sessionUser = extractSessionUser(session);
  const displayUser = (user as UserType | null) ?? sessionUser;

  // In dev (React StrictMode) effects can run twice; ensure we don't spam getSession().
  const didFallbackSyncRef = useRef(false);

  // one tap initialized
  const oneTapInitialized = useRef(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  // set is check sign
  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending]);

  // show one tap if not initialized
  useEffect(() => {
    if (
      configs &&
      configs.google_client_id &&
      configs.google_one_tap_enabled === 'true' &&
      !session &&
      !isPending &&
      !oneTapInitialized.current
    ) {
      oneTapInitialized.current = true;
      showOneTap(configs);
    }
  }, [configs, session, isPending]);

  // set user
  useEffect(() => {
    const currentUserId = user?.id;
    const sessionUserId = (sessionUser as any)?.id;

    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser as UserType);
      fetchUserInfo();
    } else if (!sessionUser && currentUserId && !isPending) {
      // Only clear user when session is definitively resolved (not pending).
      // This prevents a race where fetchUserInfo() sets user but useSession
      // hasn't re-fetched yet, which would incorrectly clear the user.
      setUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.id, (sessionUser as any)?.email, user?.id, isPending]);

  // Fallback: if the session cookie is present but useSession lags, do a single refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didFallbackSyncRef.current) return;
    // Only run when useSession is done but still no user.
    if (isPending) return;
    if (sessionUser || user) return;

    didFallbackSyncRef.current = true;
    void (async () => {
      try {
        const res: any = await authClient.getSession();
        const fresh = extractSessionUser(res?.data ?? res);
        if (fresh?.id) {
          setUser(fresh);
          fetchUserInfo();
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, sessionUser, user?.id]);

  const nameInitial = (displayUser?.name || displayUser?.email || '?')[0].toUpperCase();

  return (
    <>
      {isCheckSign || !mounted ? (
        <div>
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : displayUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full p-0"
            >
              <Avatar>
                <AvatarImage
                  src={displayUser.image || ''}
                  alt={displayUser.name || ''}
                />
                <AvatarFallback
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  <span className="text-white font-semibold text-base leading-none">
                    {nameInitial}
                  </span>
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-64 p-0 overflow-hidden rounded-xl shadow-lg"
          >
            {/* User info header */}
            <div className="px-4 py-4 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/30 dark:to-purple-950/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage
                    src={displayUser.image || ''}
                    alt={displayUser.name || ''}
                  />
                  <AvatarFallback
                    style={{
                      background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                    }}
                  >
                    <span className="text-white font-semibold text-lg leading-none">
                      {nameInitial}
                    </span>
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {displayUser.name && (
                    <p className="font-semibold text-sm truncate leading-tight">
                      {displayUser.name}
                    </p>
                  )}
                  {displayUser.email && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {displayUser.email}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1.5">
                    <Coins className="w-3 h-3 text-[#6366F1] shrink-0" />
                    <span className="text-xs font-medium text-[#6366F1]">
                      {t('credits_title', {
                        credits: displayUser.credits?.remainingCredits || 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator className="my-0" />

            {/* Menu items */}
            <div className="p-1">
              <DropdownMenuItem asChild>
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-2 cursor-pointer rounded-lg"
                >
                  <User className="w-4 h-4" />
                  {t('user_center_title')}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer rounded-lg mt-0.5"
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        router.push('/');
                      },
                    },
                  })
                }
              >
                <LogOut className="w-4 h-4" />
                {t('sign_out_title')}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
          <Button
            asChild
            size={signButtonSize}
            className={cn(
              'border-foreground/10 ml-4 cursor-pointer ring-0',
              isScrolled && 'lg:hidden'
            )}
            onClick={() => setIsShowSignModal(true)}
          >
            <span>{t('sign_in_title')}</span>
          </Button>
          <SignModal />
        </div>
      )}
    </>
  );
}
