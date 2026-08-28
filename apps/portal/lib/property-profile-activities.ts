import { jobCaseFocusHref } from '@/lib/billing/job-case-focus';
import type { AgentBillingCharge } from '@/lib/crossub-api/agent-billing-client';
import { dayKey, formatDate, formatTime } from '@/lib/format-datetime';
import { agentNotificationDisplay } from '@/lib/notification-activity';
import type { PropertyPortalAccounting, PropertyPortalLedgerEntry } from '@/lib/property-registry-api';
import type {
  AgentNotification,
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  RentReviewCase,
  TenantSelectionCase,
  TimelineEntry,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { formatCurrency, formatPropertyFullAddress } from '@/lib/utils';

export type PropertyProfileActivityCategory =
  | 'maintenance'
  | 'inspection'
  | 'leasing'
  | 'financial'
  | 'message';

export type PropertyProfileActivityFilter = 'all' | PropertyProfileActivityCategory;

export type PropertyProfileActivity = {
  id: string;
  at: string;
  atSort: number;
  timeLabel: string;
  dayKey: string;
  title: string;
  subtitle?: string;
  /** Linked job case reference, e.g. II-6714440. */
  caseRef?: string;
  actorLabel: string;
  category: PropertyProfileActivityCategory;
  href?: string;
};

export const PROPERTY_PROFILE_ACTIVITY_FILTERS: {
  id: PropertyProfileActivityFilter;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'leasing', label: 'Leasing' },
  { id: 'financial', label: 'Financial' },
  { id: 'message', label: 'Messages' },
];

function atSortValue(at: string): number {
  const parsed = Date.parse(at);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeAddressKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function addressesMatch(a: string, b: string): boolean {
  const left = normalizeAddressKey(a);
  const right = normalizeAddressKey(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function formatPropertyProfileActivityDayLabel(
  key: string,
  now = new Date(),
): string {
  const today = dayKey(now);
  if (key === today) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday)) return 'Yesterday';
  return formatDate(`${key}T12:00:00`);
}

function formatActorLabel(
  entry: Pick<TimelineEntry, 'actor' | 'actorRole'>,
  tenantName?: string,
): string {
  if (entry.actorRole === 'tenant') {
    const name = entry.actor?.trim();
    if (name && !/^tenant$/i.test(name)) return `Tenant (${name})`;
    return tenantName ? `Tenant (${tenantName})` : 'Tenant';
  }
  if (entry.actorRole === 'contractor') {
    return entry.actor?.trim() || 'Contractor';
  }
  if (entry.actorRole === 'agent') {
    return entry.actor?.trim() || 'Agent';
  }
  if (entry.actorRole === 'crossub' || entry.actorRole === 'system') {
    return 'CROS System';
  }
  return entry.actor?.trim() || 'CROS System';
}

function pushTimelineActivities(
  rows: PropertyProfileActivity[],
  input: {
    prefix: string;
    category: PropertyProfileActivityCategory;
    timeline: TimelineEntry[];
    href?: string;
    tenantName?: string;
  },
) {
  for (const entry of input.timeline) {
    if (!entry.at?.trim() || !entry.title?.trim()) continue;
    rows.push({
      id: `${input.prefix}-${entry.id}`,
      at: entry.at,
      atSort: atSortValue(entry.at),
      timeLabel: formatTime(entry.at),
      dayKey: dayKey(entry.at),
      title: entry.title,
      subtitle: entry.detail?.trim() || undefined,
      actorLabel: formatActorLabel(entry, input.tenantName),
      category: input.category,
      href: input.href,
    });
  }
}

function rentPeriodSubtitle(entry: {
  amount: number;
  description?: string;
  dueDate: string;
  paidDate?: string;
}): string {
  const description = entry.description?.trim();
  if (description) {
    return `${formatCurrency(entry.amount)} · ${description}`;
  }
  return `${formatCurrency(entry.amount)} for rent (${formatDate(entry.dueDate)})`;
}

const BILLING_SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Management fee',
  letting_fee: 'Letting fee',
};

function billingServiceLabel(serviceType: string): string {
  return BILLING_SERVICE_LABEL[serviceType] ?? serviceType.replace(/_/g, ' ');
}

function billingChargeSubtitle(
  charge: AgentBillingCharge,
  options?: { includeCaseRef?: boolean },
): string {
  const parts: string[] = [billingServiceLabel(charge.serviceType)];
  if (charge.includedInAllowance || charge.status === 'included') {
    parts.push('Included in allowance');
  } else if (charge.amount > 0) {
    parts.push(formatCurrency(charge.amount));
  }
  if (options?.includeCaseRef !== false) {
    const jobCaseName = charge.jobCaseName?.trim();
    if (jobCaseName) parts.push(jobCaseName);
  }
  return parts.join(' · ');
}

function resolveBillingChargeCaseLink(
  charge: AgentBillingCharge,
  propertyId: string,
  inspections: Inspection[],
  inspectionHref: (id: string) => string,
  tribunalHref: (id: string) => string,
  financialsHref?: string,
): { href?: string; caseRef?: string } {
  const caseRef = charge.jobCaseName?.trim() || undefined;
  const jobCaseId = charge.jobCaseId?.trim();

  if (charge.serviceType === 'tribunal' && jobCaseId) {
    return { href: tribunalHref(jobCaseId), caseRef: caseRef ?? jobCaseId };
  }

  if (jobCaseId) {
    const inspection = inspections.find((row) => row.id === jobCaseId);
    if (inspection) {
      return {
        href: inspectionHref(inspection.id),
        caseRef: caseRef ?? inspection.trackingNumber,
      };
    }
  }

  if (caseRef) {
    const byTracking = inspections.find((row) => row.trackingNumber === caseRef);
    if (byTracking) {
      return { href: inspectionHref(byTracking.id), caseRef };
    }
  }

  const fallback =
    jobCaseFocusHref({
      propertyId: charge.propertyId ?? propertyId,
      jobCaseId: charge.jobCaseId,
      jobCaseName: charge.jobCaseName,
      serviceType: charge.serviceType,
    }) ?? financialsHref;

  return { href: fallback, caseRef };
}

function pushBillingChargeActivities(
  rows: PropertyProfileActivity[],
  charges: AgentBillingCharge[],
  propertyId: string,
  inspections: Inspection[],
  inspectionHref: (id: string) => string,
  tribunalHref: (id: string) => string,
  financialsHref?: string,
): Set<string> {
  const refundedJobCaseIds = new Set<string>();

  for (const charge of charges) {
    if (charge.propertyId && charge.propertyId !== propertyId) continue;

    const { href, caseRef } = resolveBillingChargeCaseLink(
      charge,
      propertyId,
      inspections,
      inspectionHref,
      tribunalHref,
      financialsHref,
    );
    const subtitle = billingChargeSubtitle(charge, { includeCaseRef: false });
    const paidAt = charge.paidAt?.trim();
    if (paidAt && charge.status !== 'void' && charge.status !== 'included' && !charge.includedInAllowance) {
      rows.push({
        id: `billing-paid-${charge.id}`,
        at: paidAt,
        atSort: atSortValue(paidAt),
        timeLabel: formatTime(paidAt),
        dayKey: dayKey(paidAt),
        title: 'Platform fee paid',
        subtitle,
        caseRef,
        actorLabel: charge.createdByName?.trim() || 'Agent',
        category: 'financial',
        href,
      });
    }

    const refundedAt =
      charge.refundedAt?.trim() ||
      (charge.status === 'refunded' ? charge.voidedAt?.trim() : undefined);
    if (refundedAt) {
      const jobCaseId = charge.jobCaseId?.trim();
      if (jobCaseId) refundedJobCaseIds.add(jobCaseId);
      const reason = charge.voidReason?.trim();
      rows.push({
        id: `billing-refund-${charge.id}`,
        at: refundedAt,
        atSort: atSortValue(refundedAt),
        timeLabel: formatTime(refundedAt),
        dayKey: dayKey(refundedAt),
        title: 'Platform fee refunded',
        subtitle: reason ? `${subtitle} · ${reason}` : subtitle,
        caseRef,
        actorLabel: 'CROS System',
        category: 'financial',
        href,
      });
    }
  }

  return refundedJobCaseIds;
}

function pushInspectionRefundFallbackActivities(
  rows: PropertyProfileActivity[],
  inspections: Inspection[],
  propertyId: string,
  refundedJobCaseIds: Set<string>,
  inspectionHref: (id: string) => string,
) {
  for (const inspection of inspections) {
    if (inspection.propertyId !== propertyId) continue;
    if (inspection.unacceptedRefunded !== true) continue;
    if (refundedJobCaseIds.has(inspection.id)) continue;

    const timelineRefund = [...inspection.timeline]
      .reverse()
      .find((entry) => /refund/i.test(`${entry.title} ${entry.detail ?? ''}`));
    const at =
      timelineRefund?.at?.trim() ||
      inspection.completedAt?.trim() ||
      inspection.scheduledAt?.trim();
    if (!at) continue;

    const typeLabel =
      inspection.type === 'ROUTINE'
        ? 'Routine inspection'
        : `${inspection.type.charAt(0)}${inspection.type.slice(1).toLowerCase()} inspection`;

    rows.push({
      id: `insp-refund-${inspection.id}`,
      at,
      atSort: atSortValue(at),
      timeLabel: formatTime(at),
      dayKey: dayKey(at),
      title: 'Platform fee refunded',
      subtitle: `${typeLabel} · Inspector not confirmed within 48 hours`,
      caseRef: inspection.trackingNumber,
      actorLabel: 'CROS System',
      category: 'financial',
      href: inspectionHref(inspection.id),
    });
  }
}

function pushRentPaymentActivities(
  rows: PropertyProfileActivity[],
  ledger: Array<PropertyPortalLedgerEntry | NonNullable<PropertyAccounting['rentIncomeHistory']>[number]>,
  href?: string,
) {
  for (const entry of ledger) {
    const paidAt = entry.paidDate?.trim();
    if (!paidAt) continue;
    rows.push({
      id: `rent-${entry.id}`,
      at: paidAt,
      atSort: atSortValue(paidAt),
      timeLabel: formatTime(paidAt),
      dayKey: dayKey(paidAt),
      title: 'Rent payment received',
      subtitle: rentPeriodSubtitle(entry),
      actorLabel: 'Bank Feed',
      category: 'financial',
      href,
    });
  }
}

function notificationCategory(href: string, taskType?: string): PropertyProfileActivityCategory {
  const haystack = `${href} ${taskType ?? ''}`.toLowerCase();
  if (haystack.includes('maintenance')) return 'maintenance';
  if (haystack.includes('inspection')) return 'inspection';
  if (
    haystack.includes('rent-review') ||
    haystack.includes('leasing') ||
    haystack.includes('tenant-selection') ||
    haystack.includes('vacating')
  ) {
    return 'leasing';
  }
  if (haystack.includes('accounting') || haystack.includes('invoice')) return 'financial';
  if (haystack.includes('message')) return 'message';
  return 'leasing';
}

export function buildPropertyProfileActivities(input: {
  property: Property;
  propertyId: string;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
  notifications: AgentNotification[];
  accounting?: PropertyAccounting | null;
  portalAccounting?: PropertyPortalAccounting | null;
  maintenanceHref: (id: string) => string;
  inspectionHref: (id: string) => string;
  rentReviewHref: (id: string) => string;
  tenantSelectionHref: (id: string) => string;
  vacatingHref: (id: string) => string;
  tribunalHref: (id: string) => string;
  financialsHref?: string;
  billingCharges?: AgentBillingCharge[];
}): PropertyProfileActivity[] {
  const rows: PropertyProfileActivity[] = [];
  const propertyAddress = formatPropertyFullAddress(input.property);
  const tenantName =
    input.property.tenantName?.trim() ||
    input.accounting?.tenantName?.trim() ||
    undefined;

  for (const job of input.maintenance) {
    if (job.propertyId !== input.propertyId) continue;
    pushTimelineActivities(rows, {
      prefix: `mnt-${job.id}`,
      category: 'maintenance',
      timeline: job.timeline,
      href: input.maintenanceHref(job.id),
      tenantName,
    });
    if (job.createdAt) {
      rows.push({
        id: `mnt-created-${job.id}`,
        at: job.createdAt,
        atSort: atSortValue(job.createdAt),
        timeLabel: formatTime(job.createdAt),
        dayKey: dayKey(job.createdAt),
        title: 'Maintenance job created',
        subtitle: job.title,
        actorLabel: tenantName ? `Tenant (${tenantName})` : 'Tenant',
        category: 'maintenance',
        href: input.maintenanceHref(job.id),
      });
    }
  }

  for (const inspection of input.inspections) {
    if (inspection.propertyId !== input.propertyId) continue;
    pushTimelineActivities(rows, {
      prefix: `insp-${inspection.id}`,
      category: 'inspection',
      timeline: inspection.timeline,
      href: input.inspectionHref(inspection.id),
      tenantName,
    });
    if (inspection.scheduledAt) {
      const inspector = inspection.inspector?.trim();
      rows.push({
        id: `insp-scheduled-${inspection.id}`,
        at: inspection.scheduledAt,
        atSort: atSortValue(inspection.scheduledAt),
        timeLabel: formatTime(inspection.scheduledAt),
        dayKey: dayKey(inspection.scheduledAt),
        title: `${inspection.type === 'ROUTINE' ? 'Routine' : inspection.type} inspection scheduled`,
        subtitle: [
          formatDate(inspection.scheduledAt),
          formatTime(inspection.scheduledAt),
          inspector ? `Inspector: ${inspector}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        actorLabel: 'CROS System',
        category: 'inspection',
        href: input.inspectionHref(inspection.id),
      });
    }
  }

  for (const review of input.rentReviews) {
    if (review.propertyId !== input.propertyId) continue;
    pushTimelineActivities(rows, {
      prefix: `rr-${review.id}`,
      category: 'leasing',
      timeline: review.timeline,
      href: input.rentReviewHref(review.id),
      tenantName,
    });
    if (review.tenantResponse === 'accepted' && review.completedDate) {
      const rentAmount = review.agreedRent ?? review.suggestedRent;
      rows.push({
        id: `rr-accepted-${review.id}`,
        at: review.completedDate,
        atSort: atSortValue(review.completedDate),
        timeLabel: formatTime(review.completedDate),
        dayKey: dayKey(review.completedDate),
        title: 'Tenant accepted rent increase',
        subtitle: rentAmount
          ? `Rent increased to ${formatCurrency(rentAmount)}/week`
          : undefined,
        actorLabel: 'CROS System',
        category: 'leasing',
        href: input.rentReviewHref(review.id),
      });
    }
  }

  for (const selection of input.tenantSelections) {
    if (selection.propertyId !== input.propertyId) continue;
    pushTimelineActivities(rows, {
      prefix: `ts-${selection.id}`,
      category: 'leasing',
      timeline: selection.timeline,
      href: input.tenantSelectionHref(selection.id),
      tenantName: selection.applicantName,
    });
  }

  for (const vacating of input.vacatingCases) {
    if (vacating.propertyId !== input.propertyId) continue;
    pushTimelineActivities(rows, {
      prefix: `vac-${vacating.id}`,
      category: 'leasing',
      timeline: vacating.timeline,
      href: input.vacatingHref(vacating.id),
      tenantName,
    });
  }

  for (const tribunal of input.tribunalCases) {
    if (tribunal.propertyId !== input.propertyId) continue;
    if (tribunal.createdAt) {
      rows.push({
        id: `tri-created-${tribunal.id}`,
        at: tribunal.createdAt,
        atSort: atSortValue(tribunal.createdAt),
        timeLabel: formatTime(tribunal.createdAt),
        dayKey: dayKey(tribunal.createdAt),
        title: 'Tribunal case opened',
        subtitle: tribunal.matter,
        actorLabel: 'CROS System',
        category: 'leasing',
        href: input.tribunalHref(tribunal.id),
      });
    }
  }

  const ledger =
    input.portalAccounting?.ledger ??
    input.accounting?.rentIncomeHistory?.map((entry) => ({
      id: entry.id,
      dueDate: entry.dueDate,
      paidDate: entry.paidDate,
      amount: entry.amount,
      description: entry.description,
    })) ??
    [];
  pushRentPaymentActivities(rows, ledger, input.financialsHref);

  const refundedJobCaseIds = pushBillingChargeActivities(
    rows,
    input.billingCharges ?? [],
    input.propertyId,
    input.inspections,
    input.inspectionHref,
    input.tribunalHref,
    input.financialsHref,
  );
  pushInspectionRefundFallbackActivities(
    rows,
    input.inspections,
    input.propertyId,
    refundedJobCaseIds,
    input.inspectionHref,
  );

  for (const notification of input.notifications) {
    if (!addressesMatch(notification.propertyAddress, propertyAddress)) continue;
    const display = agentNotificationDisplay(notification);
    const at = notification.at;
    if (!at) continue;
    rows.push({
      id: `notif-${notification.id}`,
      at,
      atSort: atSortValue(at),
      timeLabel: formatTime(at),
      dayKey: dayKey(at),
      title: notification.title?.trim() || display.title,
      subtitle: display.body || notification.actionRequired || undefined,
      actorLabel: 'CROS System',
      category: notificationCategory(notification.href, notification.taskType),
      href: notification.href,
    });
  }

  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return row.atSort > 0;
    })
    .sort((a, b) => b.atSort - a.atSort);
}

export function filterPropertyProfileActivities(
  rows: PropertyProfileActivity[],
  filter: PropertyProfileActivityFilter,
): PropertyProfileActivity[] {
  if (filter === 'all') return rows;
  return rows.filter((row) => row.category === filter);
}

export function groupPropertyProfileActivitiesByDay(
  rows: PropertyProfileActivity[],
  now = new Date(),
): { dayKey: string; label: string; items: PropertyProfileActivity[] }[] {
  const groups = new Map<string, PropertyProfileActivity[]>();
  for (const row of rows) {
    const bucket = groups.get(row.dayKey) ?? [];
    bucket.push(row);
    groups.set(row.dayKey, bucket);
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({
      dayKey: key,
      label: formatPropertyProfileActivityDayLabel(key, now),
      items: items.sort((a, b) => b.atSort - a.atSort),
    }));
}
