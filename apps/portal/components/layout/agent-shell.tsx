'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ConnectionBanner } from '@/components/agent/connection-banner';
import { AgentNotificationBell } from '@/components/agent/agent-notification-bell';
import { GiiAssistant } from '@/components/agent/gii-assistant';
import { GlobalShellFabs } from '@/components/agent/global-shell-fabs';
import { AgentSidebar } from '@/components/layout/agent-sidebar';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { MORE_NAV, MORE_NAV_FOOTER, PRIMARY_NAV } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { filterNavByAccess } from '@/lib/portal-service-level';
import { cn, displayName } from '@/lib/utils';

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AgentShell({
  children,
  title,
  backHref,
  backLabel = 'Back',
  hideNeedAction,
  hideGlobalFabs,
  showConnectionBanner,
  wide,
  immersive,
}: {
  children: React.ReactNode;
  title?: string;
  backHref?: string;
  /** Label for the back control when `backHref` is set */
  backLabel?: string;
  hideNeedAction?: boolean;
  /** Hide bottom-right + and chat FABs (e.g. auth screens) */
  hideGlobalFabs?: boolean;
  /** Show live/demo connection banner — only on Settings by default */
  showConnectionBanner?: boolean;
  /** Full-width desktop layout (e.g. communications log) */
  wide?: boolean;
  /** Hide mobile chrome for immersive workspace pages */
  immersive?: boolean;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  const { hasFullManagementAccess, unreadNotificationCount } = useAgentData();
  const primaryNav = filterNavByAccess(PRIMARY_NAV, hasFullManagementAccess);
  const moreNav = [
    ...filterNavByAccess(MORE_NAV, hasFullManagementAccess),
    ...filterNavByAccess(MORE_NAV_FOOTER, hasFullManagementAccess),
  ];

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const updateHeight = () => setHeaderHeight(el.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [title]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <div className="flex min-h-screen bg-background lg:h-dvh lg:overflow-hidden">
      <AgentSidebar onLogout={() => void logout()} />

      <div className="flex min-h-screen min-w-0 flex-1 lg:h-full lg:min-h-0 lg:overflow-hidden">
        <div
          className={cn(
            'mx-auto flex min-h-screen w-full min-w-0 flex-col lg:h-full lg:min-h-0 lg:flex-[3] lg:overflow-hidden',
            wide ? 'max-w-none' : 'max-w-lg lg:max-w-none',
          )}
        >
        <header
          ref={headerRef}
          className={cn(
            'border-border bg-background/95 z-40 border-b backdrop-blur supports-[backdrop-filter]:bg-background/80',
            'fixed top-0 left-1/2 w-full max-w-lg -translate-x-1/2 lg:hidden',
            immersive && 'hidden',
          )}
        >
          <div className="flex h-14 items-center justify-between gap-2 px-3">
            {backHref ? (
              <Link
                href={backHref}
                className="text-primary flex shrink-0 items-center gap-0.5 text-sm font-medium"
              >
                <ChevronLeft className="size-4" />
                {backLabel}
              </Link>
            ) : (
              <CrossubLogo size="sm" />
            )}

            <div className="flex shrink-0 items-center gap-0.5">
              <AgentNotificationBell unreadCount={unreadNotificationCount} />
              <ThemeToggle />
              <Link
                href={ROUTES.SEARCH}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
                aria-label="Search"
              >
                <Search className="size-5" />
              </Link>
            </div>
          </div>

          {title && (
            <div className="border-border border-t px-4 py-2">
              <h1 className="truncate text-base font-semibold">{title}</h1>
              {user && (
                <p className="text-muted-foreground truncate text-xs">{displayName(user)}</p>
              )}
            </div>
          )}
        </header>

        {title && !immersive && (
          <header className="border-border bg-background/95 z-40 hidden shrink-0 flex-col gap-2 border-b px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:flex">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {backHref && (
                  <Link
                    href={backHref}
                    className="text-primary hover:bg-primary/5 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition"
                  >
                    <ChevronLeft className="size-4" />
                    {backLabel}
                  </Link>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold">{title}</h1>
                  {user && (
                    <p className="text-muted-foreground truncate text-xs">{displayName(user)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
              <AgentNotificationBell unreadCount={unreadNotificationCount} />
              <Link
                href={ROUTES.SEARCH}
                className="text-muted-foreground flex size-9 items-center justify-center rounded-lg hover:bg-secondary"
                aria-label="Search"
              >
                <Search className="size-5" />
              </Link>
            </div>
            </div>
          </header>
        )}

        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col lg:overflow-y-auto',
            wide ? 'lg:p-0' : 'lg:px-8 lg:pb-8',
            title && !immersive && 'lg:pt-6',
            immersive && 'lg:pt-2 lg:pb-0',
          )}
        >
          <div
            className={cn(
              wide ? (immersive ? 'flex min-h-0 flex-1 flex-col px-2 lg:px-4' : 'px-4 pb-4 lg:p-0') : 'px-4 py-4',
              immersive
                ? 'flex min-h-0 flex-1 flex-col max-lg:pt-2 lg:pt-0'
                : 'pb-24 lg:pb-0 max-lg:pt-[var(--shell-header-offset)] lg:pt-0',
            )}
            style={{ ['--shell-header-offset' as string]: `${headerHeight + 16}px` }}
          >
            {showConnectionBanner && user && (
              <div className="mb-4">
                <ConnectionBanner />
              </div>
            )}
            {children}
          </div>
        </main>

        {moreOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[55] bg-black/45 lg:hidden"
              aria-label="Close menu"
              onClick={() => setMoreOpen(false)}
            />
            <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-1/2 z-[60] w-full max-w-lg -translate-x-1/2 rounded-t-2xl border border-b-0 bg-card px-4 pt-4 pb-2 shadow-2xl lg:hidden">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">More</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="text-muted-foreground flex size-8 items-center justify-center rounded-lg hover:bg-secondary"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                <div className="flex flex-col gap-0.5 pb-2">
                  {moreNav.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className="rounded-lg px-3 py-3 text-sm hover:bg-secondary"
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="rounded-lg px-3 py-3 text-left text-sm text-destructive hover:bg-destructive/10"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <nav
          className={cn(
            'border-border bg-background/95 fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden',
            immersive && 'hidden',
          )}
        >
          <div className="flex h-16 items-stretch justify-around px-1">
            {primaryNav.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-medium',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className={cn('size-5', active && 'stroke-[2.5]')} />
                  <span className="max-w-full truncate text-center leading-tight">{label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-medium',
                moreOpen ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Menu className={cn('size-5', moreOpen && 'stroke-[2.5]')} />
              <span>More</span>
            </button>
          </div>
        </nav>

        {!hideGlobalFabs && <GlobalShellFabs pathname={pathname} />}
        </div>

        <aside className="bg-background hidden h-full min-h-0 w-1/4 min-w-[300px] max-w-[420px] shrink-0 overflow-hidden lg:flex">
          <GiiAssistant open variant="panel" />
        </aside>
      </div>
    </div>
  );
}
