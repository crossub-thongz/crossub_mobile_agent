import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';

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
  [RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED]: 'Agent confirmed',
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

export interface RentReviewEmailRecord {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  at: string;
  kind: string;
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

function hasTenantNoticeSent(detail: RentReviewWorkflowDetail): boolean {
  return auditHas(detail, 'tenant_notices_dispatched');
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
      id: 'amounts',
      label: `Current ${detail.currentWeeklyRent}/wk · recommended ${detail.ai.suggestedWeekly ?? detail.proposedWeeklyRent ?? '—'}/wk`,
      done: researchDone && detail.ai.suggestedWeekly != null,
    },
  ];
}

function agentConfirmedSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const hasCounter = detail.tenantCounterWeekly != null;
  const pricingFinalized = hasAgentPricingFinalized(detail);
  return [
    {
      id: 'agent-confirm',
      label: hasCounter ? 'Review tenant counter-offer' : 'Agent confirmed proposed rent',
      done: pricingFinalized,
    },
    {
      id: 'landlord',
      label: 'Landlord recommendation recorded',
      done: pricingFinalized,
    },
    {
      id: 'counter',
      label: hasCounter
        ? `Tenant counter: $${detail.tenantCounterWeekly}/wk — revise or accept`
        : pricingFinalized
          ? 'Ready to notify tenant'
          : 'Awaiting agent confirmation',
      done: pricingFinalized,
    },
  ];
}

function tenantNotifiedSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const noticeAt = auditAt(detail, 'tenant_notices_dispatched');
  const reminderCount = detail.auditLog.filter((e) => e.kind === 'tenant_response_reminder').length;
  return [
    {
      id: 'notice',
      label: 'Formal rent increase notice sent to tenant',
      done: hasTenantNoticeSent(detail),
    },
    {
      id: 'reminders',
      label:
        reminderCount > 0
          ? `${reminderCount} reminder email${reminderCount === 1 ? '' : 's'} sent (every 3 days)`
          : 'Auto-reminder every 3 days if no reply',
      done: reminderCount > 0,
    },
    {
      id: 'awaiting',
      label: noticeAt ? `Notice sent ${noticeAt.slice(0, 10)}` : 'Awaiting tenant response',
      done: hasTenantDecision(detail),
    },
  ];
}

function tenantDecisionSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  const accepted = detail.workflowState === 'tenant_accepted' || auditHas(detail, 'tenant_accepted_response');
  const rejected = detail.workflowState === 'tenant_rejected' || auditHas(detail, 'tenant_rejected_response');
  const accounting = detail.workflowState === 'accounting' || auditHas(detail, 'accounting_handoff');
  return [
    {
      id: 'response',
      label: accepted
        ? 'Tenant accepted increase'
        : rejected
          ? 'Tenant rejected — move-out or counter path'
          : 'Awaiting tenant accept / reject / counter',
      done: accepted || rejected,
    },
    {
      id: 'rent-update',
      label: accepted
        ? `New rent $${detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly}/wk from ${detail.effectiveDate ?? 'TBC'}`
        : 'Rent & effective date update on acceptance',
      done: accepted && detail.proposedWeeklyRent != null,
    },
    {
      id: 'accounting',
      label: accounting ? 'Submitted to accounting' : 'Accounting sync pending',
      done: accounting || hasCompleted(detail),
    },
  ];
}

function completedSubProgress(detail: RentReviewWorkflowDetail): RentReviewSubProgressItem[] {
  return [
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
      return hasAgentPricingFinalized(detail)
        ? RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED
        : RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED;
    case 'tenant_notified':
      return RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED;
    case 'tenant_accepted':
    case 'tenant_rejected':
    case 'accounting':
      return RENT_REVIEW_AGENT_STEP.TENANT_DECISION;
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

export function emailRecordsFromAudit(detail: RentReviewWorkflowDetail): RentReviewEmailRecord[] {
  const records: RentReviewEmailRecord[] = [];
  if (detail.workflowState !== 'pending_confirmation' || detail.ai.suggestedWeekly != null) {
    records.push(buildResearchEmailToAgent(detail));
  }
  const notice = buildTenantNoticeEmail(detail);
  if (notice) records.push(notice);
  for (const entry of detail.auditLog) {
    if (entry.kind === 'tenant_response_reminder') {
      records.push({
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
      });
    }
  }
  const completion = buildCompletionEmail(detail);
  if (completion) records.push(completion);
  return records;
}

export function auditEntriesForStep(
  detail: RentReviewWorkflowDetail,
  step: RentReviewAgentStep,
): RentReviewAuditEntry[] {
  const kindsByStep: Record<RentReviewAgentStep, string[]> = {
    rent_research: ['ai_report_ready', 'agent_confirmation_reminder', 'statutory_notice_alert'],
    agent_confirmed: [
      'review_confirmed',
      'pricing_snapshot',
      'tenant_counter_submitted',
      'agent_accepted_tenant_counter',
      'agent_reproposed_after_counter',
    ],
    tenant_notified: ['tenant_notices_dispatched', 'tenant_response_reminder'],
    tenant_decision: [
      'tenant_accepted_response',
      'tenant_rejected_response',
      'accounting_handoff',
    ],
    completed: ['ledger_complete'],
  };
  const kinds = kindsByStep[step];
  return detail.auditLog.filter((e) => kinds.includes(e.kind));
}
