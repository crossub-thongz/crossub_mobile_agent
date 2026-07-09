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
  compact = false,
  unreadMessages,
  actionCount,
  unreadNotificationCount,
  onLogout,
}: {
  compact?: boolean;
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
  const allCompactLinks = [...primaryNav, ...desktopNav, ...moreNav];

  return (
    <aside
      className={cn(
        'border-border bg-card hidden shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
        compact ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b',
          compact ? 'justify-center px-2' : 'justify-between gap-2 px-4',
        )}
      >
        <CrossubLogo size="sm" />
        {!compact ? <ThemeToggle /> : null}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {!compact ? (
          <>
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
                      {description ? (
                        <p className="text-muted-foreground mt-1 pl-6 text-[10px] leading-snug">
                          {description}
                        </p>
                      ) : null}
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
          </>
        ) : (
          <ul className="space-y-0.5">
            {allCompactLinks.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              const badge =
                href === ROUTES.MESSAGES
                  ? unreadMessages
                  : href === ROUTES.TASKS
                    ? actionCount
                    : href === ROUTES.NOTIFICATIONS
                      ? unreadNotificationCount
                      : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    title={label}
                    className={cn(
                      'relative flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {badge > 0 && (
                      <span className="bg-destructive absolute -top-0.5 -right-0.5 flex size-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold text-white">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="space-y-1 border-t p-2">
        <Link
          href={ROUTES.TASKS}
          title={compact ? 'Need action' : undefined}
          className={cn(
            'relative flex items-center rounded-lg text-sm text-destructive hover:bg-destructive/10',
            compact ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2',
          )}
        >
          <AlertTriangle className="size-4" />
          {!compact ? 'Need action' : null}
          {actionCount > 0 && (
            <span
              className={cn(
                'bg-destructive rounded-full px-2 py-0.5 text-[10px] font-bold text-white',
                compact ? 'absolute -top-0.5 -right-0.5 size-4 min-w-4 px-0' : 'ml-auto',
              )}
            >
              {compact && actionCount > 9 ? '9+' : actionCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          title={compact ? 'Sign out' : undefined}
          className={cn(
            'text-muted-foreground flex w-full items-center rounded-lg text-sm hover:bg-secondary hover:text-foreground',
            compact ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2',
          )}
        >
          <LogOut className="size-4" />
          {!compact ? 'Sign out' : null}
        </button>
        {compact ? (
          <div className="flex justify-center pt-1">
            <ThemeToggle />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
