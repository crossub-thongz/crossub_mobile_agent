import type { Inspection } from '@/lib/types';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export const OPEN_INSPECTION_PENDING = 'Pending';

export function isAssignedInspectorName(name?: string | null): boolean {
  if (!name?.trim()) return false;
  const normalized = name.trim().toLowerCase();
  return ![
    'pending',
    'pending assignment',
    'pending — task pool',
    'task pool',
    'pending - task pool',
  ].includes(normalized);
}

export function resolveOpenInspectionForProperty(
  inspections: Inspection[],
  propertyId: string,
  viewingSessionId?: string,
): Inspection | undefined {
  if (viewingSessionId) {
    const linked = inspections.find((i) => i.id === viewingSessionId);
    if (linked) return linked;
  }
  return inspections.find(
    (i) => i.propertyId === propertyId && i.type === 'OPEN' && !i.status.toLowerCase().includes('cancel'),
  );
}

export function formatInspectionTimeRange(
  start?: string,
  end?: string,
): string {
  if (!start) return OPEN_INSPECTION_PENDING;
  const startLabel = formatDateTime(start);
  if (!end) return startLabel;
  const endLabel = formatDateTime(end);
  return `${startLabel} – ${endLabel}`;
}

export function formatLettingRent(rentPerWeek?: number): string {
  if (rentPerWeek == null || rentPerWeek <= 0) return '—';
  return `${formatCurrency(rentPerWeek)}/wk`;
}

export function formatTenantMovedOutDate(detail: LeasingPropertyDetail): string {
  const { rental } = detail;
  if (rental.tenantMovedOut === false) return 'Tenant still in property';
  if (rental.tenantMovedOutDate) return formatDate(rental.tenantMovedOutDate);
  if (rental.tenantMovedOut === true) return '—';
  return OPEN_INSPECTION_PENDING;
}
