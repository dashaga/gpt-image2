'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

import { Link, usePathname } from '@/core/i18n/navigation';
import {
  BrandLogo,
  LocaleSelector,
  SignUser,
  SmartIcon,
  ThemeToggler,
} from '@/shared/blocks/common';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { useMedia } from '@/shared/hooks/use-media';
import { cn } from '@/shared/lib/utils';
import { NavItem } from '@/shared/types/blocks/common';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

export function Header({ header }: { header: HeaderType }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const isScrolledRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const isLarge = useMedia('(min-width: 64rem)');
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const next = window.scrollY > 50;
        if (next === isScrolledRef.current) return;
        isScrolledRef.current = next;
        setIsScrolled(next);
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation menu for large screens (click-triggered)
  const NavMenu = () => {
    return (
      <div ref={navRef} className="relative flex items-center gap-1 max-lg:hidden">
        {header.nav?.items?.map((item, idx) => {
          if (!item.children || item.children.length === 0) {
            return (
              <Link
                key={idx}
                href={item.url || ''}
                target={item.target || '_self'}
                className={`flex flex-row items-center gap-2 rounded-md px-4 py-1.5 text-sm transition-colors hover:bg-muted/50 ${
                  item.is_active || pathname.endsWith(item.url as string)
                    ? 'bg-muted/40 text-muted-foreground'
                    : ''
                }`}
              >
                {item.icon && <SmartIcon name={item.icon as string} />}
                {item.title}
              </Link>
            );
          }

          const isOpen = openMenu === item.title;

          return (
            <div key={idx} className="relative">
              <button
                onClick={() => setOpenMenu(isOpen ? null : (item.title ?? null))}
                className={cn(
                  'flex flex-row items-center gap-1.5 rounded-md px-4 py-1.5 text-sm transition-colors hover:bg-muted/50',
                  isOpen && 'bg-muted/40'
                )}
              >
                {item.icon && (
                  <SmartIcon name={item.icon as string} className="h-4 w-4" />
                )}
                {item.title}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              {isOpen && (
                <div className="absolute left-0 top-full z-50 mt-2" style={{ width: 520 }}>
                  <div className="border-foreground/5 bg-card ring-foreground/5 rounded-[calc(var(--radius)-2px)] border border-transparent shadow-lg ring-1">
                    <ul
                      style={{
                        width: 520,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 4,
                        padding: 10,
                        margin: 0,
                        listStyle: 'none',
                      }}
                    >
                      {item.children?.map((subItem: NavItem, index: number) => (
                        <ListItem
                          key={index}
                          href={subItem.url || ''}
                          target={subItem.target || '_self'}
                          title={subItem.title || ''}
                          description={subItem.description || ''}
                          icon={subItem.icon as string | undefined}
                          iconBg={(subItem as any).iconBg}
                          iconColor={(subItem as any).iconColor}
                          badge={subItem.badge}
                          badgeColor={(subItem as any).badgeColor}
                          onSelect={() => setOpenMenu(null)}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Mobile menu using Accordion, shown on small screens
  const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
    return (
      <nav
        role="navigation"
        className="w-full [--color-border:--alpha(var(--color-foreground)/5%)] [--color-muted:--alpha(var(--color-foreground)/5%)]"
      >
        <Accordion
          type="single"
          collapsible
          className="-mx-4 mt-0.5 space-y-0.5 **:hover:no-underline"
        >
          {header.nav?.items?.map((item, idx) => {
            return (
              <AccordionItem
                key={idx}
                value={item.title || ''}
                className="group relative border-b-0 before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:border-b"
              >
                {item.children && item.children.length > 0 ? (
                  <>
                    <AccordionTrigger className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg **:!font-normal">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <ul>
                        {item.children?.map((subItem: NavItem, iidx) => (
                          <li key={iidx}>
                            <Link
                              href={subItem.url || ''}
                              onClick={closeMenu}
                              className="grid grid-cols-[auto_1fr] items-center gap-2.5 px-4 py-2"
                            >
                              <div
                                aria-hidden
                                className="flex items-center justify-center *:size-4"
                              >
                                {subItem.icon && (
                                  <SmartIcon name={subItem.icon as string} />
                                )}
                              </div>
                              <div className="text-base">{subItem.title}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </>
                ) : (
                  <Link
                    href={item.url || ''}
                    onClick={closeMenu}
                    className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg **:!font-normal"
                  >
                    {item.title}
                  </Link>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
      </nav>
    );
  };

  // List item for submenus in the desktop dropdown
  function ListItem({
    title,
    description,
    href,
    target,
    icon,
    iconBg,
    iconColor,
    badge,
    badgeColor,
    onSelect,
    ...props
  }: React.ComponentPropsWithoutRef<'li'> & {
    href: string;
    title: string;
    description?: string;
    target?: string;
    icon?: string;
    iconBg?: string;
    iconColor?: string;
    badge?: string;
    badgeColor?: string;
    onSelect?: () => void;
  }) {
    return (
      <li {...props} style={{ listStyle: 'none' }}>
        <Link
          href={href}
          target={target || '_self'}
          onClick={onSelect}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            padding: 10,
            borderRadius: 8,
            cursor: 'pointer',
            textDecoration: 'none',
            color: 'inherit',
          }}
          className="transition-colors hover:bg-muted/50"
        >
          <div
            style={{
              width: 38,
              height: 38,
              minWidth: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: iconBg ?? undefined,
            }}
          >
            {icon && (
              <SmartIcon
                name={icon}
                size={20}
                style={iconColor ? { color: iconColor } : undefined}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {title}
              </span>
              {badge && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: '#fff',
                    padding: '1px 5px',
                    borderRadius: 3,
                    lineHeight: 1,
                    backgroundColor: badgeColor ?? '#6366F1',
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 11,
                color: '#6b7280',
                marginTop: 3,
                marginBottom: 0,
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <>
      <header
        data-state={isMobileMenuOpen ? 'active' : 'inactive'}
        {...(isScrolled && { 'data-scrolled': true })}
        className="fixed inset-x-0 top-0 z-50"
      >
        <div
          className={cn(
            'absolute inset-x-0 top-0 z-50 h-18 border-transparent ring-1 ring-transparent transition-all duration-300',
            'in-data-scrolled:border-foreground/5 in-data-scrolled:bg-background/75 in-data-scrolled:border-b in-data-scrolled:backdrop-blur',
            'max-lg:in-data-[state=active]:bg-background/75 max-lg:h-14 max-lg:overflow-hidden max-lg:border-b max-lg:in-data-[state=active]:h-screen max-lg:in-data-[state=active]:backdrop-blur'
          )}
        >
          <div className="container">
            <div className="relative flex flex-wrap items-center justify-between lg:flex-nowrap lg:py-5">
              <div className="flex justify-between gap-8 max-lg:h-14 max-lg:w-full max-lg:border-b">
                {/* Brand Logo */}
                {header.brand && <BrandLogo brand={header.brand} />}

                {/* Desktop Navigation Menu */}
                {isLarge && <NavMenu />}
                {/* Hamburger menu button for mobile navigation */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label={
                    isMobileMenuOpen == true ? 'Close Menu' : 'Open Menu'
                  }
                  className="relative z-20 -m-2.5 -mr-3 block cursor-pointer p-2.5 lg:hidden"
                >
                  <Menu className="m-auto size-5 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0" />
                  <X className="absolute inset-0 m-auto size-5 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100" />
                </button>
              </div>

              {/* Show mobile menu if needed */}
              {!isLarge && isMobileMenuOpen && (
                <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />
              )}

              {/* Header right section: theme toggler, locale selector, sign, buttons */}
              <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 in-data-[state=active]:flex max-lg:in-data-[state=active]:mt-6 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:shrink-0 lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                <div className="flex w-full flex-row items-center gap-4 sm:flex-row sm:gap-6 sm:space-y-0 md:w-fit">
                  {header.buttons &&
                    header.buttons.map((button, idx) => (
                      <Link
                        key={idx}
                        href={button.url || ''}
                        target={button.target || '_self'}
                        className={cn(
                          'focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                          'h-7 px-3 ring-0',
                          button.variant === 'outline'
                            ? 'bg-background border-primary ring-foreground/10 hover:bg-muted/50 dark:ring-foreground/15 dark:hover:bg-muted/50 border border-transparent shadow-sm ring-1 shadow-black/15 duration-200'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90 border-[0.5px] border-white/25 shadow-md ring-1 shadow-black/20 ring-(--ring-color) [--ring-color:color-mix(in_oklab,var(--color-foreground)15%,var(--color-primary))]'
                        )}
                      >
                        {button.icon && (
                          <SmartIcon
                            name={button.icon as string}
                            className="size-4"
                          />
                        )}
                        <span>{button.title}</span>
                      </Link>
                    ))}

                  {header.show_theme ? <ThemeToggler /> : null}
                  {header.show_locale ? <LocaleSelector /> : null}
                  <div className="flex-1 md:hidden"></div>
                  {header.show_sign ? (
                    <SignUser userNav={header.user_nav} />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
