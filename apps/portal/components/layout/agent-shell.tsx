'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ConnectionBanner } from '@/components/agent/connection-banner';
import { ROUTES } from '@/constants/routes';
import { cn, displayName } from '@/lib/utils';

const PRIMARY_NAV = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.PROPERTIES, label: 'Properties', icon: Building2 },
  { href: ROUTES.TASKS, label: 'Need action', icon: ListTodo },
  { href: ROUTES.MESSAGES, label: 'Messages', icon: MessageSquare },
] as const;

const MORE_NAV = [
  { href: ROUTES.LEASING, label: 'Leasing' },
  { href: ROUTES.TRIBUNAL, label: 'Tribunal' },
  { href: ROUTES.MAINTENANCE, label: 'Maintenance' },
  { href: ROUTES.INSPECTIONS, label: 'Inspections' },
  { href: ROUTES.ACCOUNTING, label: 'Accounting' },
  { href: ROUTES.RENT_REVIEW, label: 'Rent review' },
  { href: ROUTES.TENANT_SELECTION, label: 'Tenant selection' },
  { href: ROUTES.VACATING, label: 'Vacating' },
  { href: ROUTES.REPORTS, label: 'Reports' },
  { href: ROUTES.NOTIFICATIONS, label: 'Alerts' },
  { href: ROUTES.PROFILE, label: 'Profile' },
  { href: ROUTES.SETTINGS, label: 'Settings' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AgentShell({
  children,
  title,
  backHref,
  hideNeedAction,
  showConnectionBanner,
}: {
  children: React.ReactNode;
  title?: string;
  backHref?: string;
  hideNeedAction?: boolean;
  /** Show live/demo connection banner — only on Settings by default */
  showConnectionBanner?: boolean;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  const { messages, needActionItems } = useAgentData();
  const unreadMessages = messages.reduce((s, m) => s + m.unread, 0);
  const actionCount = needActionItems.length;

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
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-background">
      <header
        ref={headerRef}
        className="fixed top-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          {backHref ? (
            <Link href={backHref} className="text-primary shrink-0 text-sm font-medium">
              ← Back
            </Link>
          ) : (
            <Link href={ROUTES.DASHBOARD} className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </div>
              <span className="truncate text-sm font-semibold">CROSSUB Agent</span>
            </Link>
          )}

          <div className="flex shrink-0 items-center gap-1">
            {!hideNeedAction && (
              <Link
                href={ROUTES.TASKS}
                className={cn(
                  'relative flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition',
                  pathname === ROUTES.TASKS
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-destructive/15 text-destructive hover:bg-destructive/25',
                )}
                aria-label="Need action"
              >
                <AlertTriangle className="size-3.5 shrink-0" />
                <span className="max-w-[4.5rem] truncate">Need action</span>
                {actionCount > 0 && (
                  <span className="bg-destructive flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                    {actionCount}
                  </span>
                )}
              </Link>
            )}
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
          <div className="border-t border-border px-4 py-2">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {user && (
              <p className="text-muted-foreground truncate text-xs">{displayName(user)}</p>
            )}
          </div>
        )}
      </header>

      <main
        className="flex-1 px-4 py-4 pb-24"
        style={{ paddingTop: headerHeight + 16 }}
      >
        {showConnectionBanner && user && (
          <div className="mb-4">
            <ConnectionBanner />
          </div>
        )}
        {children}
      </main>

      {moreOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/45"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-1/2 z-[60] w-full max-w-lg -translate-x-1/2 rounded-t-2xl border border-b-0 bg-card px-4 pt-4 pb-2 shadow-2xl">
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
                {MORE_NAV.map(({ href, label }) => (
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

      <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="flex h-16 items-stretch justify-around px-1">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge =
              href === ROUTES.MESSAGES && unreadMessages > 0
                ? unreadMessages
                : href === ROUTES.TASKS && actionCount > 0
                  ? actionCount
                  : 0;
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
                {badge > 0 && (
                  <span className="bg-destructive absolute top-2 right-0.5 flex size-4 items-center justify-center rounded-full text-[9px] text-white">
                    {badge}
                  </span>
                )}
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
    </div>
  );
}
