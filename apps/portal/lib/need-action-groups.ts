import { ROUTES } from '@/constants/routes';
import type { NeedActionGroup, PropertyNeedAction } from '@/lib/types';

const GROUP_DEFS: {
  id: string;
  match: (label: string, category: PropertyNeedAction['category']) => boolean;
  label: string;
  category: PropertyNeedAction['category'];
  href: string;
}[] = [
  {
    id: 'maintenance-approval',
    match: (l, c) => c === 'Maintenance' && l.toLowerCase().includes('approval'),
    label: 'Maintenance approval required',
    category: 'Maintenance',
    href: `${ROUTES.TASKS}?filter=Maintenance`,
  },
  {
    id: 'rent-review',
    match: (l, c) => c === 'Leasing' && l.toLowerCase().includes('rent review'),
    label: 'Rent review approval required',
    category: 'Leasing',
    href: `${ROUTES.TASKS}?filter=Leasing`,
  },
  {
    id: 'lease-renewal',
    match: (l, c) => c === 'Leasing' && l.toLowerCase().includes('lease'),
    label: 'Lease renewal required',
    category: 'Leasing',
    href: `${ROUTES.LEASING}?tab=rent-review`,
  },
  {
    id: 'tribunal',
    match: (_, c) => c === 'Tribunal',
    label: 'Tribunal action required',
    category: 'Tribunal',
    href: ROUTES.TRIBUNAL,
  },
  {
    id: 'arrears',
    match: (l, c) => c === 'Accounting' || l.toLowerCase().includes('arrears'),
    label: 'Arrears attention required',
    category: 'Accounting',
    href: `${ROUTES.TASKS}?filter=Accounting`,
  },
  {
    id: 'tenant-app',
    match: (l, c) => c === 'Leasing' && l.toLowerCase().includes('application'),
    label: 'New leasing approval required',
    category: 'Leasing',
    href: `${ROUTES.LEASING}?tab=new-leasing`,
  },
  {
    id: 'inspection',
    match: (_, c) => c === 'Inspection',
    label: 'Inspection action required',
    category: 'Inspection',
    href: `${ROUTES.TASKS}?filter=Inspection`,
  },
  {
    id: 'documents',
    match: (l) => l.toLowerCase().includes('documents'),
    label: 'Documents missing',
    category: 'Others',
    href: ROUTES.TASKS,
  },
];

export function buildNeedActionGroups(items: PropertyNeedAction[]): NeedActionGroup[] {
  const groups: NeedActionGroup[] = [];

  for (const def of GROUP_DEFS) {
    const count = items.filter((i) => def.match(i.label, i.category)).length;
    if (count > 0) {
      groups.push({
        id: def.id,
        label: def.label,
        count,
        href: def.href,
        category: def.category,
      });
    }
  }

  const otherCount = items.filter(
    (i) => !GROUP_DEFS.some((d) => d.match(i.label, i.category)),
  ).length;
  if (otherCount > 0) {
    groups.push({
      id: 'other',
      label: 'Other actions required',
      count: otherCount,
      href: ROUTES.TASKS,
      category: 'Others',
    });
  }

  return groups.sort((a, b) => b.count - a.count);
}
