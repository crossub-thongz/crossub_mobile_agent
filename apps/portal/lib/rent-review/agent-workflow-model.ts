import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import { commRecordsFromAuditLog } from '@/lib/rent-review/communications';
import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';

export type RentReviewEmailRecord = JobCaseEmailRecord;

/** Five-stage rent review flow (manager Excel spec). */
export const RENT_REVIEW_AGENT_STEP = {
  RENT_RESEARCH: 'rent_research',
  AGENT_CONFIRMED: 'agent_confirmed',
  TENANT_NOTIFIED: 'tenant_notified',
  TENANT_DECISION: 'tenant_decision',
  COMPLETED: 'completed',
} as const;

export type RentReviewAgentStep =
  (typeof RENT_REVIEW_AGENT_STEP)[keyof typeof RENT_REVIEW_AGENT_STEP];

export const RENT_REVIEW_AGENT_STEP_ORDER: RentReviewAgentStep[] = [
  RENT_REVIEW_AGENT_STEP.RENT_RESEARCH,
  RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED,
  RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED,
  RENT_REVIEW_AGENT_STEP.TENANT_DECISION,
  RENT_REVIEW_AGENT_STEP.COMPLETED,
];

export const RENT_REVIEW_AGENT_STEP_LABEL: Record<RentReviewAgentStep, string> = {
  [RENT_REVIEW_AGENT_STEP.RENT_RESEARCH]: 'Rent research',
  [RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED]: 'Agent decision',
  [RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED]: 'Tenant notified',
  [RENT_REVIEW_AGENT_STEP.TENANT_DECISION]: 'Tenant decision',
  [RENT_REVIEW_AGENT_STEP.COMPLETED]: 'Completed',
};

export const RENT_RESEARCH_PLATFORMS = ['Hartracing', 'RP DATA', 'REA'] as const;

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
  return (
    auditHas(detail, 'ai_report_ready') ||
    detail.workflowState !== 'pending_confirmation' ||
    detail.ai.suggestedWeekly != null
  );
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
  if (hasTenantNoticeSent(detail)) return false;
  return detail.workflowState === 'agent_review' || detail.workflowState === 'negotiation';
}

/** Formal increase notice has been dispatched to the tenant. */
export function hasTenantNoticeSent(detail: RentReviewWorkflowDetail): boolean {
  return auditHas(detail, 'tenant_notices_dispatched');
}

/** Agent may dispatch the formal increase notice (backend: `agent_review` only). */
export function canSendTenantNotice(detail: RentReviewWorkflowDetail): boolean {
  if (hasTenantNoticeSent(detail)) return false;
  if (!hasAgentPricingFinalized(detail)) return false;
  if (detail.workflowState !== 'agent_review') return false;
  return detail.proposedWeeklyRent != null || detail.ai.suggestedWeekly != null;
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
  const researchDone = hasResearchComplete(detail);
  const emailSent = auditHas(detail, 'ai_report_ready') || researchDone;
  const landlordEmailed = hasLandlordResearchEmailed(detail);
  return [
    {
      id: 'platforms',
      label: `Market research (${RENT_RESEARCH_PLATFORMS.join(', ')})`,
      done: researchDone,
    },
    {
      id: 'email-agent',
      label: 'Research results emailed to agent',
      done: emailSent,
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
  const hasCounter = detail.tenantCounterWeekly != null;
  const pricingFinalized = hasAgentPricingFinalized(detail);
  const noticeSent = hasTenantNoticeSent(detail);
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
      label: hasCounter
        ? 'Review tenant counter-offer'
        : pricingFinalized
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
      id: 'counter',
      label: noticeSent
        ? 'Tenant notified — decision locked'
        : hasCounter
          ? `Tenant counter: $${detail.tenantCounterWeekly}/wk`
          : pricingFinalized
            ? 'Ready to notify tenant'
            : 'Awaiting agent decision',
      done: noticeSent || pricingFinalized,
    },
  ];
}

function tenantNotifiedSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const noticeAt = auditAt(detail, 'tenant_notices_dispatched');
  const reminderCount = detail.auditLog.filter((e) => e.kind === 'tenant_response_reminder').length;
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
      label: hasTenantDecision(detail)
        ? 'Tenant response recorded'
        : noticeAt
          ? `Awaiting tenant response since ${noticeAt.slice(0, 10)}`
          : 'Awaiting tenant response',
      done: hasTenantDecision(detail),
    },
  ];
}

function tenantDecisionSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const accepted = isTenantDecisionAccepted(detail);
  const rejected = isTenantDecisionRejected(detail);
  const counter = auditHas(detail, 'tenant_counter_submitted');
  const accounting = detail.workflowState === 'accounting' || auditHas(detail, 'accounting_handoff');
  const preferredFixed = detail.preferredLeaseType === 'fixed';
  const leaseSteps = preferredFixed && accepted
    ? [
        {
          id: 'lease-preparing',
          label: 'Lease agreement preparing',
          done: auditHas(detail, 'tenant_accepted_response') || auditHas(detail, 'agent_accepted_tenant_counter'),
        },
        {
          id: 'lease-sent',
          label: 'Lease agreement sent',
          done: accounting || auditHas(detail, 'ledger_complete'),
        },
        {
          id: 'lease-signed',
          label: 'Lease agreement signed',
          done: auditHas(detail, 'ledger_complete') || hasCompleted(detail),
        },
      ]
    : [];

  return [
    {
      id: 'response',
      label: accepted
        ? 'Tenant accepted increase'
        : rejected
          ? `Tenant declined${detail.tenantMoveOutDate ? ` · move-out ${detail.tenantMoveOutDate}` : ''}`
          : counter
            ? `Tenant counter-offer${detail.tenantCounterWeekly != null ? `: $${detail.tenantCounterWeekly}/wk` : ''}`
            : 'Awaiting tenant accept / counter / decline',
      done: accepted || rejected,
    },
    {
      id: 'terms',
      label: accepted
        ? `New rent $${detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly}/wk · increase from ${detail.effectiveDate ?? 'TBC'}`
        : rejected
          ? 'Move-out date recorded'
          : 'Rent terms on acceptance',
      done: (accepted && detail.proposedWeeklyRent != null) || (rejected && detail.tenantMoveOutDate != null),
    },
    ...leaseSteps,
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
  const accounting =
    detail.workflowState === 'accounting' || auditHas(detail, 'accounting_handoff');
  const auditCount = detail.auditLog.length;
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
    case 'negotiation':
      if (!isRentResearchStepComplete(detail)) {
        return RENT_REVIEW_AGENT_STEP.RENT_RESEARCH;
      }
      return hasAgentPricingFinalized(detail)
        ? RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED
        : RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED;
    case 'tenant_notified':
      return RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED;
    case 'tenant_accepted':
    case 'tenant_rejected':
      return RENT_REVIEW_AGENT_STEP.TENANT_DECISION;
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

  const steps: RentReviewAgentStepState[] = RENT_REVIEW_AGENT_STEP_ORDER.map((id, idx) => ({
    id,
    label: RENT_REVIEW_AGENT_STEP_LABEL[id],
    status: idx < liveIdx ? 'done' : idx === liveIdx ? 'active' : 'upcoming',
    subProgress: subProgressForStep(id, detail),
    workflowName: 'Rent review',
  }));

  if (detail.workflowState === 'completed') {
    for (const step of steps) {
      step.status = 'done';
    }
  }

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progressFillIndex =
    detail.workflowState === 'completed'
      ? steps.length - 1
      : Math.max(0, doneCount - 0.5);

  return { steps, liveStepId, progressFillIndex };
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
  const weekly = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent;
  return {
    id: hit.id,
    subject: `Notice of rent increase — ${detail.propertyAddress}`,
    from: 'Managing Agent',
    to: detail.tenantName,
    at: hit.at,
    kind: hit.kind,
    body:
      `Dear ${detail.tenantName},\n\n` +
      `Please find attached your formal Notice of Rent Increase.\n\n` +
      `Proposed new rent: $${weekly}/week\n` +
      `Effective date: ${detail.effectiveDate ?? 'as per notice'}\n\n` +
      `Please reply to confirm acceptance or discuss any concerns.\n\n` +
      (hit.detail ?? ''),
  };
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
      `Proposed rent: $${detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly}/week`,
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
    rent_research: ['ai_report_ready', 'agent_confirmation_reminder', 'statutory_notice_alert', 'landlord_research_email'],
    agent_confirmed: [
      'review_confirmed',
      'pricing_snapshot',
      'tenant_counter_submitted',
      'agent_accepted_tenant_counter',
      'agent_reproposed_after_counter',
    ],
    tenant_notified: ['tenant_notices_dispatched', 'tenant_response_reminder'],
    tenant_decision: [
      'tenant_counter_submitted',
      'agent_accepted_tenant_counter',
      'agent_reproposed_after_counter',
      'tenant_accepted_response',
      'tenant_rejected_response',
      'accounting_handoff',
    ],
  };
  const kinds = kindsByStep[step];
  return detail.auditLog.filter((e) => kinds.includes(e.kind));
}
