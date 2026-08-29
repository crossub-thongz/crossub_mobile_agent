'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChevronDown, ChevronRight, LogOut, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import { MessageUnreadBadge } from '@/components/agent/message-unread-badge';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import { AgentSidebarStatus } from '@/components/layout/agent-sidebar-status';
import { ThemeToggle } from '@/components/theme-toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MOBILE_MENU_NAV } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { filterNavByAccess, agencyBillingNavLabel } from '@/lib/portal-service-level';
import { filterHiddenBillingNav } from '@/lib/platform-billing-ui';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { cn } from '@/lib/utils';

const V2_SIDEBAR_PINNED_HREFS = new Set([
  ROUTES.SETTINGS,
  ROUTES.FAQ,
  ROUTES.PRICING,
  ROUTES.BILL,
  ROUTES.MORE,
]);

const V2_AGENCY_MENU_HREFS = new Set([ROUTES.SETTINGS, ROUTES.PRICING, ROUTES.BILL]);

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatClientSinceMonth(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', { month: 'short', year: 'numeric' }).format(new Date(iso));
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  compact,
  badge,
  v2 = false,
  trailingChevron = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  compact?: boolean;
  badge?: number;
  v2?: boolean;
  trailingChevron?: boolean;
}) {
  if (v2) {
    return (
      <Link
        href={href}
        title={label}
        className={cn(
          'agent-sidebar-v2__nav-link relative flex items-center rounded-xl text-[13px] font-medium transition-colors',
          compact
            ? 'justify-center px-2 py-2.5 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3'
            : 'gap-3 px-3 py-2.5',
          active
            ? 'agent-sidebar-v2__nav-link--active text-foreground'
            : 'text-muted-foreground hover:bg-white/40 hover:text-foreground',
        )}
      >
        <Icon className="size-[18px] shrink-0 stroke-[1.75]" />
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            compact &&
              'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100',
          )}
        >
          {label}
        </span>
        {badge && badge > 0 ? (
          <MessageUnreadBadge count={badge} size="sm" className="shrink-0 ring-2 ring-white/80" />
        ) : null}
        {trailingChevron ? (
          <ChevronRight
            className={cn(
              'text-muted-foreground size-4 shrink-0 opacity-70',
              compact && 'hidden group-hover/sidebar:block',
            )}
            aria-hidden
          />
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      title={label}
      className={cn(
        'relative flex items-center rounded-lg text-sm font-medium transition-colors',
        compact
          ? 'justify-center px-2 py-2.5 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3'
          : 'gap-2.5 px-3 py-2',
        active
          ? 'rounded-xl bg-primary/10 text-primary shadow-sm shadow-primary/5'
          : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
      )}
    >
      <Icon className={cn('size-4 shrink-0', !active && 'opacity-70')} />
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          compact &&
            'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100',
        )}
      >
        {label}
      </span>
      {badge && badge > 0 ? (
        <MessageUnreadBadge count={badge} size="sm" className="shrink-0 ring-2 ring-card" />
      ) : null}
    </Link>
  );
}

function AgentSidebarAgency({
  compact,
  onLogout,
  menuItems,
  pathname,
}: {
  compact?: boolean;
  onLogout: () => void;
  menuItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
}) {
  const { primaryAgency, agencies } = useAgentData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const clientSince = user?.systemAccessAcceptedAt
    ? formatClientSinceMonth(user.systemAccessAcceptedAt)
    : null;
  const agencyName = primaryAgency?.name ?? 'Your agency';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'agent-sidebar-v2__agency flex w-full items-center rounded-xl text-left transition-colors hover:bg-white/40',
            compact
              ? 'justify-center p-2 group-hover/sidebar:gap-3 group-hover/sidebar:px-3 group-hover/sidebar:py-2.5'
              : 'gap-3 px-3 py-2.5',
          )}
        >
          <span className="bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Building2 className="size-4 stroke-[1.75]" />
          </span>
          <span
            className={cn(
              'min-w-0 flex-1',
              compact &&
                'max-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100',
            )}
          >
            <span className="text-foreground block truncate text-sm font-semibold leading-tight">
              {agencyName}
            </span>
            {clientSince ? (
              <span className="text-muted-foreground mt-0.5 block truncate text-xs leading-tight">
                Client since {clientSince}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 shrink-0',
              compact && 'hidden group-hover/sidebar:block',
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'hover:bg-muted/60 flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                  isActive(pathname, item.href) && 'bg-muted/40 font-medium',
                )}
              >
                <Icon className="size-4 shrink-0 opacity-70" />
                {item.label}
              </Link>
            );
          })}
          {menuItems.length > 0 ? <div className="border-border/60 my-1 border-t" /> : null}
          {agencies.length > 1 ? (
            agencies.map((agency) => (
              <Link
                key={agency.id}
                href={`${ROUTES.AGENCIES}/${agency.id}`}
                onClick={() => setOpen(false)}
                className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm"
              >
                {agency.name}
              </Link>
            ))
          ) : primaryAgency && !primaryAgency.id.startsWith('local-') ? (
            <Link
              href={`${ROUTES.AGENCIES}/${primaryAgency.id}`}
              onClick={() => setOpen(false)}
              className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm font-medium"
            >
              View agency
            </Link>
          ) : (
            <Link
              href={ROUTES.AGENCIES}
              onClick={() => setOpen(false)}
              className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm font-medium"
            >
              Agencies
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="text-muted-foreground hover:bg-muted/60 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
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
  const isV2 = useIsAgentUiV2();
  const { hasFullManagementAccess, needActionItems, platformBillingDisabled } = useAgentData();
  const propertyNeedActionCount = needActionItems.length;
  const billingLabel = agencyBillingNavLabel(hasFullManagementAccess);
  const menuNav = filterHiddenBillingNav(
    filterNavByAccess(MOBILE_MENU_NAV, hasFullManagementAccess).map((item) =>
      item.href === ROUTES.BILL ? { ...item, label: billingLabel } : item,
    ),
    platformBillingDisabled,
  );

  const mainNav = menuNav.filter((item) => !V2_SIDEBAR_PINNED_HREFS.has(item.href));
  const agencyMenuItems = menuNav.filter((item) => V2_AGENCY_MENU_HREFS.has(item.href));

  const v2SidebarNav = (() => {
    const archiveIndex = mainNav.findIndex((item) => item.href === ROUTES.ARCHIVE);
    const moreItem = {
      href: ROUTES.MORE,
      label: 'More',
      icon: MoreHorizontal,
      trailingChevron: true,
    };
    if (archiveIndex === -1) return [...mainNav, moreItem];
    return [
      ...mainNav.slice(0, archiveIndex + 1),
      moreItem,
      ...mainNav.slice(archiveIndex + 1),
    ];
  })();

  if (isV2) {
    return (
      <aside
        className={cn(
          'agent-sidebar agent-sidebar-v2 group/sidebar z-30 hidden h-full shrink-0 flex-col overflow-hidden transition-[width,box-shadow] duration-300 ease-out lg:flex',
          compact
            ? 'w-[72px] hover:z-40 hover:w-[252px] hover:shadow-[8px_0_24px_-8px_rgba(0,0,0,0.12)]'
            : 'w-[252px]',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center gap-2 px-4 pt-4 pb-3',
            compact ? 'justify-center group-hover/sidebar:justify-start' : '',
          )}
        >
          <CrossubLogo
            size="sm"
            showWordmark
            href={ROUTES.DASHBOARD}
            className="min-w-0"
            wordmarkClassName={cn(compact && 'hidden group-hover/sidebar:inline')}
          />
        </div>

        <nav className="scrollbar-subtle flex-1 overflow-x-hidden overflow-y-auto px-3 py-1">
          <ul className="space-y-0.5">
            {v2SidebarNav.map((item) => (
              <li key={item.href}>
                <NavLink
                  {...item}
                  v2
                  active={isActive(pathname, item.href)}
                  compact={compact}
                  badge={item.href === ROUTES.TASKS ? propertyNeedActionCount : undefined}
                  trailingChevron={'trailingChevron' in item && item.trailingChevron}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-3 pb-4 pt-2">
          <div className="border-border/50 mb-3 border-t" />
          <AgentSidebarAgency
            compact={compact}
            onLogout={onLogout}
            menuItems={agencyMenuItems}
            pathname={pathname}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'agent-sidebar border-border group/sidebar sticky top-0 z-30 hidden h-full shrink-0 flex-col overflow-hidden border-r transition-[width,box-shadow] duration-300 ease-out lg:flex',
        compact
          ? 'w-[72px] hover:z-40 hover:w-[240px] hover:shadow-[8px_0_24px_-8px_rgba(0,0,0,0.12)] ui-v2:hover:shadow-none'
          : 'w-[260px]',
        'bg-card/95 shadow-[1px_0_0_0_rgba(0,0,0,0.03)] backdrop-blur-xl ui-v2:bg-background ui-v2:shadow-none',
      )}
    >
      <div
        className={cn(
          'border-border/70 flex min-h-14 items-center gap-2 border-b py-2',
          compact ? 'justify-center px-2 group-hover/sidebar:px-3' : 'px-3',
        )}
      >
        <CrossubLogo size="sm" className="shrink-0" />
        <AgentSidebarStatus compact={compact} className="flex-1" />
        <div className={cn('shrink-0', compact && 'hidden group-hover/sidebar:block')}>
          <ThemeToggle />
        </div>
      </div>

      <nav className="scrollbar-subtle flex-1 overflow-x-hidden overflow-y-auto p-2">
        {!compact ? (
          <>
            <p className="text-muted-foreground mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide ui-v2:tracking-wider">
              Menu
            </p>
            <ul className="space-y-0.5">
              {menuNav.map((item) => (
                <li key={item.href}>
                  <NavLink
                    {...item}
                    active={isActive(pathname, item.href)}
                    badge={item.href === ROUTES.TASKS ? propertyNeedActionCount : undefined}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="space-y-1">
            {menuNav.map((item) => (
              <li key={item.href}>
                <NavLink
                  {...item}
                  active={isActive(pathname, item.href)}
                  compact
                  badge={item.href === ROUTES.TASKS ? propertyNeedActionCount : undefined}
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
