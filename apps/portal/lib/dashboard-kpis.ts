import { ROUTES } from '@/constants/routes';
import type {
  DashboardKpis,
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  RentReviewCase,
  TenantSelectionCase,
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
}): DashboardKpis {
  const { properties, maintenance, inspections, rentReviews, tenantSelections, accounting } =
    input;

  const occupied = properties.filter(
    (p) => p.leaseStatus === 'active' || p.leaseStatus === 'periodic' || p.leaseStatus === 'vacating',
  ).length;
  const vacant = properties.filter((p) => p.leaseStatus === 'vacant').length;

  const upcomingRentReviews = rentReviews.filter(
    (r) => r.requiresApproval || !isCompleted(r.status),
  ).length;
  const newLeasing = tenantSelections.filter((t) => t.requiresApproval).length;

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
      rentReviewHref: `${ROUTES.LEASING}?tab=rent-review`,
      newLeasingHref: `${ROUTES.LEASING}?tab=new-leasing`,
    },
    maintenance: {
      inProgress: maintenanceInProgress,
      completed: maintenanceCompleted,
      pendingApproval,
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
    },
    accounting: {
      totalRentalIncome: totalIncome,
      propertiesInArrears: inArrears.length,
      totalArrearsAmount: totalArrears,
      incomeHref: ROUTES.ACCOUNTING,
      arrearsHref: `${ROUTES.ACCOUNTING}?filter=arrears`,
    },
  };
}
