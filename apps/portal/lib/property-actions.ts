import {
  inspectionDetail,
  maintenanceDetail,
  propertyDetail,
  rentReviewDetail,
  tenantSelectionDetail,
} from '@/constants/routes';
import type {
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
} from '@/lib/types';

export function getPropertyNeedActions(
  property: Property,
  data: {
    maintenance: MaintenanceRequest[];
    inspections: Inspection[];
    rentReviews: RentReviewCase[];
    tenantSelections: TenantSelectionCase[];
    accounting?: PropertyAccounting;
  },
): PropertyNeedAction[] {
  const actions: PropertyNeedAction[] = [];
  const addr = `${property.address}, ${property.suburb}`;

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
        href: maintenanceDetail(m.id),
        priority: m.priority === 'urgent' ? 'urgent' : 'high',
      });
    }
  }

  for (const r of data.rentReviews.filter((x) => x.propertyId === property.id)) {
    if (r.requiresApproval) {
      actions.push({
        id: `rr-${r.id}`,
        propertyId: property.id,
        propertyAddress: addr,
        label: 'Rent review required',
        category: 'Leasing',
        href: rentReviewDetail(r.id),
        priority: 'high',
      });
    }
  }

  for (const t of data.tenantSelections.filter((x) => x.propertyId === property.id)) {
    if (t.requiresApproval) {
      actions.push({
        id: `ts-${t.id}`,
        propertyId: property.id,
        propertyAddress: addr,
        label: 'Tenant application approval',
        category: 'Leasing',
        href: tenantSelectionDetail(t.id),
        priority: 'high',
      });
    }
  }

  for (const i of data.inspections.filter((x) => x.propertyId === property.id)) {
    if (i.type === 'ROUTINE' && i.status.toLowerCase().includes('scheduled')) {
      actions.push({
        id: `insp-${i.id}`,
        propertyId: property.id,
        propertyAddress: addr,
        label: 'Routine inspection due',
        category: 'Inspection',
        href: inspectionDetail(i.id),
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
        href: inspectionDetail(i.id),
        priority: 'normal',
      });
    }
  }

  if (data.accounting && data.accounting.arrearsAmount > 0) {
    actions.push({
      id: `arrears-${property.id}`,
      propertyId: property.id,
      propertyAddress: addr,
      label: `Rent arrears — $${data.accounting.arrearsAmount}`,
      category: 'Accounting',
      href: `${propertyDetail(property.id)}?tab=Accounting`,
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
      href: `${propertyDetail(property.id)}?tab=Leasing`,
      priority: 'normal',
    });
  }

  if (property.nextRentReview) {
    const due = new Date(property.nextRentReview);
    const days = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days <= 90 && days >= 0) {
      actions.push({
        id: `lease-expiry-${property.id}`,
        propertyId: property.id,
        propertyAddress: addr,
        label: 'Lease / rent review upcoming',
        category: 'Leasing',
        href: `${propertyDetail(property.id)}?tab=Rent Review`,
        priority: days <= 30 ? 'high' : 'normal',
      });
    }
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
