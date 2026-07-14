import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import { commRecordsFromAuditLog } from '@/lib/rent-review/communications';
import {
  canResendTenantNotice,
  hasPendingTenantCounter,
} from '@/lib/rent-review/negotiation-display';
import {
  buildLeaseAgreementProgress,
  isPreferredRenewalFixed,
  isTenantVacatePathComplete,
} from '@/lib/rent-review/tenant-decision-display';
import {
  buildTenantNoticeEmailRecord,
} from '@/lib/rent-review/tenant-notice-email';
import { tenantNoticeTermsEmailLines, resolveTenantNoticeTerms } from '@/lib/rent-review/tenant-notice-terms';
import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';

export type RentReviewEmailRecord = JobCaseEmailRecord;

/** Six-stage rent review flow (manager Excel spec). */
export const RENT_REVIEW_AGENT_STEP = {
  RENT_RESEARCH: 'rent_research',
  AGENT_CONFIRMED: 'agent_confirmed',
  TENANT_NOTIFIED: 'tenant_notified',
  NEGOTIATION: 'negotiation',
  TENANT_DECISION: 'tenant_decision',
  COMPLETED: 'completed',
} as const;

export type RentReviewAgentStep =
  (typeof RENT_REVIEW_AGENT_STEP)[keyof typeof RENT_REVIEW_AGENT_STEP];

export const RENT_REVIEW_AGENT_STEP_ORDER: RentReviewAgentStep[] = [
  RENT_REVIEW_AGENT_STEP.RENT_RESEARCH,
  RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED,
  RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED,
  RENT_REVIEW_AGENT_STEP.NEGOTIATION,
  RENT_REVIEW_AGENT_STEP.TENANT_DECISION,
  RENT_REVIEW_AGENT_STEP.COMPLETED,
];

export const RENT_REVIEW_AGENT_STEP_LABEL: Record<RentReviewAgentStep, string> = {
  [RENT_REVIEW_AGENT_STEP.RENT_RESEARCH]: 'Rent research',
  [RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED]: 'Agent decision',
  [RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED]: 'Tenant notified',
  [RENT_REVIEW_AGENT_STEP.NEGOTIATION]: 'Negotiation',
  [RENT_REVIEW_AGENT_STEP.TENANT_DECISION]: 'Tenant decision',
  [RENT_REVIEW_AGENT_STEP.COMPLETED]: 'Completed',
};

export const RENT_RESEARCH_PLATFORMS = [
  'NSW Fair Trading',
  'RP Data',
  'REA.com.au',
] as const;

/** Display label for lease type on the rent research step. */
export function rentReviewLeaseTypeLabel(detail: RentReviewWorkflowDetail): string {
  if (detail.leaseType === 'periodic') return 'Periodic';
  if (detail.fixedTermWeeks) return `Fixed · ${detail.fixedTermWeeks} wks`;
  if (detail.leaseType === 'fixed') return 'Fixed';
  return '—';
}

export interface RentReviewSubProgressItem {
  id: string;
  label: string;
  done: boolean;
}

export interface RentReviewAgentStepState {
  id: RentReviewAgentStep;
  label: string;
  status: 'done' | 'active' | 'upcoming';
  subProgress: RentReviewSubProgressItem[];
  workflowName: string;
}

export interface RentReviewAgentWorkflowModel {
  steps: RentReviewAgentStepState[];
  liveStepId: RentReviewAgentStep;
  progressFillIndex: number;
}

function auditHas(detail: RentReviewWorkflowDetail, kind: string): boolean {
  return detail.auditLog.some((e) => e.kind === kind);
}

function auditAt(detail: RentReviewWorkflowDetail, kind: string): string | null {
  const hit = [...detail.auditLog].reverse().find((e) => e.kind === kind);
  return hit?.at ?? null;
}

function hasResearchComplete(detail: RentReviewWorkflowDetail): boolean {
  if (auditHas(detail, 'ai_report_ready')) return true;
  const platforms = detail.ai.research?.platforms ?? [];
  return (
    detail.ai.suggestedWeekly != null &&
    platforms.some((platform) => platform.status === 'complete')
  );
}

/** True when admin has finished market research (data on file). */
export function hasMarketResearchComplete(detail: RentReviewWorkflowDetail): boolean {
  return hasResearchComplete(detail);
}

export function hasResearchRequested(detail: RentReviewWorkflowDetail): boolean {
  return auditHas(detail, 'research_requested');
}

export function hasAgentResearchPackSent(detail: RentReviewWorkflowDetail): boolean {
  return auditHas(detail, 'agent_research_email');
}

/** Agent portal — results visible after admin emails the research pack. */
export function canAgentViewResearchResults(detail: RentReviewWorkflowDetail): boolean {
  return hasAgentResearchPackSent(detail);
}

function hasLandlordResearchEmailed(detail: RentReviewWorkflowDetail): boolean {
  return auditHas(detail, 'landlord_research_email');
}

/** Research step is done only after market research and landlord email pack are sent. */
export function isRentResearchStepComplete(detail: RentReviewWorkflowDetail): boolean {
  return hasResearchComplete(detail) && hasLandlordResearchEmailed(detail);
}

/** Agent has finalised proposed rent (approve AI, custom amount, or counter resolution). */
function hasAgentPricingFinalized(detail: RentReviewWorkflowDetail): boolean {
  return (
    auditHas(detail, 'pricing_snapshot') ||
    auditHas(detail, 'agent_accepted_tenant_counter') ||
    auditHas(detail, 'agent_reproposed_after_counter')
  );
}

function hasAgentConfirmedRent(detail: RentReviewWorkflowDetail): boolean {
  return hasAgentPricingFinalized(detail);
}

/** Agent may edit step-2 decision fields before tenant notice is sent. */
export function canEditAgentDecision(detail: RentReviewWorkflowDetail): boolean {
  if (hasPendingTenantCounter(detail)) return false;
  if (hasTenantNoticeSent(detail)) return false;
  return detail.workflowState === 'agent_review';
}

/** Agent may accept, counter, or mark non-negotiable while a tenant counter is pending. */
export function canResolveNegotiation(detail: RentReviewWorkflowDetail): boolean {
  return hasPendingTenantCounter(detail);
}

export { canResendTenantNotice, hasPendingTenantCounter };

/** Formal increase notice has been dispatched to the tenant. */
export function hasTenantNoticeSent(detail: RentReviewWorkflowDetail): boolean {
  return auditHas(detail, 'tenant_notices_dispatched');
}

/** Agent may dispatch the formal increase notice (backend: `agent_review` only). */
export function canSendTenantNotice(detail: RentReviewWorkflowDetail): boolean {
  if (hasPendingTenantCounter(detail)) return false;
  if (!hasAgentPricingFinalized(detail)) return false;
  if (detail.workflowState !== 'agent_review') return false;
  if (detail.proposedWeeklyRent == null && detail.ai.suggestedWeekly == null) return false;
  if (!hasTenantNoticeSent(detail)) return true;
  return canResendTenantNotice(detail);
}

/** Agent may record accept / reject / counter when the tenant responds offline. */
export function canRecordTenantResponseOnBehalf(detail: RentReviewWorkflowDetail): boolean {
  return detail.workflowState === 'tenant_notified';
}

function hasTenantDecision(detail: RentReviewWorkflowDetail): boolean {
  return (
    auditHas(detail, 'tenant_accepted_response') ||
    auditHas(detail, 'tenant_rejected_response') ||
    auditHas(detail, 'tenant_counter_submitted') ||
    ['tenant_accepted', 'tenant_rejected', 'accounting', 'completed'].includes(detail.workflowState)
  );
}

function hasCompleted(detail: RentReviewWorkflowDetail): boolean {
  return detail.workflowState === 'completed' || detail.legacyStatus === 'COMPLETED';
}

function researchSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const requested = hasResearchRequested(detail);
  const researchDone = hasResearchComplete(detail);
  const agentPackSent = hasAgentResearchPackSent(detail);
  const landlordEmailed = hasLandlordResearchEmailed(detail);
  return [
    {
      id: 'request',
      label: 'Agent requested market research',
      done: requested,
    },
    {
      id: 'platforms',
      label: `Market research (${RENT_RESEARCH_PLATFORMS.join(', ')})`,
      done: researchDone,
    },
    {
      id: 'email-agent',
      label: 'Research results emailed to agent',
      done: agentPackSent,
    },
    {
      id: 'email-landlord',
      label: 'Research emailed to landlord',
      done: landlordEmailed,
    },
    {
      id: 'amounts',
      label: `Current ${detail.currentWeeklyRent}/wk · recommended ${detail.ai.suggestedWeekly ?? detail.proposedWeeklyRent ?? '—'}/wk`,
      done: researchDone && detail.ai.suggestedWeekly != null,
    },
  ];
}

function agentConfirmedSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const pricingFinalized = hasAgentPricingFinalized(detail);
  const noticeSent = hasTenantNoticeSent(detail);
  const resend = canResendTenantNotice(detail);
  return [
    {
      id: 'negotiable',
      label:
        detail.rentNegotiable === true
          ? 'Rent negotiable with tenant'
          : detail.rentNegotiable === false
            ? 'Rent not negotiable'
            : 'Rent negotiable?',
      done: detail.rentNegotiable != null && pricingFinalized,
    },
    {
      id: 'agent-confirm',
      label: pricingFinalized
        ? `Agent confirmed ${detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? '—'}/wk`
        : 'Confirm rent & lease terms',
      done: pricingFinalized,
    },
    {
      id: 'lease-term',
      label: detail.preferredLeaseType
        ? `Preferred ${detail.preferredLeaseType} term`
        : 'Preferred lease term',
      done: pricingFinalized && detail.preferredLeaseType != null,
    },
    {
      id: 'ready',
      label: resend
        ? 'Re-send notice with updated terms'
        : noticeSent
          ? 'Tenant notified'
          : pricingFinalized
            ? 'Ready to notify tenant'
            : 'Awaiting agent decision',
      done: noticeSent && !resend,
    },
  ];
}

function tenantNotifiedSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const noticeAt = auditAt(detail, 'tenant_notices_dispatched');
  const reminderCount = detail.auditLog.filter((e) => e.kind === 'tenant_response_reminder').length;
  const counterSubmitted = auditHas(detail, 'tenant_counter_submitted');
  return [
    {
      id: 'notice',
      label: noticeAt
        ? `Formal notice sent to tenant (${noticeAt.slice(0, 10)})`
        : 'Formal rent increase notice sent to tenant',
      done: hasTenantNoticeSent(detail),
    },
    {
      id: 'reminders',
      label:
        reminderCount > 0
          ? `${reminderCount} automated reminder${reminderCount === 1 ? '' : 's'} sent (every 2 days)`
          : 'Auto-reminder every 2 days if no reply',
      done: reminderCount > 0,
    },
    {
      id: 'awaiting',
      label: counterSubmitted
        ? 'Tenant counter-offer — see Negotiation'
        : hasTenantDecision(detail)
          ? 'Tenant response recorded'
          : noticeAt
            ? `Awaiting tenant response since ${noticeAt.slice(0, 10)}`
            : 'Awaiting tenant response',
      done: counterSubmitted || hasTenantDecision(detail),
    },
  ];
}

function negotiationSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const pending = hasPendingTenantCounter(detail);
  const counterSubmitted = auditHas(detail, 'tenant_counter_submitted');
  const agentAccepted = auditHas(detail, 'agent_accepted_tenant_counter');
  const reproposed = auditHas(detail, 'agent_reproposed_after_counter');
  const nonNegotiable = auditHas(detail, 'agent_marked_non_negotiable');
  const resend = canResendTenantNotice(detail);
  const feedbackDone = !pending && (agentAccepted || reproposed || nonNegotiable);

  return [
    {
      id: 'offer',
      label:
        pending && detail.tenantCounterWeekly != null
          ? `Tenant offer: $${detail.tenantCounterWeekly}/wk`
          : counterSubmitted
            ? 'Tenant counter-offer recorded'
            : 'Awaiting tenant counter-offer',
      done: counterSubmitted,
    },
    {
      id: 'feedback',
      label: pending
        ? 'Agent feedback pending'
        : agentAccepted
          ? 'Agent accepted tenant offer'
          : reproposed
            ? 'Agent declined — counter-offer sent'
            : nonNegotiable
              ? 'Agent declined — marked non-negotiable'
              : 'Agent feedback',
      done: feedbackDone,
    },
    {
      id: 'next',
      label: resend
        ? 'Re-send notice on Tenant notified'
        : agentAccepted
          ? 'Proceed to Tenant decision'
          : reproposed || nonNegotiable
            ? 'Updated terms ready for tenant'
            : 'Awaiting negotiation',
      done: feedbackDone && !resend,
    },
  ];
}

function tenantDecisionSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const accepted = isTenantDecisionAccepted(detail);
  const rejected = isTenantDecisionRejected(detail);
  const vacateComplete = isTenantVacatePathComplete(detail);
  const counter = auditHas(detail, 'tenant_counter_submitted');
  const pendingCounter = hasPendingTenantCounter(detail);
  const accounting = detail.workflowState === 'accounting' || auditHas(detail, 'accounting_handoff');
  const leaseSteps =
    accepted && isPreferredRenewalFixed(detail)
      ? buildLeaseAgreementProgress(detail).map((step) => ({
          id: `lease-${step.id}`,
          label: step.label,
          done: step.done,
        }))
      : [];

  const base: RentReviewSubProgressItem[] = [
    {
      id: 'response',
      label: accepted
        ? 'Tenant accepted increase'
        : rejected
          ? `Tenant declined${detail.tenantMoveOutDate ? ` · move-out ${detail.tenantMoveOutDate}` : ''}`
          : pendingCounter
            ? 'Tenant counter-offer — see Negotiation'
            : counter
              ? 'Tenant counter-offer resolved'
              : 'Awaiting tenant accept / counter / decline',
      done: accepted || vacateComplete,
    },
    {
      id: 'terms',
      label: accepted
        ? `New rent $${detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly}/wk · increase from ${detail.effectiveDate ?? 'TBC'}`
        : rejected
          ? 'Move-out date recorded'
          : 'Rent terms on acceptance',
      done: (accepted && detail.proposedWeeklyRent != null) || vacateComplete,
    },
    ...leaseSteps,
  ];

  if (rejected) {
    return [
      ...base,
      {
        id: 'vacate-closed',
        label: vacateComplete ? 'Vacate path complete' : 'Awaiting move-out date',
        done: vacateComplete,
      },
    ];
  }

  return [
    ...base,
    {
      id: 'accounting',
      label: accounting ? 'Submitted to accounting' : 'Accounting sync pending',
      done: accounting || hasCompleted(detail),
    },
  ];
}

function isTenantDecisionAccepted(detail: RentReviewWorkflowDetail): boolean {
  return (
    detail.workflowState === 'tenant_accepted' ||
    detail.workflowState === 'accounting' ||
    detail.workflowState === 'completed' ||
    auditHas(detail, 'tenant_accepted_response') ||
    auditHas(detail, 'agent_accepted_tenant_counter')
  );
}

function isTenantDecisionRejected(detail: RentReviewWorkflowDetail): boolean {
  return detail.workflowState === 'tenant_rejected' || auditHas(detail, 'tenant_rejected_response');
}

function completedSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const vacateComplete = isTenantVacatePathComplete(detail);
  if (vacateComplete) {
    return [
      {
        id: 'tenant-path',
        label: 'Tenant declined · vacate path',
        done: true,
      },
      {
        id: 'end-leasing',
        label: 'End leasing',
        done: true,
      },
      {
        id: 'closed',
        label: detail.completedDate
          ? `Closed ${detail.completedDate}`
          : 'Case closed',
        done: hasCompleted(detail) || vacateComplete,
      },
    ];
  }

  const accounting =
    detail.workflowState === 'accounting' || auditHas(detail, 'accounting_handoff');
  const auditCount = detail.auditLog.length;
  const leaseSteps =
    isTenantDecisionAccepted(detail) && isPreferredRenewalFixed(detail)
      ? buildLeaseAgreementProgress(detail).map((step) => ({
          id: `lease-${step.id}`,
          label: step.label,
          done: step.done,
        }))
      : [];
  return [
    {
      id: 'tenant-path',
      label: isTenantDecisionAccepted(detail)
        ? 'Tenant accepted · terms finalised'
        : isTenantDecisionRejected(detail)
          ? 'Tenant declined · vacate path'
          : 'Tenant decision recorded',
      done: isTenantDecisionAccepted(detail) || isTenantDecisionRejected(detail),
    },
    ...leaseSteps,
    {
      id: 'accounting',
      label: accounting ? 'Submitted to accounting' : 'Accounting handoff pending',
      done: accounting || hasCompleted(detail),
    },
    {
      id: 'confirmation',
      label: 'Confirmation email sent to tenant',
      done: auditHas(detail, 'ledger_complete') || hasCompleted(detail),
    },
    {
      id: 'sync',
      label: 'System rent sync completed',
      done: hasCompleted(detail),
    },
    {
      id: 'audit',
      label: auditCount > 0 ? `Full workflow audit (${auditCount} events)` : 'Full workflow audit',
      done: hasCompleted(detail),
    },
    {
      id: 'closed',
      label: detail.completedDate
        ? `Closed ${detail.completedDate}`
        : 'Case closed',
      done: hasCompleted(detail),
    },
  ];
}

export function resolveRentReviewAgentStep(detail: RentReviewWorkflowDetail): RentReviewAgentStep {
  switch (detail.workflowState) {
    case 'pending_confirmation':
      return RENT_REVIEW_AGENT_STEP.RENT_RESEARCH;
    case 'agent_review':
      if (!isRentResearchStepComplete(detail)) {
        return RENT_REVIEW_AGENT_STEP.RENT_RESEARCH;
      }
      if (hasPendingTenantCounter(detail)) {
        return RENT_REVIEW_AGENT_STEP.NEGOTIATION;
      }
      return hasAgentPricingFinalized(detail)
        ? RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED
        : RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED;
    case 'negotiation':
      if (!isRentResearchStepComplete(detail)) {
        return RENT_REVIEW_AGENT_STEP.RENT_RESEARCH;
      }
      return hasPendingTenantCounter(detail)
        ? RENT_REVIEW_AGENT_STEP.NEGOTIATION
        : RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED;
    case 'tenant_notified':
      if (hasPendingTenantCounter(detail)) {
        return RENT_REVIEW_AGENT_STEP.NEGOTIATION;
      }
      return RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED;
    case 'tenant_accepted':
      return RENT_REVIEW_AGENT_STEP.TENANT_DECISION;
    case 'tenant_rejected':
      return isTenantVacatePathComplete(detail)
        ? RENT_REVIEW_AGENT_STEP.COMPLETED
        : RENT_REVIEW_AGENT_STEP.TENANT_DECISION;
    case 'accounting':
      return RENT_REVIEW_AGENT_STEP.COMPLETED;
    case 'completed':
      return RENT_REVIEW_AGENT_STEP.COMPLETED;
    case 'cancelled':
    case 'postponed':
      return RENT_REVIEW_AGENT_STEP.RENT_RESEARCH;
    default:
      return RENT_REVIEW_AGENT_STEP.RENT_RESEARCH;
  }
}

function stepIndex(step: RentReviewAgentStep): number {
  return RENT_REVIEW_AGENT_STEP_ORDER.indexOf(step);
}

function subProgressForStep(
  step: RentReviewAgentStep,
  detail: RentReviewWorkflowDetail,
): RentReviewSubProgressItem[] {
  switch (step) {
    case RENT_REVIEW_AGENT_STEP.RENT_RESEARCH:
      return researchSubProgress(detail);
    case RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED:
      return agentConfirmedSubProgress(detail);
    case RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED:
      return tenantNotifiedSubProgress(detail);
    case RENT_REVIEW_AGENT_STEP.NEGOTIATION:
      return negotiationSubProgress(detail);
    case RENT_REVIEW_AGENT_STEP.TENANT_DECISION:
      return tenantDecisionSubProgress(detail);
    case RENT_REVIEW_AGENT_STEP.COMPLETED:
      return completedSubProgress(detail);
    default:
      return [];
  }
}

export function buildRentReviewAgentWorkflow(
  detail: RentReviewWorkflowDetail,
): RentReviewAgentWorkflowModel {
  const liveStepId = resolveRentReviewAgentStep(detail);
  const liveIdx = stepIndex(liveStepId);
  const workflowClosed = isRentReviewWorkflowClosed(detail);

  const steps: RentReviewAgentStepState[] = RENT_REVIEW_AGENT_STEP_ORDER.map((id, idx) => ({
    id,
    label: RENT_REVIEW_AGENT_STEP_LABEL[id],
    status: idx < liveIdx ? 'done' : idx === liveIdx ? 'active' : 'upcoming',
    subProgress: subProgressForStep(id, detail),
    workflowName: 'Rent review',
  }));

  if (workflowClosed) {
    for (const step of steps) {
      step.status = 'done';
    }
  }

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progressFillIndex = workflowClosed
    ? steps.length - 1
    : Math.max(0, doneCount - 0.5);

  return { steps, liveStepId, progressFillIndex };
}

/** Rent review is finished — accept/accounting path or tenant vacate path. */
export function isRentReviewWorkflowClosed(detail: RentReviewWorkflowDetail): boolean {
  return detail.workflowState === 'completed' || isTenantVacatePathComplete(detail);
}

/** Map an audit event to the workflow step where it belongs (for navigation from Completed). */
export function resolveRentReviewStepForAuditKind(kind: string): RentReviewAgentStep {
  switch (kind) {
    case 'ai_report_ready':
    case 'statutory_notice_alert':
    case 'agent_confirmation_reminder':
    case 'landlord_research_email':
    case 'agent_research_email':
    case 'research_requested':
    case 'comm_reply':
    case 'comm_forward':
      return RENT_REVIEW_AGENT_STEP.RENT_RESEARCH;
    case 'review_confirmed':
    case 'pricing_snapshot':
      return RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED;
    case 'tenant_notices_dispatched':
    case 'tenant_response_reminder':
      return RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED;
    case 'tenant_counter_submitted':
    case 'agent_accepted_tenant_counter':
    case 'agent_reproposed_after_counter':
    case 'agent_marked_non_negotiable':
      return RENT_REVIEW_AGENT_STEP.NEGOTIATION;
    case 'tenant_accepted_response':
    case 'tenant_rejected_response':
    case 'lease_agreement_preparing':
    case 'lease_agreement_sent':
    case 'lease_agreement_signed':
      return RENT_REVIEW_AGENT_STEP.TENANT_DECISION;
    default:
      return RENT_REVIEW_AGENT_STEP.COMPLETED;
  }
}

export function buildResearchEmailToAgent(detail: RentReviewWorkflowDetail): RentReviewEmailRecord {
  const suggested = detail.ai.suggestedWeekly ?? detail.proposedWeeklyRent ?? detail.currentWeeklyRent;
  const pct = detail.ai.increasePercent;
  return {
    id: `${detail.id}-research-email`,
    subject: `Rent review research — ${detail.propertyAddress}`,
    from: 'CROSSUB Research <research@crossub.com.au>',
    to: 'Managing Agent',
    at: auditAt(detail, 'ai_report_ready') ?? detail.createdAt,
    kind: 'ai_report_ready',
    body:
      `Rent review market research complete.\n\n` +
      `Property: ${detail.propertyAddress}\n` +
      `Tenant: ${detail.tenantName}\n\n` +
      `Sources: ${RENT_RESEARCH_PLATFORMS.join(', ')}\n\n` +
      `Current rent: $${detail.currentWeeklyRent}/week\n` +
      `Recommended rent: $${suggested}/week` +
      (pct != null ? ` (+${pct}%)` : '') +
      `\n\n${detail.ai.rationale ?? 'Comparable lettings analysis complete.'}\n\n` +
      `Please review and confirm in the agent portal.`,
  };
}

export function buildTenantNoticeEmail(detail: RentReviewWorkflowDetail): RentReviewEmailRecord | null {
  const hit = [...detail.auditLog].reverse().find((e) => e.kind === 'tenant_notices_dispatched');
  if (!hit) return null;
  return buildTenantNoticeEmailRecord(detail, hit);
}

export function buildCompletionEmail(detail: RentReviewWorkflowDetail): RentReviewEmailRecord | null {
  const hit = [...detail.auditLog].reverse().find((e) => e.kind === 'ledger_complete');
  if (!hit && detail.workflowState !== 'completed') return null;
  const weekly = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent;
  return {
    id: hit?.id ?? `${detail.id}-completion-email`,
    subject: `Rent increase confirmed — ${detail.propertyAddress}`,
    from: 'Managing Agent',
    to: detail.tenantName,
    at: hit?.at ?? detail.completedDate ?? detail.createdAt,
    kind: 'ledger_complete',
    body:
      `Dear ${detail.tenantName},\n\n` +
      `Your rent increase has been confirmed.\n\n` +
      `New rent: $${weekly}/week\n` +
      `Effective from: ${detail.effectiveDate ?? 'as advised'}\n\n` +
      `Thank you.`,
  };
}

function buildTenantReminderEmail(
  entry: RentReviewAuditEntry,
  detail: RentReviewWorkflowDetail,
): RentReviewEmailRecord {
  const terms = resolveTenantNoticeTerms(detail);
  const termsBlock = tenantNoticeTermsEmailLines(terms).map((line) => `• ${line}`).join('\n');

  return {
    id: entry.id,
    subject: 'Reminder — rent increase response',
    from: 'Managing Agent',
    to: detail.tenantName,
    at: entry.at,
    kind: entry.kind,
    body:
      `Dear ${detail.tenantName},\n\n` +
      `We have not yet received your response to the proposed rent increase. ` +
      `Please let us know if you have any feedback or questions.\n\n` +
      `Confirmed terms:\n${termsBlock}`,
  };
}

function tenantNoticeAndReminderEmails(detail: RentReviewWorkflowDetail): RentReviewEmailRecord[] {
  const records: RentReviewEmailRecord[] = [];
  const notice = buildTenantNoticeEmail(detail);
  if (notice) records.push(notice);
  for (const entry of detail.auditLog) {
    if (entry.kind === 'tenant_response_reminder') {
      records.push(buildTenantReminderEmail(entry, detail));
    }
  }
  return records;
}

function agentConfirmedEmails(detail: RentReviewWorkflowDetail): RentReviewEmailRecord[] {
  return detail.auditLog
    .filter((entry) =>
      ['agent_confirmation_reminder', 'statutory_notice_alert'].includes(entry.kind),
    )
    .map((entry) => ({
      id: entry.id,
      subject:
        entry.kind === 'statutory_notice_alert'
          ? 'Statutory notice period alert'
          : 'Reminder — confirm rent review',
      from: 'CROSSUB',
      to: 'Managing Agent',
      at: entry.at,
      kind: entry.kind,
      body: [entry.message, entry.detail].filter(Boolean).join('\n\n'),
    }));
}

function researchStepEmails(detail: RentReviewWorkflowDetail): RentReviewEmailRecord[] {
  const synthesized = hasResearchComplete(detail) ? [buildResearchEmailToAgent(detail)] : [];
  const fromAudit = commRecordsFromAuditLog(detail);
  const byId = new Map<string, RentReviewEmailRecord>();
  for (const record of [...synthesized, ...fromAudit]) {
    byId.set(record.id, record);
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}

/** Email records for one workflow stage only (no prior steps). */
function emailRecordsForStepOnly(
  detail: RentReviewWorkflowDetail,
  step: RentReviewAgentStep,
): RentReviewEmailRecord[] {
  switch (step) {
    case RENT_REVIEW_AGENT_STEP.RENT_RESEARCH:
      return researchStepEmails(detail);
    case RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED:
      return agentConfirmedEmails(detail);
    case RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED:
      return tenantNoticeAndReminderEmails(detail);
    case RENT_REVIEW_AGENT_STEP.NEGOTIATION:
      return [];
    case RENT_REVIEW_AGENT_STEP.TENANT_DECISION:
      return [];
    case RENT_REVIEW_AGENT_STEP.COMPLETED: {
      const completion = buildCompletionEmail(detail);
      return completion ? [completion] : [];
    }
    default:
      return [];
  }
}

function accumulateEmailRecordsThroughStep(
  detail: RentReviewWorkflowDetail,
  throughStep: RentReviewAgentStep,
): RentReviewEmailRecord[] {
  const endIdx = stepIndex(throughStep);
  if (endIdx < 0) return [];

  const byId = new Map<string, RentReviewEmailRecord>();
  for (let i = 0; i <= endIdx; i++) {
    const stepId = RENT_REVIEW_AGENT_STEP_ORDER[i];
    for (const record of emailRecordsForStepOnly(detail, stepId)) {
      byId.set(record.id, record);
    }
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}

/** Every email sent across the rent-review workflow (deduped, newest first). */
export function allRentReviewEmailRecords(detail: RentReviewWorkflowDetail): RentReviewEmailRecord[] {
  return accumulateEmailRecordsThroughStep(detail, RENT_REVIEW_AGENT_STEP.COMPLETED);
}

/** Emails through the viewed stage — each step accumulates all prior step mail. */
export function emailRecordsForStep(
  detail: RentReviewWorkflowDetail,
  step: RentReviewAgentStep,
): RentReviewEmailRecord[] {
  return accumulateEmailRecordsThroughStep(detail, step);
}

/** @deprecated Use `allRentReviewEmailRecords` — kept for callers expecting the old name. */
export function emailRecordsFromAudit(detail: RentReviewWorkflowDetail): RentReviewEmailRecord[] {
  return allRentReviewEmailRecords(detail);
}

export function auditEntriesForStep(
  detail: RentReviewWorkflowDetail,
  step: RentReviewAgentStep,
): RentReviewAuditEntry[] {
  if (step === RENT_REVIEW_AGENT_STEP.COMPLETED) {
    return [...detail.auditLog].sort((a, b) => a.at.localeCompare(b.at));
  }

  const kindsByStep: Record<Exclude<RentReviewAgentStep, 'completed'>, string[]> = {
    rent_research: ['research_requested', 'ai_report_ready', 'agent_confirmation_reminder', 'statutory_notice_alert', 'agent_research_email', 'landlord_research_email'],
    agent_confirmed: ['review_confirmed', 'pricing_snapshot'],
    tenant_notified: ['tenant_notices_dispatched', 'tenant_response_reminder'],
    negotiation: [
      'tenant_counter_submitted',
      'agent_accepted_tenant_counter',
      'agent_reproposed_after_counter',
      'agent_marked_non_negotiable',
    ],
    tenant_decision: [
      'tenant_accepted_response',
      'tenant_rejected_response',
      'lease_agreement_preparing',
      'lease_agreement_sent',
      'lease_agreement_signed',
      'accounting_handoff',
    ],
  };
  const kinds = kindsByStep[step];
  return detail.auditLog.filter((e) => kinds.includes(e.kind));
}
