'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Building2,
  LayoutDashboard,
  BellRing,
  Menu,
  MessageSquare,
  Search,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ConnectionBanner } from '@/components/agent/connection-banner';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { cn, displayName } from '@/lib/utils';

const PRIMARY_NAV = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.PROPERTIES, label: 'Properties', icon: Building2 },
  { href: ROUTES.MESSAGES, label: 'Messages', icon: MessageSquare },
  { href: ROUTES.REMINDING, label: 'Reminder', icon: BellRing },
] as const;

const MORE_NAV = [
  { href: ROUTES.SEARCH, label: 'Search' },
  { href: ROUTES.LEASING, label: 'Leasing' },
  { href: ROUTES.MAINTENANCE, label: 'Maintenance' },
  { href: ROUTES.INSPECTIONS, label: 'Inspections' },
  { href: ROUTES.RENT_REVIEW, label: 'Rent review' },
  { href: ROUTES.TENANT_SELECTION, label: 'Tenant selection' },
  { href: ROUTES.ACCOUNTING, label: 'Accounting' },
  { href: ROUTES.VACATING, label: 'Vacating' },
  { href: ROUTES.REPORTS, label: 'Reports' },
  { href: ROUTES.NOTIFICATIONS, label: 'Alerts' },
  { href: ROUTES.SETTINGS, label: 'Settings' },
  { href: ROUTES.PROFILE, label: 'Profile' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AgentShell({
  children,
  title,
  backHref,
}: {
  children: React.ReactNode;
  title?: string;
  backHref?: string;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  const { notifications, messages, remindingItems } = useAgentData();
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const unreadMessages = messages.reduce((s, m) => s + m.unread, 0);
  const remindingCount = remindingItems.length;

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const updateHeight = () => setHeaderHeight(el.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [title, moreOpen]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-background">
      <header
        ref={headerRef}
        className="fixed top-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          {backHref ? (
            <Link
              href={backHref}
              className="text-primary -ml-1 text-sm font-medium"
            >
              ← Back
            </Link>
          ) : (
            <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </div>
              <span className="text-sm font-semibold">CROSSUB Agent</span>
            </Link>
          )}

          <div className="flex items-center gap-1">
            <Link
              href={ROUTES.SEARCH}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Search"
            >
              <Search className="size-5" />
            </Link>
            <Link
              href={ROUTES.MESSAGES}
              className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Messages"
            >
              <MessageSquare className="size-5" />
              {unreadMessages > 0 && (
                <span className="bg-destructive absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[9px] text-white">
                  {unreadMessages}
                </span>
              )}
            </Link>
            <Link
              href={ROUTES.NOTIFICATIONS}
              className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Alerts"
            >
              <Bell className="size-5" />
              {unreadNotifications > 0 && (
                <span className="bg-destructive absolute top-1 right-1 size-2 rounded-full" />
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setMoreOpen((v) => !v)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>

        {title && (
          <div className="border-t border-border px-4 py-2">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {user && (
              <p className="text-muted-foreground truncate text-xs">
                {displayName(user)}
              </p>
            )}
          </div>
        )}

        {moreOpen && (
          <div className="border-t border-border bg-card px-4 py-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              More
            </p>
            <div className="flex flex-col gap-1">
              {MORE_NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm hover:bg-secondary"
                >
                  {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main
        className="flex-1 px-4 py-4 pb-24"
        style={{ paddingTop: headerHeight + 16 }}
      >
        {user && (
          <div className="mb-4">
            <ConnectionBanner />
          </div>
        )}
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="flex h-16 items-stretch justify-around px-1">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge =
              href === ROUTES.MESSAGES && unreadMessages > 0
                ? unreadMessages
                : href === ROUTES.REMINDING && remindingCount > 0
                  ? remindingCount
                  : 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('size-5', active && 'stroke-[2.5]')} />
                <span className="truncate">{label}</span>
                {badge > 0 && (
                  <span className="bg-destructive absolute top-2 right-2 flex size-4 items-center justify-center rounded-full text-[9px] text-white">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href={ROUTES.PROFILE}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors',
              isActive(pathname, ROUTES.PROFILE)
                ? 'text-primary'
                : 'text-muted-foreground',
            )}
          >
            <User className={cn('size-5', isActive(pathname, ROUTES.PROFILE) && 'stroke-[2.5]')} />
            <span>Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
