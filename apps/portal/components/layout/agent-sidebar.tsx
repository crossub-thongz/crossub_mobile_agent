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

function NavBadge({
  count,
  compact,
  tone = 'destructive',
}: {
  count: number;
  compact?: boolean;
  tone?: 'destructive' | 'primary';
}) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full text-[10px] font-bold text-white',
        tone === 'destructive' ? 'bg-destructive' : 'bg-primary',
        compact
          ? 'absolute -top-0.5 -right-0.5 size-4 min-w-4'
          : 'ml-auto min-w-5 px-1.5 py-0.5',
      )}
    >
      {compact ? (count > 9 ? '9+' : count) : count > 99 ? '99+' : count}
    </span>
  );
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
        'border-border bg-card/95 group/sidebar z-30 hidden h-dvh shrink-0 flex-col overflow-hidden border-r shadow-[1px_0_0_0_rgba(0,0,0,0.03)] backdrop-blur-xl transition-[width,box-shadow] duration-300 ease-out lg:flex',
        compact
          ? 'w-[72px] hover:z-40 hover:w-[240px] hover:shadow-[8px_0_24px_-8px_rgba(0,0,0,0.12)]'
          : 'w-[260px]',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border/70',
          compact ? 'justify-center px-2 group-hover/sidebar:justify-between group-hover/sidebar:px-4' : 'justify-between gap-2 px-4',
        )}
      >
        <CrossubLogo size="sm" />
        <div
          className={cn(
            compact ? 'hidden group-hover/sidebar:block' : 'block',
          )}
        >
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex-1 overflow-x-hidden overflow-y-auto p-2">
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
                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                          : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      <NavBadge count={badge} />
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
                        'block rounded-xl px-3 py-2.5 transition-colors',
                        active
                          ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                          : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
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
                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                        isActive(pathname, href)
                          ? 'bg-primary/10 font-medium text-primary shadow-sm shadow-primary/5'
                          : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-70" />
                      <span className="flex-1 truncate">{label}</span>
                      <NavBadge count={badge} tone="primary" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <ul className="space-y-1">
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
                      'relative flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                      'justify-center px-2 py-2.5 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3',
                      active
                        ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                        : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="max-w-0 flex-1 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100">
                      {label}
                    </span>
                    <span className="group-hover/sidebar:hidden">
                      <NavBadge count={badge} compact />
                    </span>
                    <span className="ml-auto hidden group-hover/sidebar:inline-flex">
                      <NavBadge count={badge} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="space-y-1 border-t border-border/70 p-2">
        <Link
          href={ROUTES.TASKS}
          title="Need action"
          className={cn(
            'relative flex items-center rounded-xl text-sm text-destructive transition-all duration-200 hover:bg-destructive/10',
            compact
              ? 'justify-center px-2 py-2 group-hover/sidebar:justify-start group-hover/sidebar:gap-2 group-hover/sidebar:px-3'
              : 'gap-2 px-3 py-2',
          )}
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span
            className={cn(
              'flex-1',
              compact
                ? 'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[120px] group-hover/sidebar:opacity-100'
                : '',
            )}
          >
            Need action
          </span>
          {compact ? (
            <>
              <span className="group-hover/sidebar:hidden">
                <NavBadge count={actionCount} compact />
              </span>
              <span className="ml-auto hidden group-hover/sidebar:inline-flex">
                <NavBadge count={actionCount} />
              </span>
            </>
          ) : (
            <NavBadge count={actionCount} />
          )}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          title="Sign out"
          className={cn(
            'text-muted-foreground flex w-full items-center rounded-xl text-sm transition-all duration-200 hover:bg-secondary hover:text-foreground',
            compact
              ? 'justify-center px-2 py-2 group-hover/sidebar:justify-start group-hover/sidebar:gap-2 group-hover/sidebar:px-3'
              : 'gap-2 px-3 py-2',
          )}
        >
          <LogOut className="size-4 shrink-0" />
          <span
            className={cn(
              compact
                ? 'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[100px] group-hover/sidebar:opacity-100'
                : '',
            )}
          >
            Sign out
          </span>
        </button>
        {compact ? (
          <div className="flex justify-center pt-1 group-hover/sidebar:hidden">
            <ThemeToggle />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
