'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { MessageUnreadBadge } from '@/components/agent/message-unread-badge';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { MORE_NAV, MORE_NAV_FOOTER, PRIMARY_NAV } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { totalUnreadMessages } from '@/lib/communications-log';
import { filterNavByAccess } from '@/lib/portal-service-level';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  compact,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  compact?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        'flex items-center rounded-xl text-sm font-medium transition-all duration-200',
        compact
          ? 'relative justify-center px-2 py-2.5 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3'
          : 'relative gap-2.5 px-3 py-2.5',
        active
          ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
          : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
      )}
    >
      <span className="relative shrink-0">
        <Icon className={cn('size-4', !active && 'opacity-70')} />
        {badge && badge > 0 ? (
          <MessageUnreadBadge
            count={badge}
            size="sm"
            className="absolute -top-1.5 -right-2 ring-2 ring-card"
          />
        ) : null}
      </span>
      <span
        className={cn(
          'flex-1 truncate',
          compact &&
            'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100',
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function AgentSidebar({
  compact = false,
  onLogout,
}: {
  compact?: boolean;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { hasFullManagementAccess, messages } = useAgentData();
  const propertyUnread = totalUnreadMessages(messages);
  const primaryNav = filterNavByAccess(PRIMARY_NAV, hasFullManagementAccess);
  const moreNav = filterNavByAccess(MORE_NAV, hasFullManagementAccess);
  const moreFooterNav = filterNavByAccess(MORE_NAV_FOOTER, hasFullManagementAccess);
  const allCompactLinks = [...primaryNav, ...moreNav, ...moreFooterNav];

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
          compact
            ? 'justify-center px-2 group-hover/sidebar:justify-between group-hover/sidebar:px-4'
            : 'justify-between gap-2 px-4',
        )}
      >
        <CrossubLogo size="sm" />
        <div className={cn(compact ? 'hidden group-hover/sidebar:block' : 'block')}>
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
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <NavLink
                    {...item}
                    active={isActive(pathname, item.href)}
                    badge={item.href === ROUTES.PROPERTIES ? propertyUnread : undefined}
                  />
                </li>
              ))}
            </ul>

            <p className="text-muted-foreground mt-5 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide">
              More
            </p>
            <ul className="space-y-0.5">
              {moreNav.map((item) => (
                <li key={item.href}>
                  <NavLink {...item} active={isActive(pathname, item.href)} />
                </li>
              ))}
            </ul>

            {moreFooterNav.length > 0 ? (
              <ul className="border-border mt-4 space-y-0.5 border-t pt-3">
                {moreFooterNav.map((item) => (
                  <li key={item.href}>
                    <NavLink {...item} active={isActive(pathname, item.href)} />
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <ul className="space-y-1">
            {allCompactLinks.map((item) => (
              <li key={item.href}>
                <NavLink
                  {...item}
                  active={isActive(pathname, item.href)}
                  compact
                  badge={item.href === ROUTES.PROPERTIES ? propertyUnread : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="space-y-1 border-t border-border/70 p-2">
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
