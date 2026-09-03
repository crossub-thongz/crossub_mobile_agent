'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';

import {
  MORE_ACCOUNT_SECTION,
  MORE_PAGE_SECTIONS,
  MORE_PAGE_SECTION_TONE,
  MORE_MENU_ITEM_DESCRIPTION,
  SUPPORT_PAGE_SECTION,
  type MorePageItem,
  type MorePageSection,
} from '@/constants/more-page';
import { sidebarOverflowNavForUi } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { agencyBillingNavLabel, filterNavByAccess } from '@/lib/portal-service-level';
import { filterHiddenBillingNav } from '@/lib/platform-billing-ui';
import { cn } from '@/lib/utils';

import '@/components/agent/more/more-hub.css';

function resolveItemHref(item: MorePageItem, agencyId?: string | null): string | undefined {
  if (!item.href) return undefined;
  if (item.id === 'agency-profile' && agencyId && !agencyId.startsWith('local-')) {
    return `${ROUTES.AGENCIES}/${agencyId}`;
  }
  return item.href;
}

function MoreRow({
  item,
  href,
  onSignOut,
  tone,
}: {
  item: MorePageItem;
  href?: string;
  onSignOut?: () => void;
  tone: MorePageSection['tone'];
}) {
  const Icon = item.icon;
  const rowTone = MORE_PAGE_SECTION_TONE[tone];
  const isSignOut = item.action === 'sign-out';

  const inner = (
    <>
      <span
        className={cn(
          'more-hub__row-icon flex size-9 shrink-0 items-center justify-center rounded-lg',
          isSignOut ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : rowTone.icon,
        )}
      >
        <Icon className="size-4 stroke-[1.75]" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-semibold leading-tight',
            isSignOut && 'text-rose-600 dark:text-rose-400',
          )}
        >
          {item.title}
        </span>
        {item.description ? (
          <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
            {item.description}
          </span>
        ) : null}
      </span>
      {!isSignOut ? (
        <ChevronRight className="text-muted-foreground size-4 shrink-0 opacity-60" aria-hidden />
      ) : null}
    </>
  );

  const className = cn(
    'more-hub__row flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors',
    rowTone.row,
    isSignOut && 'hover:bg-rose-500/8',
  );

  if (isSignOut) {
    return (
      <button type="button" onClick={onSignOut} className={className}>
        {inner}
      </button>
    );
  }

  if (!href) return null;

  if (item.external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export function MoreSectionCard({
  section,
  agencyId,
  onSignOut,
  expanded,
  onToggle,
  className,
  collapsible = true,
}: {
  section: MorePageSection;
  agencyId?: string | null;
  onSignOut?: () => void;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  collapsible?: boolean;
}) {
  const tone = MORE_PAGE_SECTION_TONE[section.tone];
  const SectionIcon = section.icon;
  const panelId = `more-section-${section.id}`;
  const open = !collapsible || expanded;

  return (
    <section className={cn('more-hub__card v2-dashboard__card overflow-hidden', className)}>
      {collapsible ? (
        <button
          type="button"
          id={`${panelId}-header`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'more-hub__card-header flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition-colors lg:pointer-events-none',
            open ? 'border-b' : 'lg:border-b',
          )}
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              tone.icon,
            )}
          >
            <SectionIcon className="size-4 stroke-[1.75]" />
          </span>
          <h2 className={cn('min-w-0 flex-1 text-sm font-semibold tracking-tight', tone.header)}>
            {section.title}
          </h2>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform lg:hidden',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      ) : (
        <div
          id={`${panelId}-header`}
          className="more-hub__card-header flex w-full items-center gap-2.5 border-b px-4 py-3.5 text-left"
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              tone.icon,
            )}
          >
            <SectionIcon className="size-4 stroke-[1.75]" />
          </span>
          <h2 className={cn('min-w-0 flex-1 text-sm font-semibold tracking-tight', tone.header)}>
            {section.title}
          </h2>
        </div>
      )}
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-header`}
        className={cn(
          'divide-y divide-border/40',
          open ? 'block' : 'hidden',
          collapsible && 'lg:block',
        )}
      >
        {section.items.map((item) => (
          <MoreRow
            key={item.id}
            item={item}
            href={resolveItemHref(item, agencyId)}
            onSignOut={onSignOut}
            tone={section.tone}
          />
        ))}
      </div>
    </section>
  );
}

export function MoreHub() {
  const isV2 = useIsAgentUiV2();
  const { logout } = useAuth();
  const { hasFullManagementAccess, primaryAgency, platformBillingDisabled } = useAgentData();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['menu']));
  const billingLabel = agencyBillingNavLabel(hasFullManagementAccess);

  const menuSection: MorePageSection = {
    id: 'menu',
    title: 'Menu',
    icon: LayoutGrid,
    tone: 'slate',
    items: filterHiddenBillingNav(
      filterNavByAccess(sidebarOverflowNavForUi(isV2), hasFullManagementAccess).map((item) => ({
        id: `menu-${item.href}`,
        title: item.href === ROUTES.BILL ? billingLabel : item.label,
        description: MORE_MENU_ITEM_DESCRIPTION[item.href],
        href: item.href,
        icon: item.icon,
        portalAccess: item.portalAccess,
      })),
      platformBillingDisabled,
    ),
  };

  const sections = [
    menuSection,
    {
      ...SUPPORT_PAGE_SECTION,
      items: filterNavByAccess(SUPPORT_PAGE_SECTION.items, hasFullManagementAccess),
    },
    ...MORE_PAGE_SECTIONS.map((section) => ({
      ...section,
      items: filterHiddenBillingNav(
        filterNavByAccess(section.items, hasFullManagementAccess),
        platformBillingDisabled,
      ),
    })),
    MORE_ACCOUNT_SECTION,
  ].filter((section) => section.items.length > 0);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <div className={cn('more-hub', isV2 && 'v2-dashboard normal-case')}>
      <header className={cn('more-hub__intro', isV2 && 'pt-2 lg:pt-6')}>
        <h1 className={cn('text-2xl font-semibold tracking-tight', isV2 && 'v2-dashboard__greeting')}>
          More
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
          Manage your agency, billing and documents.
        </p>
      </header>

      <div className="more-hub__grid mt-6 grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <MoreSectionCard
            key={section.id}
            section={section}
            agencyId={primaryAgency?.id}
            onSignOut={() => void logout()}
            expanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            className={
              section.id === 'menu' || section.id === 'support' ? 'lg:hidden' : undefined
            }
            collapsible={section.id !== 'menu' && section.id !== 'account'}
          />
        ))}
      </div>

      <footer className="text-muted-foreground mt-10 px-1 text-center text-xs leading-relaxed">
        <p>
          CROS is committed to providing secure and reliable property management services.
        </p>
        <p className="mt-1">© {new Date().getFullYear()} CROS Property Management. All rights reserved.</p>
      </footer>
    </div>
  );
}
