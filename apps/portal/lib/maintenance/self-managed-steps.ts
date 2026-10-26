import { MAINTENANCE_STATUS } from '@/constants/api-enums';
import {
  ESCALATION_REASONS_HANDLED_IN_STEPS,
  ESCALATION_STATUS,
  INVOICE_MATCH_NEEDS_DECISION,
  INVOICE_MATCH_STATUS,
  INVOICE_MATCH_PAYABLE,
  MAINTENANCE_ISSUE_LIVE,
  MAINTENANCE_QUOTE_STATUS,
  URGENT_AUTHORISATION_STATUS,
  VISIT_PROPOSAL_STATE,
  VISIT_TENANT_DECISION,
  type VisitProposalState,
} from '@/constants/self-managed-maintenance';
import type { AgentMaintenanceDetail } from '@/lib/crossub-api/maintenance-client';
import { MAINTENANCE_PAYMENT_STATUS } from '@/constants/maintenance-v2';

/** Which Self-Manage steps apply to a job right now, read off its detail. */
export interface SelfManagedMaintenanceSteps {
  /** Urgent, open, and no active authorisation yet. */
  urgent: boolean;
  /** The job is still live (not completed or cancelled). */
  open: boolean;
  /** Open escalations the agency has to decide, oldest first (less those a step answers). */
  escalations: AgentMaintenanceDetail['escalations'];
  /** Live issues extracted from the report. */
  issues: AgentMaintenanceDetail['issues'];
  /** Still being scoped (reported or out for quotes): issues, split and combine. */
  triage: boolean;
  /** No quote is approved yet, so a phoned-in quote can still be entered. */
  enterQuote: boolean;
  /** Submitted quotes are waiting for a decision. */
  compareQuotes: boolean;
  /** A quote is approved and the visit is not booked yet. */
  schedule: boolean;
  /** The invoice differs from the approved quote, or matches none. */
  invoiceDecision: boolean;
  /** The agency disputed the invoice; the dispute can be withdrawn. */
  disputed: boolean;
  /** The invoice is cleared and the tradie still needs paying. */
  payment: boolean;
  /** The work is under way or done, and a completion gate is still open. */
  completion: boolean;
  /** A work order has been issued to the tradie. */
  workOrder: boolean;
}

const CLOSED_STATUSES: readonly string[] = [
  MAINTENANCE_STATUS.COMPLETED,
  MAINTENANCE_STATUS.CANCELLED,
];

const TRIAGE_STATUSES: readonly string[] = [MAINTENANCE_STATUS.OPEN, MAINTENANCE_STATUS.QUOTING];

/** The stored status is APPROVED both while quotes await a decision and while the visit is booked. */
const QUOTE_STAGE_STATUSES: readonly string[] = [...TRIAGE_STATUSES, MAINTENANCE_STATUS.APPROVED];

const WORK_STATUSES: readonly string[] = [MAINTENANCE_STATUS.SCHEDULED, MAINTENANCE_STATUS.INVOICED];

const SETTLED_PAYMENT: readonly string[] = [
  MAINTENANCE_PAYMENT_STATUS.PAID,
  MAINTENANCE_PAYMENT_STATUS.EXTERNAL_SETTLEMENT,
];

export function selfManagedMaintenanceSteps(
  detail: AgentMaintenanceDetail,
): SelfManagedMaintenanceSteps {
  const open = !CLOSED_STATUSES.includes(detail.status);
  const match = detail.invoiceMatch;
  const hasActiveAuthorisation = detail.urgentAuthorisations.some(
    (a) => a.status === URGENT_AUTHORISATION_STATUS.ACTIVE,
  );
  const hasApprovedQuote = detail.quotes.some((q) => q.status === MAINTENANCE_QUOTE_STATUS.APPROVED);
  const hasSubmittedQuote = detail.quotes.some(
    (q) => q.status === MAINTENANCE_QUOTE_STATUS.SUBMITTED,
  );
  return {
    urgent: open && detail.urgent && !hasActiveAuthorisation,
    open,
    escalations: open
      ? detail.escalations.filter(
          (e) =>
            e.status === ESCALATION_STATUS.OPEN &&
            !ESCALATION_REASONS_HANDLED_IN_STEPS.includes(e.reason),
        )
      : [],
    issues: detail.issues.filter((i) => MAINTENANCE_ISSUE_LIVE.includes(i.status)),
    triage: open && !hasApprovedQuote && TRIAGE_STATUSES.includes(detail.status),
    enterQuote: open && !hasApprovedQuote && QUOTE_STAGE_STATUSES.includes(detail.status),
    compareQuotes: open && !hasApprovedQuote && hasSubmittedQuote,
    schedule: open && hasApprovedQuote && detail.status === MAINTENANCE_STATUS.APPROVED,
    invoiceDecision: open && match !== null && INVOICE_MATCH_NEEDS_DECISION.includes(match.status),
    disputed: open && match !== null && match.status === INVOICE_MATCH_STATUS.DISPUTED,
    payment:
      match !== null &&
      INVOICE_MATCH_PAYABLE.includes(match.status) &&
      !SETTLED_PAYMENT.includes(match.paymentStatus),
    completion:
      open &&
      WORK_STATUSES.includes(detail.status) &&
      !(
        detail.completionEvidenceUploaded &&
        detail.invoiceUploaded &&
        detail.tenantApprovalReceived &&
        detail.agentApprovalReceived
      ),
    workOrder: open && detail.workOrder !== null,
  };
}

/**
 * The owner-approval email still waiting on the owner's answer for this quote, or null when the
 * quote was never emailed or the answer is recorded.
 */
export function awaitingOwnerQuoteApproval(
  detail: Pick<AgentMaintenanceDetail, 'ownerQuoteApprovals'>,
  quotationId: string,
): AgentMaintenanceDetail['ownerQuoteApprovals'][number] | null {
  return (
    detail.ownerQuoteApprovals.find(
      (entry) => entry.quotationId === quotationId && entry.outcome === null,
    ) ?? null
  );
}

/**
 * The `(YYYY-MM-DD HH:mm)` property-time anchor the server reads off a visit window, from a
 * `datetime-local` value: "Tue 21/10/2026 09:00 (2026-10-21 09:00)". Null for an empty or
 * malformed value.
 */
export function formatVisitAnchor(dateTimeLocal: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(dateTimeLocal.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const weekday = new Date(Number(y), Number(mo) - 1, Number(d)).toLocaleDateString('en-AU', {
    weekday: 'short',
  });
  return `${weekday} ${d}/${mo}/${y} ${h}:${mi} (${y}-${mo}-${d} ${h}:${mi})`;
}

/**
 * Where the visit times offered for the approved tradie stand: none sent (or a time already
 * recorded as arranged directly), waiting on the tenant, or turned down by the tenant.
 */
export function visitProposalState(
  proposal: AgentMaintenanceDetail['scheduleProposal'],
): VisitProposalState {
  if (!proposal || proposal.arrangedDirectly) return VISIT_PROPOSAL_STATE.NONE;
  if (proposal.tenantDecision === VISIT_TENANT_DECISION.DECLINED) {
    return VISIT_PROPOSAL_STATE.TENANT_DECLINED;
  }
  if (proposal.tenantDecision === null) return VISIT_PROPOSAL_STATE.AWAITING_TENANT;
  return VISIT_PROPOSAL_STATE.NONE;
}

/**
 * Whether deciding a quote emails the owner a copy — the server's rule: above the repair limit,
 * any amount when no limit is set, and always for an unpriced quote.
 */
export function quoteDecisionCopiesOwner(total: number | null, threshold: number | null): boolean {
  if (total === null || threshold === null) return true;
  return total > threshold;
}
