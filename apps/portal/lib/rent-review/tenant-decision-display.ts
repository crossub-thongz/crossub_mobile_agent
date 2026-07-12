import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';

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

export function isPreferredRenewalFixed(detail: RentReviewWorkflowDetail): boolean {
  return detail.preferredLeaseType === 'fixed';
}

/** Preferred renewal term length in weeks (fixed-term renewals only). */
export function preferredLeaseTermWeeks(detail: RentReviewWorkflowDetail): number | null {
  if (!isPreferredRenewalFixed(detail)) return null;
  if (detail.newAgreementStart && detail.newAgreementEnd) {
    const start = new Date(`${detail.newAgreementStart}T12:00:00`);
    const end = new Date(`${detail.newAgreementEnd}T12:00:00`);
    const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
    return Math.max(1, Math.round(days / 7));
  }
  return detail.fixedTermWeeks;
}

export interface TenantAcceptanceSummary {
  newRentWeekly: number;
  rentIncreaseStartDate: string | null;
  leaseTermWeeks: number | null;
  newLeaseStart: string | null;
  newLeaseEnd: string | null;
}

export function buildTenantAcceptanceSummary(
  detail: RentReviewWorkflowDetail,
): TenantAcceptanceSummary | null {
  if (!isTenantAccepted(detail)) return null;
  return {
    newRentWeekly:
      detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent,
    rentIncreaseStartDate: detail.effectiveDate,
    leaseTermWeeks: preferredLeaseTermWeeks(detail),
    newLeaseStart: isPreferredRenewalFixed(detail) ? detail.newAgreementStart : null,
    newLeaseEnd: isPreferredRenewalFixed(detail) ? detail.newAgreementEnd : null,
  };
}

export interface LeaseAgreementStep {
  id: string;
  label: string;
  done: boolean;
  at: string | null;
}

/** Fixed-term accept path — lease agreement workflow audit (UI-synthesised until backend hooks exist). */
export function buildLeaseAgreementProgress(detail: RentReviewWorkflowDetail): LeaseAgreementStep[] {
  if (!isTenantAccepted(detail) || !isPreferredRenewalFixed(detail)) return [];

  const acceptAt = auditAt(detail, 'tenant_accepted_response') ?? auditAt(detail, 'agent_accepted_tenant_counter');
  const sentAt = auditAt(detail, 'accounting_handoff');
  const signedAt = auditAt(detail, 'ledger_complete') ?? (detail.completedDate ? `${detail.completedDate}T12:00:00.000Z` : null);

  return [
    {
      id: 'preparing',
      label: 'Lease agreement preparing',
      done: acceptAt != null,
      at: acceptAt,
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

export function tenantCounterAuditEntries(detail: RentReviewWorkflowDetail): RentReviewAuditEntry[] {
  return detail.auditLog.filter((e) =>
    ['tenant_counter_submitted', 'agent_accepted_tenant_counter', 'agent_reproposed_after_counter'].includes(
      e.kind,
    ),
  );
}

export function hasTenantCounterHistory(detail: RentReviewWorkflowDetail): boolean {
  return tenantCounterAuditEntries(detail).length > 0 || detail.tenantCounterWeekly != null;
}

/** Full workflow audit trail, oldest first. */
export function fullWorkflowAuditEntries(detail: RentReviewWorkflowDetail): RentReviewAuditEntry[] {
  return [...detail.auditLog].sort((a, b) => a.at.localeCompare(b.at));
}
