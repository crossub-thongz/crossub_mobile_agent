'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, Suspense } from 'react';

import { ConnectionBanner } from '@/components/agent/connection-banner';
import { AddFirstPropertyBanner } from '@/components/agent/add-first-property-banner';
import { EmailVerificationBanner } from '@/components/agent/email-verification-banner';
import { AgentNotificationBell } from '@/components/agent/agent-notification-bell';
import { MessageUnreadBadge } from '@/components/agent/message-unread-badge';
import { GiiAssistant } from '@/components/agent/gii-assistant';
import { GlobalShellFabs, ShellHeaderQuickActions } from '@/components/agent/global-shell-fabs';
import { AgentSidebar } from '@/components/layout/agent-sidebar';
import { ShellBackButton } from '@/components/layout/shell-back-button';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { MORE_NAV, MORE_NAV_FOOTER, PRIMARY_NAV } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { filterNavByAccess } from '@/lib/portal-service-level';
import { isShellHomePath } from '@/components/layout/shell-back-button';
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
  headerMeta,
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
  /** Optional expandable row under the title (e.g. property address on message threads). */
  headerMeta?: {
    label: string;
    open: boolean;
    onToggle: () => void;
    panel: React.ReactNode;
  };
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  const { hasFullManagementAccess, unreadNotificationCount, needActionItems } = useAgentData();
  const propertyNeedActionCount = needActionItems.length;
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
    if (immersive) {
      document.documentElement.style.removeProperty('--shell-header-height');
      return;
    }
    document.documentElement.style.setProperty('--shell-header-height', `${headerHeight}px`);
    return () => {
      document.documentElement.style.removeProperty('--shell-header-height');
    };
  }, [headerHeight, immersive]);

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
            // `--env-banner-height` is defined only on a non-production deployment and
            // defaults to `0px`, so this stays `top-0` on production.
            'fixed top-[var(--env-banner-height,0px)] left-1/2 w-full max-w-lg -translate-x-1/2 lg:hidden',
            immersive && 'hidden',
          )}
        >
          <div className="flex h-14 items-center justify-between gap-2 px-3">
            <Suspense fallback={<div className="h-9 w-20 shrink-0" aria-hidden />}>
              <ShellBackButton backHref={backHref} backLabel={backLabel} />
            </Suspense>

            <div className="flex shrink-0 items-center gap-1">
              {!hideGlobalFabs && !title ? (
                <ShellHeaderQuickActions pathname={pathname} />
              ) : null}
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
            <div className="border-border border-t px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-semibold">{title}</h1>
                  {headerMeta ? (
                    <button
                      type="button"
                      onClick={headerMeta.onToggle}
                      aria-expanded={headerMeta.open}
                      className="text-muted-foreground hover:text-foreground mt-0.5 flex w-full min-w-0 items-center gap-1 text-left text-xs transition"
                    >
                      <span className="truncate">{headerMeta.label}</span>
                      <ChevronDown
                        className={cn(
                          'size-3.5 shrink-0 transition-transform',
                          headerMeta.open && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    </button>
                  ) : user ? (
                    <p className="text-muted-foreground truncate text-xs">{displayName(user)}</p>
                  ) : null}
                </div>
                {!hideGlobalFabs ? (
                  <ShellHeaderQuickActions pathname={pathname} />
                ) : null}
              </div>
              {headerMeta?.open ? (
                <div className="border-border mt-2 border-t pt-2">{headerMeta.panel}</div>
              ) : null}
            </div>
          )}
        </header>

        {title && !immersive && (
          <header className="border-border bg-background/95 z-40 hidden shrink-0 flex-col gap-2 border-b px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:flex">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Suspense fallback={<div className="h-9 w-20 shrink-0" aria-hidden />}>
                  <ShellBackButton
                    backHref={backHref}
                    backLabel={backLabel}
                    showLogoOnHome={false}
                    className="hover:bg-primary/5 shrink-0 rounded-lg px-2 py-1.5 transition"
                  />
                </Suspense>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold">{title}</h1>
                  {headerMeta ? (
                    <button
                      type="button"
                      onClick={headerMeta.onToggle}
                      aria-expanded={headerMeta.open}
                      className="text-muted-foreground hover:text-foreground mt-0.5 flex max-w-full min-w-0 items-center gap-1 text-left text-xs transition"
                    >
                      <span className="truncate">{headerMeta.label}</span>
                      <ChevronDown
                        className={cn(
                          'size-3.5 shrink-0 transition-transform',
                          headerMeta.open && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    </button>
                  ) : user ? (
                    <p className="text-muted-foreground truncate text-xs">{displayName(user)}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!hideGlobalFabs ? (
                  <ShellHeaderQuickActions pathname={pathname} />
                ) : null}
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
            {headerMeta?.open ? (
              <div className="border-border border-t px-6 py-3">{headerMeta.panel}</div>
            ) : null}
          </header>
        )}

        {!title && !immersive && !isShellHomePath(pathname) && (
          <header className="border-border bg-background/95 z-40 hidden shrink-0 border-b px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:flex">
            <div className="flex w-full items-center justify-between gap-4">
              <Suspense fallback={<div className="h-9 w-20 shrink-0" aria-hidden />}>
                <ShellBackButton
                  backHref={backHref}
                  backLabel={backLabel}
                  showLogoOnHome={false}
                  className="hover:bg-primary/5 rounded-lg px-2 py-1.5 transition"
                />
              </Suspense>
              <div className="flex items-center gap-1">
                {!hideGlobalFabs ? (
                  <ShellHeaderQuickActions pathname={pathname} />
                ) : null}
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
                : 'pb-24 lg:pb-0 max-lg:pt-[calc(var(--shell-header-offset)+var(--add-to-home-prompt-height,0px))] lg:pt-0',
            )}
            style={{
              ['--shell-header-height' as string]: `${headerHeight}px`,
              ['--shell-header-offset' as string]: `${headerHeight + 16}px`,
            }}
          >
            {user ? <EmailVerificationBanner /> : null}
            {user ? <AddFirstPropertyBanner /> : null}
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
              const needActionBadge = href === ROUTES.PROPERTIES ? propertyNeedActionCount : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-medium',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <span className="relative">
                    <Icon className={cn('size-5', active && 'stroke-[2.5]')} />
                    {needActionBadge > 0 ? (
                      <MessageUnreadBadge
                        count={needActionBadge}
                        size="sm"
                        className="absolute -top-1.5 -right-2 ring-2 ring-background"
                      />
                    ) : null}
                  </span>
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
