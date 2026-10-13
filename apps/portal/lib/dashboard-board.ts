import { formatDate, formatTime } from '@/lib/format-datetime';
import { formatDashboardMoney } from '@/lib/dashboard-home';
import type {
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  PropertyNeedAction,
  RentReviewCase,
  VacatingCase,
} from '@/lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HORIZON_DAYS = 14;
const DECISION_DAYS = 7;
const ATTENTION_RENEWAL_DAYS = 14;
const VACANT_WATCH_DAYS = 30;
const MAINTENANCE_OVERDUE_DAYS = 14;
export const DASHBOARD_EVENT_PREVIEW = 3;
export const DASHBOARD_HORIZONS = [7, 14, 30] as const;

export type DashboardHorizon = (typeof DASHBOARD_HORIZONS)[number];
export type DashboardEventLane = 'decision' | 'arranged' | 'upcoming';
export type DashboardEventBadge = 'action' | 'scheduled' | 'awaiting' | 'coming-up';
export type DashboardEventAction = 'Review' | 'Approve' | 'View' | 'Schedule';

export type DashboardEvent = {
  id: string;
  lane: DashboardEventLane;
  title: string;
  address: string;
  detail: string;
  badge: DashboardEventBadge;
  badgeLabel: string;
  why: string;
  actionLabel: DashboardEventAction;
  href: string;
  sort: number;
};

export type DashboardBoard = {
  attention: {
    pending: number;
    rentReviews: { count: number; overdue: number };
    leaseRenewals: { count: number; dueSoon: number };
    otherDecisions: { count: number; urgent: number };
  };
  summary: {
    total: number;
    needAction: number;
    arranged: number;
    awaiting: number;
    awareness: number;
    toSchedule: number;
  };
  lanes: Record<DashboardEventLane, DashboardEvent[]>;
  watchlist: {
    vacantOver30: number;
    arrearsCount: number;
    arrearsAmount: number;
    delayedMaintenance: number;
    oldestMaintenanceDays: number;
  };
  activity: {
    maintenance: { count: number; onTrack: number; awaiting: number; overdue: number };
    inspections: { count: number; onTrack: number; pendingFeedback: number };
    leasing: { count: number; inProgress: number; upcoming: number };
  };
};

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysUntil(iso: string | undefined | null, now: Date): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return Math.round((startOfDay(new Date(parsed)).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

function isClosed(status: string | undefined): boolean {
  const value = (status ?? '').toLowerCase();
  return (
    value.includes('complete') ||
    value.includes('closed') ||
    value.includes('cancel') ||
    value.includes('deleted')
  );
}

function rentReviewOpen(review: RentReviewCase): boolean {
  if (review.workflowState === 'COMPLETED' || review.workflowState === 'CANCELLED') return false;
  return !isClosed(review.status);
}

function weeklyRent(amount: number | undefined): string {
  if (amount == null || amount <= 0) return '';
  return ` · Current rent ${formatDashboardMoney(amount)}/wk`;
}

function duePhrase(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due in 1 day';
  return `Due in ${days} days`;
}

function aheadPhrase(days: number, iso: string): string {
  if (days <= 0) return formatDate(iso);
  if (days === 1) return `In 1 day · ${formatDate(iso)}`;
  return `In ${days} days · ${formatDate(iso)}`;
}

function schedulePhrase(iso: string, now: Date): string {
  const days = daysUntil(iso, now);
  const time = formatTime(iso);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;
  return `${formatDate(iso)}, ${time}`;
}

function inspectionTitle(type: Inspection['type']): string {
  if (type === 'OPEN') return 'Open Inspection';
  if (type === 'INGOING') return 'Ingoing Inspection';
  if (type === 'OUTGOING') return 'Outgoing Inspection';
  return 'Routine Inspection';
}

function decisionBadge(): Pick<DashboardEvent, 'badge' | 'badgeLabel'> {
  return { badge: 'action', badgeLabel: 'Action Required' };
}

function awaitingBadge(): Pick<DashboardEvent, 'badge' | 'badgeLabel'> {
  return { badge: 'awaiting', badgeLabel: 'Awaiting Response' };
}

function comingUpBadge(): Pick<DashboardEvent, 'badge' | 'badgeLabel'> {
  return { badge: 'coming-up', badgeLabel: 'Coming Up' };
}

function reviewTenantReplied(review: RentReviewCase): boolean {
  if (
    review.tenantResponse === 'accepted' ||
    review.tenantResponse === 'rejected' ||
    review.tenantResponse === 'counter' ||
    review.tenantResponse === 'vacating'
  ) {
    return true;
  }
  return (
    review.workflowState === 'TENANT_ACCEPTED' ||
    review.workflowState === 'TENANT_REJECTED' ||
    review.workflowState === 'NEGOTIATION'
  );
}

function reviewAwaitingTenant(review: RentReviewCase): boolean {
  if (reviewTenantReplied(review)) return false;
  return review.workflowState === 'TENANT_NOTIFIED' || review.tenantResponse === 'pending';
}

export function buildDashboardBoard(input: {
  now?: Date;
  properties: Property[];
  rentReviews: RentReviewCase[];
  inspections: Inspection[];
  maintenance: MaintenanceRequest[];
  vacating: VacatingCase[];
  accounting: PropertyAccounting[];
  needActionItems: PropertyNeedAction[];
  rentReviewHref: (id: string) => string;
  inspectionHref: (id: string) => string;
  vacatingHref: (id: string) => string;
  maintenanceHref: (id: string) => string;
  leasingInProgress?: number;
  horizonDays?: DashboardHorizon;
  fullService?: boolean;
}): DashboardBoard {
  const now = input.now ?? new Date();
  const horizon = input.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const fullService = input.fullService ?? true;
  const withinHorizon = (days: number) => days <= horizon;
  const openReviews = input.rentReviews.filter(rentReviewOpen);
  const overdueReviews = openReviews.filter((review) => {
    const days = daysUntil(review.reviewDue, now);
    return days != null && days < 0;
  });

  const occupied = input.properties.filter(
    (property) => property.leaseStatus === 'active' || property.leaseStatus === 'periodic',
  );
  const renewals = occupied.flatMap((property) => {
    const days = daysUntil(property.leaseEnd, now);
    if (days == null || days > 90) return [];
    return [{ property, days }];
  });
  const dueSoonRenewals = renewals.filter((row) => row.days <= ATTENTION_RENEWAL_DAYS);

  const otherItems = input.needActionItems.filter(
    (item) => !item.id.startsWith('rr-') && !item.id.startsWith('lease-expiry-'),
  );
  const urgentOther = otherItems.filter((item) => item.priority === 'urgent');

  const decision: DashboardEvent[] = [];
  const arranged: DashboardEvent[] = [];
  const upcoming: DashboardEvent[] = [];
  const reviewPropertyIds = new Set<string>();

  for (const review of openReviews) {
    const days = daysUntil(review.reviewDue || review.leaseEnd, now);
    if (days == null || !withinHorizon(days)) continue;
    const address = review.propertyAddress;
    const href = input.rentReviewHref(review.id);
    if (reviewTenantReplied(review) || review.requiresApproval || days <= DECISION_DAYS) {
      reviewPropertyIds.add(review.propertyId);
      decision.push({
        id: `rr-${review.id}`,
        lane: 'decision',
        title: 'Rent Review',
        address,
        detail: `${duePhrase(days)}${weeklyRent(review.currentRent)}`,
        why: reviewTenantReplied(review)
          ? 'The tenant has replied and is waiting on your decision.'
          : review.requiresApproval
            ? 'A rent change is ready for your approval.'
            : 'This review is due and still needs a decision.',
        ...decisionBadge(),
        actionLabel: fullService && review.requiresApproval ? 'Approve' : 'Review',
        href,
        sort: days,
      });
      continue;
    }
    if (reviewAwaitingTenant(review)) {
      reviewPropertyIds.add(review.propertyId);
      arranged.push({
        id: `rr-wait-${review.id}`,
        lane: 'arranged',
        title: 'Rent Review',
        address,
        detail: duePhrase(days),
        why: 'Sent to the tenant. No reply yet.',
        ...awaitingBadge(),
        actionLabel: 'View',
        href,
        sort: days,
      });
      continue;
    }
    upcoming.push({
      id: `rr-up-${review.id}`,
      lane: 'upcoming',
      title: 'Rent Review',
      address,
      detail: aheadPhrase(days, review.reviewDue || review.leaseEnd),
      why: 'Coming up. No decision is needed yet.',
      ...comingUpBadge(),
      actionLabel: 'View',
      href,
      sort: days,
    });
  }

  for (const job of input.maintenance) {
    if (!job.requiresApproval || isClosed(job.status)) continue;
    const due = job.quoteExpiry || job.updatedAt;
    const days = due ? daysUntil(due, now) : 0;
    if (days == null || !withinHorizon(days)) continue;
    decision.push({
      id: `mq-${job.id}`,
      lane: 'decision',
      title: 'Maintenance Quote',
      address: job.propertyAddress,
      detail: due ? duePhrase(days) : 'Quote ready to review',
      why: 'A quote is waiting for your decision.',
      ...decisionBadge(),
      actionLabel: fullService ? 'Approve' : 'Review',
      href: input.maintenanceHref(job.id),
      sort: days,
    });
  }

  for (const row of renewals) {
    if (!withinHorizon(row.days) || !row.property.leaseEnd) continue;
    if (reviewPropertyIds.has(row.property.id)) continue;
    const address = [row.property.address, row.property.suburb].filter(Boolean).join(', ');
    const href = `/properties/${row.property.id}`;
    if (row.days <= DECISION_DAYS) {
      decision.push({
        id: `lease-${row.property.id}`,
        lane: 'decision',
        title: 'Lease Renewal',
        address,
        detail: `${duePhrase(row.days)} · Current lease ends`,
        why: 'The lease is ending and no renewal has been finalised.',
        ...decisionBadge(),
        actionLabel: 'Review',
        href,
        sort: row.days,
      });
      continue;
    }
    upcoming.push({
      id: `expiry-${row.property.id}`,
      lane: 'upcoming',
      title: 'Lease Expiry',
      address,
      detail: aheadPhrase(row.days, row.property.leaseEnd),
      why: 'For awareness. No renewal has been finalised yet.',
      ...comingUpBadge(),
      actionLabel: 'View',
      href,
      sort: row.days,
    });
  }

  let toSchedule = 0;
  for (const inspection of input.inspections) {
    if (isClosed(inspection.status)) continue;
    if (inspection.scheduledAt) {
      const days = daysUntil(inspection.scheduledAt, now);
      if (days == null || days < 0 || !withinHorizon(days)) continue;
      arranged.push({
        id: `insp-${inspection.id}`,
        lane: 'arranged',
        title: inspectionTitle(inspection.type),
        address: inspection.propertyAddress,
        detail: schedulePhrase(inspection.scheduledAt, now),
        why: inspection.inspector
          ? `Already booked and assigned to ${inspection.inspector}.`
          : 'Already booked.',
        badge: 'scheduled',
        badgeLabel: 'Scheduled',
        actionLabel: 'View',
        href: input.inspectionHref(inspection.id),
        sort: days,
      });
      continue;
    }
    const due = inspection.nextDueDate || inspection.moveInDate;
    const days = daysUntil(due, now);
    if (days == null || days < 0 || !withinHorizon(days) || !due) continue;
    toSchedule += 1;
    upcoming.push({
      id: `insp-due-${inspection.id}`,
      lane: 'upcoming',
      title: inspectionTitle(inspection.type),
      address: inspection.propertyAddress,
      detail: aheadPhrase(days, due),
      why: 'Due in this window and not booked yet.',
      ...comingUpBadge(),
      actionLabel: fullService ? 'View' : 'Schedule',
      href: input.inspectionHref(inspection.id),
      sort: days,
    });
  }

  for (const vacating of input.vacating) {
    if (isClosed(vacating.apiStatus)) continue;
    const days = daysUntil(vacating.vacateDate, now);
    if (days == null || days < 0 || !withinHorizon(days)) continue;
    upcoming.push({
      id: `vac-${vacating.id}`,
      lane: 'upcoming',
      title: 'Vacate Date',
      address: vacating.propertyAddress,
      detail: aheadPhrase(days, vacating.vacateDate),
      why: 'The vacate date is approaching.',
      ...comingUpBadge(),
      actionLabel: 'View',
      href: input.vacatingHref(vacating.id),
      sort: days,
    });
  }

  decision.sort((a, b) => a.sort - b.sort);
  arranged.sort((a, b) => a.sort - b.sort);
  upcoming.sort((a, b) => a.sort - b.sort);

  const vacantOver30 = input.properties.filter((property) => {
    if (property.leaseStatus !== 'vacant') return false;
    const days = daysUntil(property.vacateDate || property.leaseEnd, now);
    return days != null && -days > VACANT_WATCH_DAYS;
  }).length;

  const arrears = input.accounting.filter((row) => row.arrearsAmount > 0);
  const openMaintenance = input.maintenance.filter((job) => !isClosed(job.status));
  const delayed = openMaintenance.flatMap((job) => {
    const age = job.createdAt ? daysUntil(job.createdAt, now) : null;
    if (age == null || -age <= MAINTENANCE_OVERDUE_DAYS) return [];
    return [-age];
  });

  const openInspections = input.inspections.filter((inspection) => !isClosed(inspection.status));
  const pendingFeedback = openInspections.filter(
    (inspection) => inspection.reportStatus === 'uploaded' || inspection.awaitingAgentPayment,
  ).length;

  return {
    attention: {
      pending: openReviews.length + renewals.length + otherItems.length,
      rentReviews: { count: openReviews.length, overdue: overdueReviews.length },
      leaseRenewals: { count: renewals.length, dueSoon: dueSoonRenewals.length },
      otherDecisions: { count: otherItems.length, urgent: urgentOther.length },
    },
    summary: {
      total: decision.length + arranged.length + upcoming.length,
      needAction: decision.length,
      arranged: arranged.filter((event) => event.badge === 'scheduled').length,
      awaiting: arranged.filter((event) => event.badge === 'awaiting').length,
      awareness: upcoming.length,
      toSchedule,
    },
    lanes: { decision, arranged, upcoming },
    watchlist: {
      vacantOver30,
      arrearsCount: arrears.length,
      arrearsAmount: arrears.reduce((sum, row) => sum + row.arrearsAmount, 0),
      delayedMaintenance: delayed.length,
      oldestMaintenanceDays: delayed.length > 0 ? Math.max(...delayed) : 0,
    },
    activity: {
      maintenance: {
        count: openMaintenance.length,
        onTrack: Math.max(0, openMaintenance.length - delayed.length),
        awaiting: openMaintenance.filter((job) => job.requiresApproval).length,
        overdue: delayed.length,
      },
      inspections: {
        count: openInspections.length,
        onTrack: Math.max(0, openInspections.length - pendingFeedback),
        pendingFeedback,
      },
      leasing: {
        count: (input.leasingInProgress ?? 0) + openReviews.length,
        inProgress: input.leasingInProgress ?? openReviews.length,
        upcoming: dueSoonRenewals.length,
      },
    },
  };
}
