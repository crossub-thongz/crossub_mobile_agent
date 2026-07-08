'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, LogOut } from 'lucide-react';

import { CrossubLogo } from '@/components/brand/crossub-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { DESKTOP_NAV, MORE_NAV, PRIMARY_NAV } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { filterNavByAccess } from '@/lib/portal-service-level';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AgentSidebar({
  unreadMessages,
  actionCount,
  unreadNotificationCount,
  onLogout,
}: {
  unreadMessages: number;
  actionCount: number;
  unreadNotificationCount: number;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { hasFullManagementAccess } = useAgentData();
  const primaryNav = filterNavByAccess(PRIMARY_NAV, hasFullManagementAccess);
  const moreNav = filterNavByAccess(MORE_NAV, hasFullManagementAccess);
  const desktopNav = filterNavByAccess(DESKTOP_NAV, hasFullManagementAccess);

  return (
    <aside className="border-border bg-card hidden w-[260px] shrink-0 flex-col border-r lg:flex">
      <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
        <CrossubLogo size="sm" />
        <ThemeToggle />
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="text-muted-foreground mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide">
          Main
        </p>
        <ul className="space-y-0.5">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge =
              href === ROUTES.MESSAGES
                ? unreadMessages
                : href === ROUTES.TASKS
                  ? actionCount
                  : 0;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {badge > 0 && (
                    <span className="bg-destructive flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="text-muted-foreground mt-5 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide">
          Desktop
        </p>
        <ul className="space-y-0.5">
          {desktopNav.map(({ href, label, icon: Icon, description }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'block rounded-lg px-3 py-2.5 transition',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                  {description && (
                    <p className="text-muted-foreground mt-1 pl-6 text-[10px] leading-snug">
                      {description}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="text-muted-foreground mt-5 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide">
          More
        </p>
        <ul className="space-y-0.5">
          {moreNav.map(({ href, label, icon: Icon }) => {
            const badge = href === ROUTES.NOTIFICATIONS ? unreadNotificationCount : 0;
            return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition',
                  isActive(pathname, href)
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0 opacity-70" />
                <span className="flex-1 truncate">{label}</span>
                {badge > 0 && (
                  <span className="bg-primary flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t p-3">
        <Link
          href={ROUTES.TASKS}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
        >
          <AlertTriangle className="size-4" />
          Need action
          {actionCount > 0 && (
            <span className="bg-destructive ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
              {actionCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="text-muted-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
