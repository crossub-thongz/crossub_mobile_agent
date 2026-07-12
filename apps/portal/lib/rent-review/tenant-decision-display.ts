import { deriveNewLeaseStartDate } from '@/lib/rent-review/agent-decision-scheduling';
import {
  isoDateAddDays,
  leaseEndFromFixedTermWeeks,
  resolveRentIncreaseAnchor,
  RENT_REVIEW_ADVANCE_ORDER_DAYS,
  toDateOnly,
} from '@/lib/rent-review/scheduling';
import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatDate } from '@/lib/utils';

const DAY_MS = 24 * 60 * 60 * 1000;

function auditHas(detail: RentReviewWorkflowDetail, kind: string): boolean {
  return detail.auditLog.some((e) => e.kind === kind);
}

function auditAt(detail: RentReviewWorkflowDetail, kind: string): string | null {
  const hit = [...detail.auditLog].reverse().find((e) => e.kind === kind);
  return hit?.at ?? null;
}

export function isTenantAccepted(detail: RentReviewWorkflowDetail): boolean {
  return (
    detail.workflowState === 'tenant_accepted' ||
    detail.workflowState === 'accounting' ||
    detail.workflowState === 'completed' ||
    auditHas(detail, 'tenant_accepted_response') ||
    auditHas(detail, 'agent_accepted_tenant_counter')
  );
}

export function isTenantDeclined(detail: RentReviewWorkflowDetail): boolean {
  return detail.workflowState === 'tenant_rejected' || auditHas(detail, 'tenant_rejected_response');
}

/** Tenant declined with a recorded move-out date — vacate path is complete (no accounting). */
export function isTenantVacatePathComplete(detail: RentReviewWorkflowDetail): boolean {
  return isTenantDeclined(detail) && detail.tenantMoveOutDate != null;
}

export function isPreferredRenewalFixed(detail: RentReviewWorkflowDetail): boolean {
  return detail.preferredLeaseType === 'fixed' || detail.newAgreementEnd != null;
}

/** New lease start/end apply only when the agent chose a fixed-term renewal. */
export function resolveAcceptedNewLeaseDates(detail: RentReviewWorkflowDetail): {
  newLeaseStart: string | null;
  newLeaseEnd: string | null;
} {
  if (detail.preferredLeaseType !== 'fixed' && !detail.newAgreementEnd) {
    return { newLeaseStart: null, newLeaseEnd: null };
  }

  const derivedStart = deriveNewLeaseStartDate(detail);
  const start = toDateOnly(detail.newAgreementStart) ?? derivedStart;
  let end = toDateOnly(detail.newAgreementEnd);
  if (!end && start && detail.fixedTermWeeks != null && detail.fixedTermWeeks > 0) {
    end = leaseEndFromFixedTermWeeks(start, detail.fixedTermWeeks);
  }
  return { newLeaseStart: start, newLeaseEnd: end };
}

/** Weeks between two ISO dates (inclusive span, minimum 1). */
function weeksBetween(startIso: string, endIso: string): number {
  const start = new Date(`${toDateOnly(startIso)}T12:00:00`);
  const end = new Date(`${toDateOnly(endIso)}T12:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  return Math.max(1, Math.round(days / 7));
}

function isFixedPreferredRenewal(detail: RentReviewWorkflowDetail): boolean {
  return detail.preferredLeaseType === 'fixed' || detail.newAgreementEnd != null;
}

/** Lease term in weeks for a fixed-term renewal. */
export function resolveAcceptedLeaseTermWeeks(detail: RentReviewWorkflowDetail): number | null {
  if (!isFixedPreferredRenewal(detail)) return null;

  if (detail.fixedTermWeeks != null && detail.fixedTermWeeks > 0) {
    return detail.fixedTermWeeks;
  }

  const { newLeaseStart, newLeaseEnd } = resolveAcceptedNewLeaseDates(detail);
  if (newLeaseStart && newLeaseEnd) {
    return weeksBetween(newLeaseStart, newLeaseEnd);
  }

  if (newLeaseEnd) {
    const anchor =
      toDateOnly(detail.newAgreementStart) ?? resolveAcceptedRentIncreaseStartDate(detail);
    if (anchor) {
      return weeksBetween(isoDateAddDays(anchor, 1), newLeaseEnd);
    }
  }

  return null;
}

/** Lease term in weeks for display — fixed renewal term, or current fixed tenancy when periodic. */
export function resolveDisplayLeaseTermWeeks(detail: RentReviewWorkflowDetail): number | null {
  const fixedRenewalWeeks = resolveAcceptedLeaseTermWeeks(detail);
  if (fixedRenewalWeeks != null) return fixedRenewalWeeks;

  if (detail.fixedTermWeeks != null && detail.fixedTermWeeks > 0) {
    return detail.fixedTermWeeks;
  }

  if (detail.leaseType === 'fixed' && detail.initialLeaseStartDate && detail.leaseEndDate) {
    return weeksBetween(detail.initialLeaseStartDate, detail.leaseEndDate);
  }

  return null;
}

/** When the new weekly rent takes effect — not the same as the new lease start date. */
export function resolveAcceptedRentIncreaseStartDate(
  detail: RentReviewWorkflowDetail,
): string | null {
  const { newLeaseStart } = resolveAcceptedNewLeaseDates(detail);
  return (
    toDateOnly(detail.effectiveDate) ??
    resolveRentIncreaseAnchor({
      leaseEndDate: detail.leaseEndDate,
      termAnchor: detail.initialLeaseStartDate,
      termWeeks: detail.fixedTermWeeks,
    })
  );
}

export interface TenantAcceptanceSummary {
  newRentWeekly: number;
  rentIncreaseStartDate: string | null;
  leaseTermWeeks: number | null;
  newLeaseStart: string | null;
  newLeaseEnd: string | null;
  preferredLeaseType: 'fixed' | 'periodic' | null;
}

export function buildTenantAcceptanceSummary(
  detail: RentReviewWorkflowDetail,
): TenantAcceptanceSummary | null {
  if (!isTenantAccepted(detail)) return null;

  const leaseDates = resolveAcceptedNewLeaseDates(detail);

  return {
    newRentWeekly:
      detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent,
    rentIncreaseStartDate: resolveAcceptedRentIncreaseStartDate(detail),
    leaseTermWeeks: resolveDisplayLeaseTermWeeks(detail),
    newLeaseStart: leaseDates.newLeaseStart,
    newLeaseEnd: leaseDates.newLeaseEnd,
    preferredLeaseType: detail.preferredLeaseType,
  };
}

/** Explains why rent increase date and new lease dates differ (90-day review scheduling). */
export function buildRentIncreaseSchedulingNote(summary: TenantAcceptanceSummary): string {
  if (summary.preferredLeaseType === 'periodic') {
    return [
      'A periodic renewal has no new lease start or end date — only the rent increase start date above applies.',
      '',
      `For a tenant's first rent review, the review order opens ${RENT_REVIEW_ADVANCE_ORDER_DAYS} days before the initial lease expiry.`,
      `For subsequent reviews, the order opens ${RENT_REVIEW_ADVANCE_ORDER_DAYS} days before the 12-month anniversary of the previous rent increase.`,
    ].join('\n');
  }

  const lines = [
    'The rent increase start date and the new lease start/end dates are not the same.',
    '',
    `For a tenant's first rent review, the review order opens ${RENT_REVIEW_ADVANCE_ORDER_DAYS} days before the initial lease expiry; the rent increase applies from the increase start date above.`,
    `For subsequent reviews, the order opens ${RENT_REVIEW_ADVANCE_ORDER_DAYS} days before the 12-month anniversary of the previous rent increase.`,
    '',
    'The new lease period is the fixed-term renewal agreement. The rent increase date is when the higher weekly rent takes effect — typically the last day of the current fixed term when rolling into the new lease.',
  ];

  if (
    summary.preferredLeaseType === 'fixed' &&
    summary.rentIncreaseStartDate &&
    summary.newLeaseStart &&
    summary.rentIncreaseStartDate !== summary.newLeaseStart
  ) {
    lines.push(
      '',
      `This case: rent increases from ${formatDate(summary.rentIncreaseStartDate)}; the new lease ${
        summary.newLeaseEnd
          ? `runs ${formatDate(summary.newLeaseStart)} to ${formatDate(summary.newLeaseEnd)}`
          : `starts ${formatDate(summary.newLeaseStart)}`
      }.`,
    );
  }

  return lines.join('\n');
}

export const RENT_REVIEW_LEASE_AGREEMENT_AUDIT_KIND = {
  PREPARING: 'lease_agreement_preparing',
  SENT: 'lease_agreement_sent',
  SIGNED: 'lease_agreement_signed',
} as const;

export interface LeaseAgreementStep {
  id: 'preparing' | 'sent' | 'signed';
  label: string;
  done: boolean;
  at: string | null;
}

export interface LeaseAgreementAuditState {
  steps: LeaseAgreementStep[];
  preparingDone: boolean;
  sentDone: boolean;
  signedDone: boolean;
}

/** Fixed-term accept path — standard lease agreement contract flow audit. */
export function buildLeaseAgreementProgress(detail: RentReviewWorkflowDetail): LeaseAgreementStep[] {
  if (!isTenantAccepted(detail) || !isPreferredRenewalFixed(detail)) return [];

  const K = RENT_REVIEW_LEASE_AGREEMENT_AUDIT_KIND;
  const preparingAt =
    auditAt(detail, K.PREPARING) ??
    auditAt(detail, 'tenant_accepted_response') ??
    auditAt(detail, 'agent_accepted_tenant_counter');
  const sentAt = auditAt(detail, K.SENT);
  const signedAt = auditAt(detail, K.SIGNED);

  return [
    {
      id: 'preparing',
      label: 'Lease agreement preparing',
      done: preparingAt != null,
      at: preparingAt,
    },
    {
      id: 'sent',
      label: 'Lease agreement sent',
      done: sentAt != null,
      at: sentAt,
    },
    {
      id: 'signed',
      label: 'Lease agreement signed',
      done: signedAt != null,
      at: signedAt,
    },
  ];
}

export function leaseAgreementAuditState(detail: RentReviewWorkflowDetail): LeaseAgreementAuditState {
  const steps = buildLeaseAgreementProgress(detail);
  return {
    steps,
    preparingDone: steps.find((s) => s.id === 'preparing')?.done ?? false,
    sentDone: steps.find((s) => s.id === 'sent')?.done ?? false,
    signedDone: steps.find((s) => s.id === 'signed')?.done ?? false,
  };
}

export function leaseAgreementAuditEntries(detail: RentReviewWorkflowDetail): RentReviewAuditEntry[] {
  const kinds = new Set<string>(Object.values(RENT_REVIEW_LEASE_AGREEMENT_AUDIT_KIND));
  return detail.auditLog.filter((e) => kinds.has(e.kind));
}

export function tenantCounterAuditEntries(detail: RentReviewWorkflowDetail): RentReviewAuditEntry[] {
  return detail.auditLog.filter((e) =>
    [
      'tenant_counter_submitted',
      'agent_accepted_tenant_counter',
      'agent_reproposed_after_counter',
      'agent_marked_non_negotiable',
    ].includes(e.kind),
  );
}

export function hasTenantCounterHistory(detail: RentReviewWorkflowDetail): boolean {
  return tenantCounterAuditEntries(detail).length > 0 || detail.tenantCounterWeekly != null;
}

/** Full workflow audit trail, oldest first. */
export function fullWorkflowAuditEntries(detail: RentReviewWorkflowDetail): RentReviewAuditEntry[] {
  return [...detail.auditLog].sort((a, b) => a.at.localeCompare(b.at));
}

/** @deprecated Use resolveAcceptedLeaseTermWeeks */
export function preferredLeaseTermWeeks(detail: RentReviewWorkflowDetail): number | null {
  return resolveAcceptedLeaseTermWeeks(detail);
}
