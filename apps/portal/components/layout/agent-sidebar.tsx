'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChevronDown, DoorOpen, FileText, LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

import { MessageUnreadBadge } from '@/components/agent/message-unread-badge';
import { TrainingReplayButton } from '@/components/agent/module-training';
import { CrossubLogo } from '@/components/brand/crossub-logo';
import { AgentSidebarStatus } from '@/components/layout/agent-sidebar-status';
import { ThemeToggle } from '@/components/theme-toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { menuNavForUi, sidebarFooterNavForUi, TASK_SECTION_HREFS } from '@/constants/nav';
import {
  LEASING_VIEW_EVENT,
  leasingViewHref,
  notifyLeasingView,
  replayVideosForHref,
  TRAINING_VIDEO,
  trainingAudience,
  trainingVideoById,
} from '@/constants/module-training';
import { LEASING_PAGE_VIEW } from '@/constants/module-workspace';
import { SUPPORT_PAGE_SECTION, supportSectionItems } from '@/constants/more-page';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentInbox } from '@/components/providers/agent-inbox-provider';
import { useCrosToday } from '@/components/providers/cros-today-provider';
import { filterNavByAccess, agencyBillingNavLabel } from '@/lib/portal-service-level';
import { filterHiddenBillingNav } from '@/lib/platform-billing-ui';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';
import { cn } from '@/lib/utils';

const V2_SIDEBAR_PINNED_HREFS = new Set<string>([
  ROUTES.SETTINGS,
  ROUTES.FAQ,
  ROUTES.PRICING,
  ROUTES.MORE,
]);

const V2_AGENCY_MENU_HREFS = new Set<string>([ROUTES.SETTINGS, ROUTES.PRICING]);

function isActive(pathname: string, href: string, search = ''): boolean {
  const split = href.indexOf('?');
  const path = split === -1 ? href : href.slice(0, split);
  const query = split === -1 ? '' : href.slice(split);
  if (query) return pathname === path && search === query;
  if (path === ROUTES.LEASING && pathname === path && search.startsWith('?view=')) return false;
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavReplayButtons({
  href,
  compact,
  pinned = false,
}: {
  href: string;
  compact?: boolean;
  pinned?: boolean;
}) {
  const { agencies } = useAgentData();
  const videos = replayVideosForHref(href, trainingAudience(agencies));
  if (videos.length === 0) return null;
  return (
    <span
      className={cn(
        'mr-2 flex shrink-0 items-center gap-0.5',
        compact && (pinned ? 'hidden' : 'hidden group-hover/sidebar:flex'),
      )}
    >
      {videos.map((video) => (
        <TrainingReplayButton key={video.id} video={video} />
      ))}
    </span>
  );
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
  pinned = false,
  badge,
  v2 = false,
  trailingChevron = false,
  nested = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  compact?: boolean;
  /** Icon rail that stays collapsed until the user opens it. */
  pinned?: boolean;
  badge?: number;
  v2?: boolean;
  trailingChevron?: boolean;
  nested?: boolean;
}) {
  const tour =
    href === ROUTES.PROPERTIES
      ? 'nav-properties'
      : href === ROUTES.TASKS
        ? 'nav-tasks'
        : href === ROUTES.ARCHIVE
          ? 'nav-history'
          : undefined;
  const onClick = () => {
    if (href === ROUTES.LEASING) notifyLeasingView(LEASING_PAGE_VIEW.LETTINGS);
    const view = new URLSearchParams(href.split('?')[1] ?? '').get('view');
    if (view === LEASING_PAGE_VIEW.TENANCY_REVIEWS || view === LEASING_PAGE_VIEW.VACATING) {
      notifyLeasingView(view);
    }
  };

  if (v2) {
    return (
      <div
        className={cn(
          'agent-sidebar-v2__nav-link relative flex items-center text-[15px] font-medium',
          active ? 'agent-sidebar-v2__nav-link--active' : 'agent-sidebar-v2__nav-link--idle',
          nested && 'agent-sidebar-v2__nav-link--nested !py-2',
        )}
      >
        <Link
          href={href}
          title={label}
          onClick={onClick}
          data-tour={tour}
          className={cn(
            'flex min-w-0 flex-1 items-center',
            compact
              ? pinned
                ? 'justify-center px-2 py-3.5'
                : 'justify-center px-2 py-3.5 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-5'
              : 'gap-3 px-5 py-3.5',
          )}
        >
          <Icon className="agent-sidebar-v2__nav-icon size-[18px] shrink-0 stroke-[1.75]" />
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              compact &&
                (pinned
                  ? 'hidden'
                  : 'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100'),
            )}
          >
            {label}
          </span>
          {badge && badge > 0 ? (
            <MessageUnreadBadge count={badge} size="sm" className="shrink-0" />
          ) : null}
          {trailingChevron ? (
            <ChevronDown
              className={cn(
                'agent-sidebar-v2__nav-chevron size-4 shrink-0',
                compact && (pinned ? 'hidden' : 'hidden group-hover/sidebar:block'),
              )}
              aria-hidden
            />
          ) : null}
        </Link>
        <NavReplayButtons href={href} compact={compact} pinned={pinned} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex items-center rounded-lg text-sm font-medium transition-[color,background-color,transform,box-shadow] duration-200 ease-out hover:translate-x-0.5',
        active
          ? 'rounded-xl bg-primary/10 text-primary shadow-sm shadow-primary/5'
          : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
      )}
    >
      <Link
        href={href}
        title={label}
        onClick={onClick}
        data-tour={tour}
        className={cn(
          'flex min-w-0 flex-1 items-center',
          compact
            ? 'justify-center px-2 py-2.5 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3'
            : 'gap-2.5 px-3 py-2',
        )}
      >
        <Icon className={cn('size-4 shrink-0 transition-transform duration-200 ease-out', !active && 'opacity-70')} />
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            compact &&
              'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100',
          )}
        >
          {label}
        </span>
        {badge && badge > 0 ? (
          <MessageUnreadBadge count={badge} size="sm" className="shrink-0 ring-2 ring-card" />
        ) : null}
      </Link>
      <NavReplayButtons href={href} compact={compact} pinned={pinned} />
    </div>
  );
}

function AgentSidebarSupport({
  compact,
  pinned = false,
  pathname,
  onOpenChange,
}: {
  compact?: boolean;
  pinned?: boolean;
  pathname: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const selfManaged = useSelfManagedAccess().selfManaged;
  const setMenuOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  const items = supportSectionItems(selfManaged);
  const active = items.some((item) => item.href && isActive(pathname, item.href));
  const Icon = SUPPORT_PAGE_SECTION.icon;
  const supportVideos = [TRAINING_VIDEO.CONTACT_US, TRAINING_VIDEO.CROSSUB_TEAM].flatMap((id) => {
    const video = trainingVideoById(id);
    return video ? [video] : [];
  });

  return (
    <div
      className={cn(
        'agent-sidebar-v2__nav-link relative flex items-center rounded-xl text-[14px] font-medium',
        open || active ? 'agent-sidebar-v2__nav-link--active' : 'agent-sidebar-v2__nav-link--idle',
      )}
    >
    <Popover open={open} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Support"
          data-tour="contact-account-manager"
          className={cn(
            'flex min-w-0 flex-1 items-center',
            compact
              ? pinned
                ? 'justify-center px-2 py-2.5'
                : 'justify-center px-2 py-2.5 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3'
              : 'gap-3 px-3 py-2.5',
          )}
        >
          <Icon className="agent-sidebar-v2__nav-icon size-[18px] shrink-0 stroke-[1.75]" />
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-left',
              compact &&
                (pinned
                  ? 'hidden'
                  : 'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100'),
            )}
          >
            Support
          </span>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 shrink-0 opacity-70',
              compact && (pinned ? 'hidden' : 'hidden group-hover/sidebar:block'),
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-56 p-2"
      >
        <div className="space-y-0.5">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const href = item.href!;
            return (
              <Link
                key={item.id}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'hover:bg-muted/60 flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap',
                  isActive(pathname, href) && 'bg-muted/40 font-medium',
                )}
              >
                <ItemIcon className="size-4 shrink-0 opacity-70" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
    <span
      className={cn(
        'mr-2 flex shrink-0 items-center gap-0.5',
        compact && (pinned ? 'hidden' : 'hidden group-hover/sidebar:flex'),
      )}
    >
      {supportVideos.map((video) => (
        <TrainingReplayButton key={video.id} video={video} />
      ))}
    </span>
    </div>
  );
}

function AgentSidebarAgency({
  compact,
  pinned = false,
  onLogout,
  menuItems,
  pathname,
  onOpenChange,
}: {
  compact?: boolean;
  pinned?: boolean;
  onLogout: () => void;
  menuItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const { primaryAgency, agencies } = useAgentData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const setMenuOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const clientSince = user?.systemAccessAcceptedAt
    ? formatClientSinceMonth(user.systemAccessAcceptedAt)
    : null;
  const agencyName = primaryAgency?.name ?? 'Your agency';

  return (
    <Popover open={open} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'agent-sidebar-v2__agency flex w-full items-center rounded-xl text-left transition-colors hover:bg-[color-mix(in_oklab,var(--card)_50%,transparent)]',
            compact
              ? pinned
                ? 'justify-center p-2'
                : 'justify-center p-2 group-hover/sidebar:gap-3 group-hover/sidebar:px-3 group-hover/sidebar:py-2.5'
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
                (pinned
                  ? 'hidden'
                  : 'max-w-0 overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100'),
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
              compact && (pinned ? 'hidden' : 'hidden group-hover/sidebar:block'),
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-56 p-2">
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'hover:bg-muted/60 flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap',
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
                onClick={() => setMenuOpen(false)}
                className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm whitespace-nowrap"
              >
                {agency.name}
              </Link>
            ))
          ) : primaryAgency && !primaryAgency.id.startsWith('local-') ? (
            <Link
              href={`${ROUTES.AGENCIES}/${primaryAgency.id}`}
              onClick={() => setMenuOpen(false)}
              className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap"
            >
              View agency
            </Link>
          ) : (
            <Link
              href={ROUTES.AGENCIES}
              onClick={() => setMenuOpen(false)}
              className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap"
            >
              Agencies
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onLogout();
            }}
            className="text-muted-foreground hover:bg-muted/60 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap"
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
  const pathname = usePathname() ?? '';
  const [locationSearch, setLocationSearch] = useState('');
  const isV2 = useIsAgentUiV2();
  const [supportOpen, setSupportOpen] = useState(false);
  const [agencyOpen, setAgencyOpen] = useState(false);
  const [accountingCollapsed, setAccountingCollapsed] = useState(false);
  const onAccounting = pathname === ROUTES.TRUST || pathname.startsWith(`${ROUTES.TRUST}/`);
  const pinned = onAccounting && accountingCollapsed;
  const railCollapsed = pinned || (compact && !supportOpen && !agencyOpen);

  useEffect(() => {
    if (!onAccounting) setAccountingCollapsed(false);
  }, [onAccounting]);

  useEffect(() => {
    const read = () => setLocationSearch(window.location.search);
    read();
    const onView = (event: Event) => {
      const view = (event as CustomEvent<string | null>).detail;
      setLocationSearch(
        view && view !== LEASING_PAGE_VIEW.LETTINGS ? `?view=${view}` : '',
      );
    };
    window.addEventListener('popstate', read);
    window.addEventListener(LEASING_VIEW_EVENT, onView);
    return () => {
      window.removeEventListener('popstate', read);
      window.removeEventListener(LEASING_VIEW_EVENT, onView);
    };
  }, [pathname]);
  const { hasFullManagementAccess, platformBillingDisabled } = useAgentData();
  const selfManagedAccess = useSelfManagedAccess();
  const { total: needsYouCount } = useCrosToday();
  const inbox = useAgentInbox();
  /** Tasks shows what needs the agent; Conversations, when it is the one inbox, its unread count. */
  const navBadge = (href: string): number | undefined =>
    href === ROUTES.TASKS
      ? needsYouCount
      : href === ROUTES.CONVERSATIONS && inbox.conversationsOnly
        ? inbox.unread
        : undefined;
  const billingLabel = agencyBillingNavLabel(hasFullManagementAccess);
  const menuNav = filterHiddenBillingNav(
    filterNavByAccess(menuNavForUi(isV2), hasFullManagementAccess, selfManagedAccess).map((item) =>
      item.href === ROUTES.BILL ? { ...item, label: billingLabel } : item,
    ),
    platformBillingDisabled,
  );

  const mainNav = menuNav.filter((item) => !V2_SIDEBAR_PINNED_HREFS.has(item.href));
  const agencyMenuItems = menuNav.filter((item) => V2_AGENCY_MENU_HREFS.has(item.href));
  const footerNav = sidebarFooterNavForUi(isV2);

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
          'agent-sidebar agent-sidebar-v2 group/sidebar z-30 hidden h-full shrink-0 flex-col overflow-hidden transition-[width,box-shadow] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex',
          pinned && 'agent-sidebar-v2--pinned',
          pinned
            ? 'w-[72px]'
            : railCollapsed
              ? 'w-[72px] hover:z-40 hover:w-[252px] hover:shadow-[8px_0_24px_-8px_rgba(0,0,0,0.12)]'
              : 'z-40 w-[252px]',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center gap-2 px-4 pt-4 pb-3',
            pinned ? 'flex-col px-2' : railCollapsed ? 'justify-center group-hover/sidebar:justify-start' : '',
          )}
        >
          <CrossubLogo
            size="sm"
            showWordmark
            href={ROUTES.DASHBOARD}
            className="min-w-0"
            wordmarkClassName={cn(
              pinned ? 'hidden' : railCollapsed && 'hidden group-hover/sidebar:inline',
            )}
          />
          {onAccounting ? (
            <button
              type="button"
              onClick={() => setAccountingCollapsed((closed) => !closed)}
              aria-label={pinned ? 'Expand sidebar' : 'Collapse sidebar'}
              title={pinned ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'text-muted-foreground hover:bg-secondary hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg',
                !pinned && 'ml-auto',
              )}
            >
              {pinned ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          ) : null}
        </div>

        <nav className="scrollbar-subtle flex-1 overflow-x-hidden overflow-y-auto">
          <ul className="agent-sidebar-v2__nav-list">
            {v2SidebarNav.flatMap((item) => {
              if ((TASK_SECTION_HREFS as readonly string[]).includes(item.href)) return [];
              const row = (
                <li key={item.href} className="agent-sidebar-v2__nav-item">
                  <NavLink
                    {...item}
                    v2
                    active={isActive(pathname, item.href, locationSearch)}
                    compact={railCollapsed}
                    pinned={pinned}
                    badge={navBadge(item.href)}
                    trailingChevron={'trailingChevron' in item && item.trailingChevron}
                  />
                </li>
              );
              if (item.href !== ROUTES.TASKS) return [row];
              const children = TASK_SECTION_HREFS.flatMap((href) => {
                const child = v2SidebarNav.find((entry) => entry.href === href);
                if (!child) return [];
                return [
                  <li key={child.href} className="agent-sidebar-v2__nav-item">
                    <NavLink
                      {...child}
                      v2
                      nested
                      active={isActive(pathname, child.href, locationSearch)}
                      compact={railCollapsed}
                      pinned={pinned}
                    />
                  </li>,
                ];
              });
              const leasingExtras = selfManagedAccess.selfManaged
                ? [
                    {
                      href: leasingViewHref(LEASING_PAGE_VIEW.TENANCY_REVIEWS),
                      label: 'Tenancy reviews',
                      icon: FileText,
                    },
                    {
                      href: leasingViewHref(LEASING_PAGE_VIEW.VACATING),
                      label: 'Vacating',
                      icon: DoorOpen,
                    },
                  ].map((child) => (
                    <li key={child.href} className="agent-sidebar-v2__nav-item">
                      <NavLink
                        href={child.href}
                        label={child.label}
                        icon={child.icon}
                        v2
                        nested
                        active={isActive(pathname, child.href, locationSearch)}
                        compact={railCollapsed}
                        pinned={pinned}
                      />
                    </li>
                  ))
                : [];
              return [row, ...children, ...leasingExtras];
            })}
          </ul>
        </nav>

        <div className="px-3 pb-4 pt-2">
          <div className="border-border/50 mb-3 border-t" />
          {footerNav.length > 0 ? (
            <div className="mb-1">
              <AgentSidebarSupport
                compact={railCollapsed}
                pinned={pinned}
                pathname={pathname}
                onOpenChange={setSupportOpen}
              />
            </div>
          ) : null}
          <AgentSidebarAgency
            compact={railCollapsed}
            pinned={pinned}
            onLogout={onLogout}
            menuItems={agencyMenuItems}
            pathname={pathname}
            onOpenChange={setAgencyOpen}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'agent-sidebar border-border group/sidebar sticky top-0 z-30 hidden h-full shrink-0 flex-col overflow-hidden border-r transition-[width,box-shadow] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex',
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
            <p className="text-muted-foreground mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide ui-v2:tracking-wider">
              Menu
            </p>
            <ul className="space-y-0.5">
              {menuNav.map((item) => (
                <li key={item.href}>
                  <NavLink
                    {...item}
                    active={isActive(pathname, item.href, locationSearch)}
                    badge={navBadge(item.href)}
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
                  active={isActive(pathname, item.href, locationSearch)}
                  compact
                  badge={navBadge(item.href)}
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
                ? 'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover/sidebar:max-w-[100px] group-hover/sidebar:opacity-100'
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
