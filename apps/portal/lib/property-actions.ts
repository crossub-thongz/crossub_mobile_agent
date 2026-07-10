import {
  inspectionDetail,
  maintenanceDetail,
  propertyDetail,
  rentReviewDetail,
  tenantSelectionDetail,
  tribunalDetail,
} from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { formatPropertyFullAddress } from '@/lib/utils';
import { isPropertyVacant } from '@/lib/property-leasing';
import { isRentReviewPendingApproval } from '@/lib/rent-review';
import { isTenantSelectionPending } from '@/lib/tenant-selection';
import type {
  AgentDocument,
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
} from '@/lib/types';

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

  for (const m of data.maintenance.filter(
    (x) => x.propertyId === property.id || x.propertyAddress.includes(property.address),
  )) {
    if (m.requiresApproval) {
      actions.push({
        id: `mnt-${m.id}`,
        propertyId: property.id,
        propertyAddress: addr,
        label: 'Maintenance approval required',
        category: 'Maintenance',
        href: maintenanceDetail(m.id, fromProperty(property.id, 'Maintenance')),
        priority: m.priority === 'urgent' ? 'urgent' : 'high',
      });
    }
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
        });
      }
      if (i.reportStatus === 'pending' && i.status.toLowerCase().includes('complete')) {
        actions.push({
          id: `insp-report-${i.id}`,
          propertyId: property.id,
          propertyAddress: addr,
          label: 'Inspection report review',
          category: 'Inspection',
          href: inspectionDetail(i.id, fromProperty(property.id, 'Inspection')),
          priority: 'normal',
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
      href: `${propertyDetail(property.id)}?tab=Accounting&focus=arrears`,
      priority: data.accounting.daysInArrears > 14 ? 'urgent' : 'high',
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
        href: tribunalDetail(t.id, fromProperty(property.id, 'Overview')),
        priority: 'urgent',
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
    });
  }

  return actions;
}

export function buildRemindingQueue(
  properties: Property[],
  getActions: (p: Property) => PropertyNeedAction[],
): PropertyNeedAction[] {
  return properties.flatMap(getActions).sort((a, b) => {
    const order = { urgent: 0, high: 1, normal: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });
}
