import type { PropertyDetailTab } from '@/lib/portal-service-level';
import type { PropertyNeedAction } from '@/lib/types';

const PROPERTY_DETAIL_TAB_SET = new Set<string>([
  'Gii',
  'Documents',
  'Fees',
  'Bills',
  'Rent Review',
  'Leasing',
  'Maintenance',
  'Inspection',
  'Accounting',
  'Tribunal',
  'Archive',
]);

function tabFromHref(href: string): PropertyDetailTab | null {
  const match = href.match(/[?&]tab=([^&]+)/);
  if (!match) return null;
  const tab = decodeURIComponent(match[1]);
  return PROPERTY_DETAIL_TAB_SET.has(tab) ? (tab as PropertyDetailTab) : null;
}

/** Map a need-action row to the property profile tab where the agent should look. */
export function resolveNeedActionPropertyTab(item: PropertyNeedAction): PropertyDetailTab {
  if (item.id.startsWith('rr-') || item.label.toLowerCase().includes('rent review')) {
    return 'Rent Review';
  }

  if (item.href.includes('leasing=rent-review')) {
    return 'Rent Review';
  }

  const fromHref = tabFromHref(item.href);
  if (fromHref) {
    if (item.category === 'Tribunal') return 'Tribunal';
    return fromHref;
  }

  switch (item.category) {
    case 'Maintenance':
      return 'Maintenance';
    case 'Inspection':
      return 'Inspection';
    case 'Accounting':
      return 'Accounting';
    case 'Tribunal':
      return 'Tribunal';
    case 'Others':
      return 'Documents';
    case 'Leasing':
    default:
      return 'Leasing';
  }
}

export function countNeedActionsByTab(
  items: PropertyNeedAction[],
): Partial<Record<PropertyDetailTab, number>> {
  const counts: Partial<Record<PropertyDetailTab, number>> = {};
  for (const item of items) {
    const tab = resolveNeedActionPropertyTab(item);
    counts[tab] = (counts[tab] ?? 0) + 1;
  }
  return counts;
}

export function needActionsForTab(
  items: PropertyNeedAction[],
  tab: PropertyDetailTab,
): PropertyNeedAction[] {
  return items.filter((item) => resolveNeedActionPropertyTab(item) === tab);
}
