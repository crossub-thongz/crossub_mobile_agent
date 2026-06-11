import { ROUTES } from '@/constants/routes';
import type {
  DashboardKpis,
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
} from '@/lib/types';

function isCompleted(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('complete') || s.includes('closed') || s.includes('sent');
}

function isInProgress(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s.includes('progress') ||
    s.includes('approval') ||
    s.includes('scheduled') ||
    s.includes('pending') ||
    s.includes('quote')
  );
}

export function buildDashboardKpis(input: {
  properties: Property[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  tenantSelections: TenantSelectionCase[];
  accounting: PropertyAccounting[];
  tribunalCases: TribunalCase[];
}): DashboardKpis {
  const {
    properties,
    maintenance,
    inspections,
    rentReviews,
    tenantSelections,
    accounting,
    tribunalCases,
  } = input;

  const occupied = properties.filter(
    (p) => p.leaseStatus === 'active' || p.leaseStatus === 'periodic' || p.leaseStatus === 'vacating',
  ).length;
  const vacant = properties.filter((p) => p.leaseStatus === 'vacant').length;

  const upcomingRentReviews = rentReviews.filter(
    (r) => r.requiresApproval || !isCompleted(r.status),
  ).length;
  const newLeasing = tenantSelections.filter((t) => t.requiresApproval).length;
  const leaseRenewals = properties.filter((p) => {
    if (!p.nextRentReview) return false;
    const days = (new Date(p.nextRentReview).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 90 && days >= 0;
  }).length;

  const maintenanceInProgress = maintenance.filter((m) => isInProgress(m.status)).length;
  const maintenanceCompleted = maintenance.filter((m) => isCompleted(m.status)).length;
  const pendingApproval = maintenance.filter((m) => m.requiresApproval).length;

  const openInspections = inspections.filter((i) => i.type === 'OPEN');
  const ingoing = inspections.filter((i) => i.type === 'INGOING');
  const outgoing = inspections.filter((i) => i.type === 'OUTGOING');
  const routine = inspections.filter((i) => i.type === 'ROUTINE');

  const totalIncome = accounting.reduce((s, a) => s + a.rentPaidYtd, 0);
  const inArrears = accounting.filter((a) => a.arrearsAmount > 0);
  const totalArrears = inArrears.reduce((s, a) => s + a.arrearsAmount, 0);

  return {
    properties: {
      total: properties.length,
      occupied,
      vacant,
      href: ROUTES.PROPERTIES,
    },
    leasing: {
      upcomingRentReviews,
      newLeasing,
      leaseRenewals,
      href: ROUTES.LEASING,
      rentReviewHref: `${ROUTES.LEASING}?tab=rent-review`,
      newLeasingHref: `${ROUTES.LEASING}?tab=new-leasing`,
      leaseRenewalHref: `${ROUTES.LEASING}?tab=rent-review`,
    },
    maintenance: {
      inProgress: maintenanceInProgress,
      completed: maintenanceCompleted,
      pendingApproval,
      href: ROUTES.MAINTENANCE,
      inProgressHref: `${ROUTES.MAINTENANCE}?filter=progress`,
      completedHref: `${ROUTES.MAINTENANCE}?filter=completed`,
      approvalHref: `${ROUTES.MAINTENANCE}?filter=approval`,
    },
    inspection: {
      openPending: openInspections.filter((i) => !isCompleted(i.status)).length,
      openCompleted: openInspections.filter((i) => isCompleted(i.status)).length,
      ingoingPending: ingoing.filter((i) => !isCompleted(i.status)).length,
      ingoingCompleted: ingoing.filter((i) => isCompleted(i.status)).length,
      outgoingPending: outgoing.filter((i) => !isCompleted(i.status)).length,
      outgoingCompleted: outgoing.filter((i) => isCompleted(i.status)).length,
      routinePending: routine.filter((i) => !isCompleted(i.status)).length,
      routineCompleted: routine.filter((i) => isCompleted(i.status)).length,
      openHref: `${ROUTES.INSPECTIONS}?type=OPEN`,
      ingoingHref: `${ROUTES.INSPECTIONS}?type=INGOING`,
      outgoingHref: `${ROUTES.INSPECTIONS}?type=OUTGOING`,
      routineHref: `${ROUTES.INSPECTIONS}?type=ROUTINE`,
      href: ROUTES.INSPECTIONS,
    },
    accounting: {
      totalRentalIncome: totalIncome,
      propertiesInArrears: inArrears.length,
      totalArrearsAmount: totalArrears,
      outstandingBills: accounting.reduce((s, a) => s + Math.max(0, a.rentOutstanding), 0),
      href: ROUTES.ACCOUNTING,
      incomeHref: ROUTES.ACCOUNTING,
      arrearsHref: `${ROUTES.ACCOUNTING}?filter=arrears`,
    },
    tribunal: {
      active: tribunalCases.filter((c) => c.status === 'active').length,
      closed: tribunalCases.filter((c) => c.status === 'closed').length,
      actionRequired: tribunalCases.filter((c) => c.requiresAction && c.status === 'active')
        .length,
      href: ROUTES.TRIBUNAL,
      activeHref: `${ROUTES.TRIBUNAL}?filter=active`,
      closedHref: `${ROUTES.TRIBUNAL}?filter=closed`,
      actionHref: ROUTES.TASKS,
    },
  };
}
