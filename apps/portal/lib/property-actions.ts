import {
  inspectionDetail,
  maintenanceDetail,
  propertyDetail,
  propertyFinancialsHref,
  rentReviewDetail,
  tenantSelectionDetail,
  tribunalDetail,
} from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { formatPropertyFullAddress } from '@/lib/utils';
import { isPropertyVacant } from '@/lib/property-leasing';
import { isEndLeasingSpawnedMaintenance } from '@/lib/property-maintenance-history';
import { isRentReviewPendingApproval } from '@/lib/rent-review';
import { isTenantSelectionPending } from '@/lib/tenant-selection';
import { PRIORITY_RANK } from '@/constants/gii-briefing';
import type {
  AgentDocument,
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
  TimelineEntry,
  TribunalCase,
} from '@/lib/types';

function latestTimestamp(...candidates: (string | undefined)[]): string {
  const parsed = candidates
    .map((c) => Date.parse(c ?? ''))
    .filter((t) => !Number.isNaN(t) && t > 0);
  if (parsed.length === 0) return new Date(0).toISOString();
  return new Date(Math.max(...parsed)).toISOString();
}

function timelineLatest(timeline: TimelineEntry[]): string | undefined {
  if (timeline.length === 0) return undefined;
  let best = timeline[0]?.at;
  for (const entry of timeline) {
    if (Date.parse(entry.at) > Date.parse(best)) best = entry.at;
  }
  return best;
}

/** Newest activity first; priority breaks ties when timestamps match or are missing. */
export function sortNeedActionsByRecency(
  items: PropertyNeedAction[],
): PropertyNeedAction[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt ?? '') || 0;
    const bTime = Date.parse(b.updatedAt ?? '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}

export function getPropertyNeedActions(
  property: Property,
  data: {
    maintenance: MaintenanceRequest[];
    inspections: Inspection[];
    rentReviews: RentReviewCase[];
    tenantSelections: TenantSelectionCase[];
    tribunalCases?: TribunalCase[];
    accounting?: PropertyAccounting;
    documents?: AgentDocument[];
  },
): PropertyNeedAction[] {
  const actions: PropertyNeedAction[] = [];
  const addr = formatPropertyFullAddress(property);
  const vacant = isPropertyVacant(property);

  for (const m of data.maintenance) {
    // Prefer propertyId. Address fallback only when the case has no propertyId — never
    // `includes`, which can attach one job to multiple properties and duplicate React keys.
    const matchesProperty =
      m.propertyId === property.id ||
      (!m.propertyId &&
        Boolean(property.address) &&
        m.propertyAddress.trim().toLowerCase() === property.address.trim().toLowerCase());
    if (!matchesProperty || isEndLeasingSpawnedMaintenance(m) || !m.requiresApproval) continue;
    actions.push({
      id: `mnt-${m.id}`,
      propertyId: property.id,
      propertyAddress: addr,
      label: 'Maintenance approval required',
      category: 'Maintenance',
      href: maintenanceDetail(m.id, fromProperty(property.id, 'Maintenance')),
      priority: m.priority === 'urgent' ? 'urgent' : 'high',
      updatedAt: latestTimestamp(
        m.updatedAt,
        timelineLatest(m.timeline),
        m.createdAt,
      ),
    });
  }

  if (!vacant) {
    for (const r of data.rentReviews.filter((x) => x.propertyId === property.id)) {
      if (isRentReviewPendingApproval(r)) {
        actions.push({
          id: `rr-${r.id}`,
          propertyId: property.id,
          propertyAddress: addr,
          label: 'Rent review approval required',
          category: 'Leasing',
          href: rentReviewDetail(r.id, fromProperty(property.id, 'Leasing')),
          priority: 'high',
          updatedAt: latestTimestamp(
            timelineLatest(r.timeline),
            r.negotiationHistory?.at(-1)?.at,
            r.dateStarted,
            r.createdAt,
          ),
        });
      }
    }
  }

  for (const t of data.tenantSelections.filter((x) => x.propertyId === property.id)) {
    if (isTenantSelectionPending(t)) {
      actions.push({
        id: `ts-${t.id}`,
        propertyId: property.id,
        propertyAddress: addr,
        label: 'Tenant application approval',
        category: 'Leasing',
        href: tenantSelectionDetail(t.id, fromProperty(property.id, 'Leasing')),
        priority: 'high',
        updatedAt: latestTimestamp(timelineLatest(t.timeline), t.createdAt),
      });
    }
  }

  if (!vacant) {
    for (const i of data.inspections.filter((x) => x.propertyId === property.id)) {
      if (i.type === 'ROUTINE' && i.status.toLowerCase().includes('scheduled')) {
        actions.push({
          id: `insp-${i.id}`,
          propertyId: property.id,
          propertyAddress: addr,
          label: 'Routine inspection due',
          category: 'Inspection',
          href: inspectionDetail(i.id, fromProperty(property.id, 'Inspection')),
          priority: 'normal',
          updatedAt: latestTimestamp(
            timelineLatest(i.timeline),
            i.scheduledAt,
            i.createdAt,
          ),
        });
      }
      if (
        i.type !== 'OPEN' &&
        i.reportStatus === 'pending' &&
        i.status.toLowerCase().includes('complete')
      ) {
        actions.push({
          id: `insp-report-${i.id}`,
          propertyId: property.id,
          propertyAddress: addr,
          label: 'Inspection report review',
          category: 'Inspection',
          href: inspectionDetail(i.id, fromProperty(property.id, 'Inspection')),
          priority: 'normal',
          updatedAt: latestTimestamp(timelineLatest(i.timeline), i.createdAt),
        });
      }
    }
  }

  if (data.accounting && data.accounting.arrearsAmount > 0) {
    actions.push({
      id: `arrears-${property.id}`,
      propertyId: property.id,
      propertyAddress: addr,
      label: `Rent arrears — $${data.accounting.arrearsAmount}`,
      category: 'Accounting',
      href: propertyFinancialsHref(property.id, { focusArrears: true }),
      priority: data.accounting.daysInArrears > 14 ? 'urgent' : 'high',
      updatedAt: new Date().toISOString(),
    });
  }

  if (property.leaseStatus === 'vacant') {
    actions.push({
      id: `vacant-${property.id}`,
      propertyId: property.id,
      propertyAddress: addr,
      label: 'Vacant property — leasing required',
      category: 'Leasing',
      href: `${propertyDetail(property.id)}?tab=Leasing&leasing=new-leasing`,
      priority: 'normal',
      updatedAt: latestTimestamp(property.createdAt),
    });
  }

  if (!vacant && property.nextRentReview) {
    const due = new Date(property.nextRentReview);
    const days = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days <= 90 && days >= 0) {
      actions.push({
        id: `lease-expiry-${property.id}`,
        propertyId: property.id,
        propertyAddress: addr,
        label: 'Lease renewal required',
        category: 'Leasing',
        href: `${propertyDetail(property.id)}?tab=Leasing&leasing=rent-review`,
        priority: days <= 30 ? 'high' : 'normal',
        updatedAt: property.nextRentReview,
      });
    }
  }

  for (const t of (data.tribunalCases ?? []).filter((x) => x.propertyId === property.id)) {
    if (t.requiresAction && t.status === 'active') {
      actions.push({
        id: `trib-${t.id}`,
        propertyId: property.id,
        propertyAddress: addr,
        label: 'Tribunal action required',
        category: 'Tribunal',
        href: tribunalDetail(t.id, fromProperty(property.id, 'Documents')),
        priority: 'urgent',
        updatedAt: latestTimestamp(t.createdAt),
      });
    }
  }

  const propertyDocs = (data.documents ?? []).filter((d) =>
    d.propertyAddress.includes(property.address.split(',')[0]),
  );
  const hasLeaseDoc = propertyDocs.some((d) => d.category === 'lease');
  if (!hasLeaseDoc && property.leaseStatus !== 'vacant') {
    actions.push({
      id: `docs-${property.id}`,
      propertyId: property.id,
      propertyAddress: addr,
      label: 'Documents missing',
      category: 'Others',
      href: `${propertyDetail(property.id)}?tab=Documents`,
      priority: 'normal',
      updatedAt: latestTimestamp(property.createdAt),
    });
  }

  return actions;
}

export function buildRemindingQueue(
  properties: Property[],
  getActions: (p: Property) => PropertyNeedAction[],
): PropertyNeedAction[] {
  const seen = new Set<string>();
  const items = properties.flatMap(getActions).filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return sortNeedActionsByRecency(items);
}
