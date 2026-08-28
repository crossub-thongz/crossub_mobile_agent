import { dayKey, formatTime } from '@/lib/format-datetime';
import { formatEnumLabel, formatTitleCase } from '@/lib/display-text';
import type {
  DashboardKpis,
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
  TimelineEntry,
} from '@/lib/types';
import { formatRelative } from '@/lib/utils';

function statusLooksComplete(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('complete') || s.includes('closed') || s.includes('sent');
}

export function greetingForNow(now = new Date()): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Whole-dollar AUD for dashboard KPIs (mock uses $128,420, not cents). */
export function formatDashboardMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-AU')}`;
}

export type PortfolioHealth = {
  healthy: number;
  crosHandling: number;
  needAction: number;
  issues: number;
  label: 'Good' | 'Needs attention' | 'Quiet';
};

export type PortfolioHealthBucketKey = 'healthy' | 'crosHandling' | 'needAction' | 'issues';

export type PortfolioHealthPropertyEntry = {
  propertyId: string;
  address: string;
  actions: PropertyNeedAction[];
};

export type PortfolioHealthBreakdown = PortfolioHealth & {
  buckets: Record<PortfolioHealthBucketKey, PortfolioHealthPropertyEntry[]>;
};

export const PORTFOLIO_HEALTH_BUCKET_LABEL: Record<PortfolioHealthBucketKey, string> = {
  healthy: 'Healthy',
  crosHandling: 'CROS Handling',
  needAction: 'Need Your Action',
  issues: 'Issues',
};

function propertyAddress(properties: Property[], propertyId: string): string {
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return 'Unknown property';
  const parts = [property.address, property.suburb, property.state, property.postcode].filter(Boolean);
  return parts.join(', ');
}

function groupActionsByProperty(
  actions: PropertyNeedAction[],
  properties: Property[],
): PortfolioHealthPropertyEntry[] {
  const byProperty = new Map<string, PropertyNeedAction[]>();
  for (const action of actions) {
    const list = byProperty.get(action.propertyId) ?? [];
    list.push(action);
    byProperty.set(action.propertyId, list);
  }
  return [...byProperty.entries()].map(([propertyId, items]) => ({
    propertyId,
    address: items[0]?.propertyAddress || propertyAddress(properties, propertyId),
    actions: items,
  }));
}

function propertyEntries(
  propertyIds: Set<string>,
  properties: Property[],
): PortfolioHealthPropertyEntry[] {
  return [...propertyIds].map((propertyId) => ({
    propertyId,
    address: propertyAddress(properties, propertyId),
    actions: [],
  }));
}

function uniqueIds(ids: string[]): Set<string> {
  return new Set(ids.filter(Boolean));
}

/**
 * Four mutually exclusive property buckets for the health strip.
 *
 * Urgent need-actions → Issues; remaining need-actions → Need your action;
 * in-flight work with no agent gate → CROS handling; the rest → Healthy.
 */
export function buildPortfolioHealth(input: {
  properties: Property[];
  needActionItems: PropertyNeedAction[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  tenantSelections: TenantSelectionCase[];
}): PortfolioHealth {
  const total = input.properties.length;
  if (total === 0) {
    return { healthy: 0, crosHandling: 0, needAction: 0, issues: 0, label: 'Quiet' };
  }

  const issues = uniqueIds(
    input.needActionItems.filter((i) => i.priority === 'urgent').map((i) => i.propertyId),
  );
  const action = uniqueIds(
    input.needActionItems
      .filter((i) => i.priority !== 'urgent' && !issues.has(i.propertyId))
      .map((i) => i.propertyId),
  );

  const claimed = new Set([...issues, ...action]);
  const cros = uniqueIds([
    ...input.maintenance
      .filter((m) => !m.requiresApproval && !statusLooksComplete(m.status))
      .map((m) => m.propertyId),
    ...input.inspections
      .filter((i) => !statusLooksComplete(i.status))
      .map((i) => i.propertyId),
    ...input.rentReviews
      .filter((r) => !r.requiresApproval && !statusLooksComplete(r.status))
      .map((r) => r.propertyId),
    ...input.tenantSelections
      .filter((t) => !t.requiresApproval && !statusLooksComplete(t.status))
      .map((t) => t.propertyId),
  ]);
  for (const id of claimed) cros.delete(id);

  const healthy = Math.max(0, total - issues.size - action.size - cros.size);
  const pressure = issues.size + action.size;
  const label: PortfolioHealth['label'] =
    pressure === 0 ? 'Good' : pressure / total > 0.15 ? 'Needs attention' : 'Good';

  return {
    healthy,
    crosHandling: cros.size,
    needAction: action.size,
    issues: issues.size,
    label,
  };
}

/** Portfolio health counts plus per-bucket property lists for dashboard drill-down. */
export function buildPortfolioHealthBreakdown(input: {
  properties: Property[];
  needActionItems: PropertyNeedAction[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  tenantSelections: TenantSelectionCase[];
}): PortfolioHealthBreakdown {
  const total = input.properties.length;
  if (total === 0) {
    return {
      healthy: 0,
      crosHandling: 0,
      needAction: 0,
      issues: 0,
      label: 'Quiet',
      buckets: { healthy: [], crosHandling: [], needAction: [], issues: [] },
    };
  }

  const issueActions = input.needActionItems.filter((i) => i.priority === 'urgent');
  const issues = uniqueIds(issueActions.map((i) => i.propertyId));
  const actionActions = input.needActionItems.filter(
    (i) => i.priority !== 'urgent' && !issues.has(i.propertyId),
  );
  const action = uniqueIds(actionActions.map((i) => i.propertyId));

  const claimed = new Set([...issues, ...action]);
  const cros = uniqueIds([
    ...input.maintenance
      .filter((m) => !m.requiresApproval && !statusLooksComplete(m.status))
      .map((m) => m.propertyId),
    ...input.inspections
      .filter((i) => !statusLooksComplete(i.status))
      .map((i) => i.propertyId),
    ...input.rentReviews
      .filter((r) => !r.requiresApproval && !statusLooksComplete(r.status))
      .map((r) => r.propertyId),
    ...input.tenantSelections
      .filter((t) => !t.requiresApproval && !statusLooksComplete(t.status))
      .map((t) => t.propertyId),
  ]);
  for (const id of claimed) cros.delete(id);

  const healthyIds = new Set(
    input.properties.map((p) => p.id).filter((id) => !issues.has(id) && !action.has(id) && !cros.has(id)),
  );
  const healthy = healthyIds.size;
  const pressure = issues.size + action.size;
  const label: PortfolioHealth['label'] =
    pressure === 0 ? 'Good' : pressure / total > 0.15 ? 'Needs attention' : 'Good';

  return {
    healthy,
    crosHandling: cros.size,
    needAction: action.size,
    issues: issues.size,
    label,
    buckets: {
      healthy: propertyEntries(healthyIds, input.properties),
      crosHandling: propertyEntries(cros, input.properties),
      needAction: groupActionsByProperty(actionActions, input.properties),
      issues: groupActionsByProperty(issueActions, input.properties),
    },
  };
}

export function underOfferCount(tenantSelections: TenantSelectionCase[]): number {
  return uniqueIds(
    tenantSelections.filter((t) => t.requiresApproval || !statusLooksComplete(t.status)).map((t) => t.propertyId),
  ).size;
}

export type DashboardActivity = {
  id: string;
  at: string;
  title: string;
  address: string;
  category: 'Inspection' | 'Leasing' | 'Maintenance' | 'Tribunal';
  href: string;
};

function newestTimeline(entries: TimelineEntry[]): TimelineEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) => (Date.parse(entry.at) > Date.parse(best.at) ? entry : best));
}

export function buildRecentActivity(input: {
  inspections: Inspection[];
  maintenance: MaintenanceRequest[];
  rentReviews: RentReviewCase[];
  inspectionHref: (id: string) => string;
  maintenanceHref: (id: string) => string;
  rentReviewHref: (id: string) => string;
  take?: number;
}): DashboardActivity[] {
  const rows: DashboardActivity[] = [];

  for (const inspection of input.inspections) {
    const event = newestTimeline(inspection.timeline);
    const at = inspection.completedAt ?? inspection.approvedAt ?? event?.at ?? inspection.createdAt;
    if (!at) continue;
    rows.push({
      id: `insp-${inspection.id}`,
      at,
      title:
        event?.title ||
        `${formatEnumLabel(inspection.type)} Inspection ${
          statusLooksComplete(inspection.status)
            ? 'Completed'
            : formatEnumLabel(inspection.status)
        }`,
      address: inspection.propertyAddress,
      category: 'Inspection',
      href: input.inspectionHref(inspection.id),
    });
  }

  for (const job of input.maintenance) {
    const event = newestTimeline(job.timeline);
    const at = event?.at ?? job.updatedAt ?? job.createdAt;
    if (!at) continue;
    rows.push({
      id: `mnt-${job.id}`,
      at,
      title: event?.title ? formatTitleCase(event.title) : formatTitleCase(job.title),
      address: job.propertyAddress,
      category: 'Maintenance',
      href: input.maintenanceHref(job.id),
    });
  }

  for (const review of input.rentReviews) {
    const event = newestTimeline(review.timeline);
    const at = event?.at ?? review.completedDate ?? review.createdAt;
    if (!at) continue;
    rows.push({
      id: `rr-${review.id}`,
      at,
      title: event?.title ? formatTitleCase(event.title) : `${formatTitleCase('Rent review')} · ${formatEnumLabel(review.status)}`,
      address: review.propertyAddress,
      category: 'Leasing',
      href: input.rentReviewHref(review.id),
    });
  }

  return rows
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, input.take ?? 6);
}

export function activityWhen(iso: string, now = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return formatTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday)) return 'Yesterday';
  return formatRelative(iso);
}

export function inspectionPendingTotal(k: DashboardKpis['inspection']): number {
  return k.openPending + k.ingoingPending + k.outgoingPending + k.routinePending;
}

export function crosHandlingTotals(k: DashboardKpis): {
  maintenance: { count: number; pending: number };
  inspections: { count: number; pending: number };
  leasing: { count: number; pending: number };
  total: number;
} {
  const inspectionPending = inspectionPendingTotal(k.inspection);
  const leasingPending = k.leasing.upcomingRentReviews + k.leasing.newLeasing + k.leasing.leaseRenewals;
  const maintenanceCount = k.maintenance.inProgress + k.maintenance.pendingApproval;
  return {
    maintenance: { count: maintenanceCount, pending: k.maintenance.pendingApproval },
    inspections: { count: inspectionPending, pending: inspectionPending },
    leasing: { count: leasingPending, pending: leasingPending },
    total: maintenanceCount + inspectionPending + leasingPending,
  };
}
