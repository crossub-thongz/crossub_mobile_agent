import { TERMINATION_TYPE, TENANT_SETTLEMENT_CONFIRMATION } from '@/constants/end-leasing';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { EndLeasingOverviewEmail, TerminationCaseDetail } from '@/lib/end-leasing/types';

/** Six-stage end-leasing flow (manager spec). */
export const END_LEASING_AGENT_STEP = {
  VACATE_CONFIRMED: 'vacate_confirmed',
  OUTGOING_INSPECTION: 'outgoing_inspection',
  REPORT_COMPARISON: 'report_comparison',
  GET_QUOTE: 'get_quote',
  RESULT_CONFIRMED: 'result_confirmed',
  BOND_RELEASED: 'bond_released',
} as const;

export type EndLeasingAgentStep =
  (typeof END_LEASING_AGENT_STEP)[keyof typeof END_LEASING_AGENT_STEP];

export const END_LEASING_AGENT_STEP_ORDER: EndLeasingAgentStep[] = [
  END_LEASING_AGENT_STEP.VACATE_CONFIRMED,
  END_LEASING_AGENT_STEP.OUTGOING_INSPECTION,
  END_LEASING_AGENT_STEP.REPORT_COMPARISON,
  END_LEASING_AGENT_STEP.GET_QUOTE,
  END_LEASING_AGENT_STEP.RESULT_CONFIRMED,
  END_LEASING_AGENT_STEP.BOND_RELEASED,
];

export const END_LEASING_AGENT_STEP_LABEL: Record<EndLeasingAgentStep, string> = {
  [END_LEASING_AGENT_STEP.VACATE_CONFIRMED]: 'Vacate',
  [END_LEASING_AGENT_STEP.OUTGOING_INSPECTION]: 'Outgoing',
  [END_LEASING_AGENT_STEP.REPORT_COMPARISON]: 'Compare',
  [END_LEASING_AGENT_STEP.GET_QUOTE]: 'Quote',
  [END_LEASING_AGENT_STEP.RESULT_CONFIRMED]: 'Confirm',
  [END_LEASING_AGENT_STEP.BOND_RELEASED]: 'Bond',
};

export interface EndLeasingSubProgressItem {
  id: string;
  label: string;
  done: boolean;
}

export interface EndLeasingAgentStepState {
  id: EndLeasingAgentStep;
  label: string;
  status: 'done' | 'active' | 'upcoming';
  subProgress: EndLeasingSubProgressItem[];
  workflowName: string;
}

export interface EndLeasingAgentWorkflowModel {
  steps: EndLeasingAgentStepState[];
  liveStepId: EndLeasingAgentStep;
  progressFillIndex: number;
  tenantNoticeEmail: TenantNoticeEmailView | null;
  vacatingInfoReplyEmail: TenantNoticeEmailView | null;
}

export interface TenantNoticeEmailView {
  from: string;
  to: string;
  subject: string;
  receivedAt: string | null;
  body: string;
  commConversationId?: string;
}

const DONE = LEASING_ITEM_STATUS.DONE;

function timelineAt(caseData: TerminationCaseDetail, pattern: RegExp): string | null {
  const hit = caseData.timeline.find((e) => pattern.test(e.label));
  return hit?.timestamp ?? null;
}

function leaseTypeLabel(caseData: TerminationCaseDetail): string {
  if (!caseData.leaseEndDate) return 'Periodic';
  const end = new Date(caseData.leaseEndDate);
  if (Number.isNaN(end.getTime())) return 'Fixed term';
  return end.getTime() >= Date.now() ? 'Fixed term' : 'Expired fixed term';
}

function breachStatusLabel(caseData: TerminationCaseDetail): string {
  if (caseData.terminationType === TERMINATION_TYPE.TENANT_INITIATED) {
    return 'No breach — tenant initiated vacate';
  }
  const notice = caseData.terminationNotice;
  if (notice?.ground === 'breach' || notice?.ground === 'non_payment') {
    return notice.groundLabel ?? 'Breach';
  }
  if (notice?.breachClause || notice?.breachConduct) return 'Breach noted';
  return notice?.groundLabel ?? 'No breach recorded';
}

/** Tenant vacate notice email (inbound). */
export function buildTenantNoticeEmailView(
  caseData: TerminationCaseDetail,
): TenantNoticeEmailView {
  const tenantEmail = caseData.tenant.email ?? '—';
  const tenantName = caseData.tenant.name || 'Tenant';
  const vacateDate = caseData.vacate.expectedVacateDate ?? caseData.vacateDate ?? '';
  const receivedAt =
    timelineAt(caseData, /tenant|vacat|notice|email|intention/i) ?? caseData.createdAt;

  if (caseData.terminationType === TERMINATION_TYPE.TENANT_INITIATED) {
    const reason = caseData.terminationReason?.trim();
    return {
      from: tenantEmail,
      to: caseData.agentName ? `${caseData.agentName} (agent)` : 'Property manager',
      subject: `Notice to vacate — ${caseData.property.address}`,
      receivedAt,
      body: [
        `Hi,`,
        ``,
        reason ||
          `I am writing to advise that I intend to vacate the property at ${caseData.property.address}.`,
        vacateDate ? `\nMy expected vacate date is ${vacateDate.slice(0, 10)}.` : '',
        ``,
        `Please let me know the next steps for key return and the outgoing inspection.`,
        ``,
        tenantName,
      ]
        .filter((line) => line !== '')
        .join('\n'),
    };
  }

  const notice = caseData.terminationNotice;
  return {
    from: tenantEmail,
    to: caseData.agentName ? `${caseData.agentName} (agent)` : 'Property manager',
    subject: `Vacate date advised — ${caseData.property.address}`,
    receivedAt: notice?.tenantVacateDateProvidedAt ?? receivedAt,
    body: [
      `Tenant ${tenantName} advised vacate date.`,
      notice?.tenantVacateDate
        ? `Vacate date: ${notice.tenantVacateDate.slice(0, 10)}`
        : 'Awaiting vacate date.',
    ].join('\n'),
  };
}

/** Agent vacating information reply to tenant (outbound). */
export function buildVacatingInfoReplyEmailView(
  caseData: TerminationCaseDetail,
): TenantNoticeEmailView | null {
  const stored = caseData.overviewEmail;
  if (!stored?.body) return null;
  return {
    from: stored.from ?? caseData.agentName ?? 'CROSSUB',
    to: stored.to ?? caseData.tenant.email ?? '—',
    subject: stored.subject ?? `Vacating information — ${caseData.property.address}`,
    receivedAt: stored.sentAt ?? caseData.createdAt,
    body: stored.body,
    commConversationId: stored.commConversationId,
  };
}

function vacateConfirmedSubProgress(
  caseData: TerminationCaseDetail,
): EndLeasingSubProgressItem[] {
  const vacateDateConfirmed = Boolean(
    caseData.vacate.expectedVacateDate ??
      caseData.vacateDate ??
      caseData.terminationNotice?.tenantVacateDate,
  );
  const tenantNoticeReceived = true;
  const vacatingReplySent = Boolean(caseData.overviewEmail?.sentAt);

  return [
    { id: 'lease', label: 'Lease expiry & bond reviewed', done: Boolean(caseData.bondHeld) },
    { id: 'vacate_date', label: 'Vacate date confirmed', done: vacateDateConfirmed },
    { id: 'tenant_notice', label: 'Vacate notice from tenant recorded', done: tenantNoticeReceived },
    { id: 'vacating_reply', label: 'Vacating information reply sent to tenant', done: vacatingReplySent },
  ];
}

function outgoingInspectionSubProgress(
  caseData: TerminationCaseDetail,
): EndLeasingSubProgressItem[] {
  const attendanceConfirmed =
    caseData.inspection.tenantAttendance === 'yes' ||
    caseData.inspection.tenantAttendance === 'no';

  return [
    {
      id: 'date',
      label: 'Outgoing inspection date set',
      done: Boolean(caseData.inspection.inspectionDate),
    },
    {
      id: 'attendance',
      label: 'Tenant attendance confirmed',
      done: attendanceConfirmed,
    },
    {
      id: 'inspector',
      label: 'Inspector assigned',
      done: Boolean(caseData.inspection.inspectorName),
    },
    {
      id: 'complete',
      label: 'Outgoing inspection completed',
      done: caseData.inspection.status === DONE,
    },
  ];
}

function reportComparisonSubProgress(
  caseData: TerminationCaseDetail,
): EndLeasingSubProgressItem[] {
  const rc = caseData.reportComparison;
  const compared =
    (rc.agentAcknowledged && rc.tenantAcknowledged) || caseData.inspection.reportAvailable;
  const responsibilitiesDefined =
    rc.tenantResponsibility.length > 0 || rc.landlordResponsibility.length > 0;
  const tenantSummarySent = Boolean(rc.tenantComparisonSummaryEmail?.sentAt);
  const agentSummarySent = Boolean(rc.agentComparisonSummaryEmail?.sentAt);

  return [
    { id: 'complete', label: 'Outgoing inspection completion date recorded', done: caseData.inspection.status === DONE },
    { id: 'compare', label: 'Ingoing/outgoing reports compared', done: compared },
    { id: 'responsibility', label: 'Landlord & tenant responsibility defined', done: responsibilitiesDefined },
    { id: 'tenant_email', label: 'Tenant responsibility summary sent to tenant', done: tenantSummarySent },
    { id: 'agent_email', label: 'Full summary sent to agent', done: agentSummarySent },
  ];
}

function getQuoteSubProgress(caseData: TerminationCaseDetail): EndLeasingSubProgressItem[] {
  const rc = caseData.reportComparison;
  const quotesEntered =
    rc.tenantResponsibility.some((i) => i.quote?.trim()) ||
    rc.landlordResponsibility.some((i) => i.quote?.trim()) ||
    caseData.makeGood.estimatedDeductions > 0;
  const handymanAssigned =
    rc.tenantResponsibility.some((i) => i.handymanId || i.handymanName?.trim()) ||
    rc.landlordResponsibility.some((i) => i.handymanId || i.handymanName?.trim());
  const sentToAgent = Boolean(rc.agentRepairQuoteEmail?.sentAt ?? rc.landlordRepairQuoteEmail?.sentAt);

  return [
    { id: 'quotes', label: 'Repair quotes entered', done: quotesEntered },
    { id: 'handyman', label: 'Handyman assigned', done: handymanAssigned },
    { id: 'agent', label: 'Landlord & tenant quotes sent to agent', done: sentToAgent },
  ];
}

function resultConfirmedSubProgress(caseData: TerminationCaseDetail): EndLeasingSubProgressItem[] {
  const rc = caseData.reportComparison;
  const agentConfirmed = Boolean(rc.agentQuoteConfirmed);
  const tenantQuoteSent = Boolean(rc.tenantRepairQuoteEmail?.sentAt);
  const tenantResponded =
    rc.tenantQuoteResponse === 'accepted' || rc.tenantQuoteResponse === 'declined';

  return [
    { id: 'agent_confirm', label: 'Agent confirmed figures', done: agentConfirmed },
    { id: 'tenant_quote', label: 'Tenant portion sent to tenant', done: tenantQuoteSent },
    { id: 'tenant_reply', label: 'Tenant response recorded', done: tenantResponded },
  ];
}

function bondReleasedSubProgress(caseData: TerminationCaseDetail): EndLeasingSubProgressItem[] {
  const rentReviewed = caseData.settlement.deductions.some((d) => /rent/i.test(d.category));
  const billsChecked = caseData.settlement.deductions.some((d) => /bill|water|utility/i.test(d.category));
  const repairsApplied = caseData.settlement.deductions.some((d) => /repair|maintenance|make.?good/i.test(d.category));
  const bondReleased = caseData.bond.refundPaid || caseData.bond.status === DONE;

  return [
    { id: 'rent', label: 'Unpaid rent reviewed', done: rentReviewed || caseData.settlement.status !== LEASING_ITEM_STATUS.NOT_STARTED },
    { id: 'bills', label: 'Unpaid bills reviewed', done: billsChecked || caseData.settlement.deductions.length > 0 },
    { id: 'repairs', label: 'Tenant repair costs applied', done: repairsApplied || caseData.makeGood.status === DONE },
    { id: 'total', label: 'Total bond deduction calculated', done: caseData.settlement.status === DONE },
    { id: 'release', label: 'Agent confirmed bond released', done: bondReleased },
  ];
}

function subProgressRatio(items: EndLeasingSubProgressItem[]): number {
  if (items.length === 0) return 0;
  return items.filter((i) => i.done).length / items.length;
}

function workflowNameForStep(
  step: EndLeasingAgentStep,
  caseData: TerminationCaseDetail,
  subProgress: EndLeasingSubProgressItem[],
): string {
  const next = subProgress.find((i) => !i.done);
  switch (step) {
    case END_LEASING_AGENT_STEP.VACATE_CONFIRMED:
      if (next?.id === 'vacate_date') return 'Confirm vacate date';
      if (next?.id === 'vacating_reply') return 'Send vacating information to tenant';
      return 'Vacate date confirmed';
    case END_LEASING_AGENT_STEP.OUTGOING_INSPECTION:
      if (caseData.inspection.status === DONE) return 'Outgoing inspection complete';
      if (next?.id === 'attendance') return 'Confirm tenant attendance';
      return 'Schedule outgoing inspection';
    case END_LEASING_AGENT_STEP.REPORT_COMPARISON:
      return 'Compare ingoing/outgoing & define responsibility';
    case END_LEASING_AGENT_STEP.GET_QUOTE:
      return 'Obtain repair quotes & send to agent';
    case END_LEASING_AGENT_STEP.RESULT_CONFIRMED:
      if (!caseData.reportComparison.agentQuoteConfirmed) return 'Agent confirms figures';
      return 'Send tenant portion to tenant';
    case END_LEASING_AGENT_STEP.BOND_RELEASED:
      if (caseData.bond.refundPaid) return 'Bond released';
      return 'Calculate deductions & release bond';
    default:
      return caseData.nextAction;
  }
}

function stepComplete(
  step: EndLeasingAgentStep,
  caseData: TerminationCaseDetail,
  subProgress: EndLeasingSubProgressItem[],
): boolean {
  switch (step) {
    case END_LEASING_AGENT_STEP.VACATE_CONFIRMED:
      return (
        subProgress.every((i) => i.done) ||
        caseData.inspection.inspectionDate != null
      );
    case END_LEASING_AGENT_STEP.OUTGOING_INSPECTION:
      return caseData.inspection.status === DONE;
    case END_LEASING_AGENT_STEP.REPORT_COMPARISON:
      return subProgress.every((i) => i.done) || caseData.makeGood.status === DONE;
    case END_LEASING_AGENT_STEP.GET_QUOTE:
      return (
        subProgress.every((i) => i.done) ||
        Boolean(caseData.reportComparison.agentRepairQuoteEmail?.sentAt ?? caseData.reportComparison.landlordRepairQuoteEmail?.sentAt)
      );
    case END_LEASING_AGENT_STEP.RESULT_CONFIRMED:
      return (
        caseData.reportComparison.tenantQuoteResponse === 'accepted' ||
        caseData.settlement.status === DONE ||
        caseData.tenantConfirmation.status === TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED
      );
    case END_LEASING_AGENT_STEP.BOND_RELEASED:
      return caseData.bond.status === DONE || caseData.bond.refundPaid;
    default:
      return false;
  }
}

function resolveLiveStep(steps: EndLeasingAgentStepState[]): EndLeasingAgentStep {
  const active = steps.find((s) => s.status === 'active');
  if (active) return active.id;
  const firstUpcoming = steps.find((s) => s.status === 'upcoming');
  if (firstUpcoming) return firstUpcoming.id;
  return END_LEASING_AGENT_STEP.BOND_RELEASED;
}

export function buildEndLeasingAgentWorkflow(
  caseData: TerminationCaseDetail,
): EndLeasingAgentWorkflowModel {
  const subByStep: Record<EndLeasingAgentStep, EndLeasingSubProgressItem[]> = {
    [END_LEASING_AGENT_STEP.VACATE_CONFIRMED]: vacateConfirmedSubProgress(caseData),
    [END_LEASING_AGENT_STEP.OUTGOING_INSPECTION]: outgoingInspectionSubProgress(caseData),
    [END_LEASING_AGENT_STEP.REPORT_COMPARISON]: reportComparisonSubProgress(caseData),
    [END_LEASING_AGENT_STEP.GET_QUOTE]: getQuoteSubProgress(caseData),
    [END_LEASING_AGENT_STEP.RESULT_CONFIRMED]: resultConfirmedSubProgress(caseData),
    [END_LEASING_AGENT_STEP.BOND_RELEASED]: bondReleasedSubProgress(caseData),
  };

  const rawSteps = END_LEASING_AGENT_STEP_ORDER.map((id) => {
    const subProgress = subByStep[id];
    const complete = stepComplete(id, caseData, subProgress);
    return {
      id,
      label: END_LEASING_AGENT_STEP_LABEL[id],
      subProgress,
      workflowName: workflowNameForStep(id, caseData, subProgress),
      complete,
      ratio: subProgressRatio(subProgress),
    };
  });

  let foundActive = false;
  const steps: EndLeasingAgentStepState[] = rawSteps.map(({ complete, ratio: _ratio, ...step }) => {
    if (!foundActive && !complete) {
      foundActive = true;
      return { ...step, status: 'active' as const };
    }
    if (complete) {
      return { ...step, status: 'done' as const };
    }
    return { ...step, status: 'upcoming' as const };
  });

  const liveStepId = resolveLiveStep(steps);
  const liveIndex = END_LEASING_AGENT_STEP_ORDER.indexOf(liveStepId);
  const liveStep = rawSteps[liveIndex];
  const partial = liveStep && !liveStep.complete ? liveStep.ratio * 0.99 : 0;
  const lastDoneIndex = steps.reduce(
    (last, step, index) => (step.status === 'done' ? index : last),
    -1,
  );
  const progressFillIndex = Math.max(lastDoneIndex, liveIndex - 1 + partial);

  return {
    steps,
    liveStepId,
    progressFillIndex,
    tenantNoticeEmail: buildTenantNoticeEmailView(caseData),
    vacatingInfoReplyEmail: buildVacatingInfoReplyEmailView(caseData),
  };
}

export { leaseTypeLabel, breachStatusLabel };

export function isBreachLease(caseData: TerminationCaseDetail): boolean {
  if (caseData.terminationType === TERMINATION_TYPE.TENANT_INITIATED) return false;
  const notice = caseData.terminationNotice;
  if (notice?.ground === 'breach' || notice?.ground === 'non_payment') return true;
  return Boolean(notice?.breachClause?.trim() || notice?.breachConduct?.trim());
}

export function endOfAgreementExpiredLabel(caseData: TerminationCaseDetail): string {
  if (!caseData.leaseEndDate) return 'N/A — periodic';
  const end = new Date(caseData.leaseEndDate);
  if (Number.isNaN(end.getTime())) return '—';
  return end.getTime() < Date.now() ? 'Yes' : 'No';
}

export function endLeasingVacateDate(caseData: TerminationCaseDetail): string | null {
  return (
    caseData.vacate.expectedVacateDate ??
    caseData.vacateDate ??
    caseData.terminationNotice?.tenantVacateDate ??
    null
  );
}

export function endLeasingKeyReturnDate(caseData: TerminationCaseDetail): string | null {
  return caseData.vacate.possessionRegainedDate ?? caseData.vacate.actualVacateDate ?? null;
}

export function endLeasingKeyReturnTo(caseData: TerminationCaseDetail): string {
  return caseData.agencyName ?? caseData.assignedTeam ?? 'Agency office';
}

function storedEmailToRecord(
  id: string,
  email: EndLeasingOverviewEmail | null | undefined,
  kind: string,
  fallbackSubject: string,
  fallbackAt: string,
): JobCaseEmailRecord | null {
  if (!email?.body && !email?.sentAt) return null;
  return {
    id,
    subject: email.subject ?? fallbackSubject,
    body: email.body ?? '',
    from: email.from ?? 'Managing Agent',
    to: email.to ?? '—',
    at: email.sentAt ?? fallbackAt,
    kind,
  };
}

function emailRecordsForStepOnly(
  caseData: TerminationCaseDetail,
  step: EndLeasingAgentStep,
): JobCaseEmailRecord[] {
  const rc = caseData.reportComparison;
  switch (step) {
    case END_LEASING_AGENT_STEP.VACATE_CONFIRMED: {
      const tenantNotice = buildTenantNoticeEmailView(caseData);
      const records: JobCaseEmailRecord[] = [
        {
          id: `${caseData.id}-tenant-notice`,
          subject: tenantNotice.subject,
          body: tenantNotice.body,
          from: tenantNotice.from,
          to: tenantNotice.to,
          at: tenantNotice.receivedAt ?? caseData.createdAt,
          kind: 'tenant_notice',
        },
      ];
      const reply = buildVacatingInfoReplyEmailView(caseData);
      if (reply) {
        records.push({
          id: `${caseData.id}-vacating-reply`,
          subject: reply.subject,
          body: reply.body,
          from: reply.from,
          to: reply.to,
          at: reply.receivedAt ?? caseData.createdAt,
          kind: 'vacating_reply',
        });
      }
      return records;
    }
    case END_LEASING_AGENT_STEP.OUTGOING_INSPECTION:
      return [];
    case END_LEASING_AGENT_STEP.REPORT_COMPARISON: {
      const records: JobCaseEmailRecord[] = [];
      const tenantSummary = storedEmailToRecord(
        `${caseData.id}-tenant-comparison`,
        rc.tenantComparisonSummaryEmail,
        'tenant_comparison',
        'Tenant responsibility summary',
        caseData.createdAt,
      );
      const agentSummary = storedEmailToRecord(
        `${caseData.id}-agent-comparison`,
        rc.agentComparisonSummaryEmail,
        'agent_comparison',
        'Inspection comparison summary',
        caseData.createdAt,
      );
      if (tenantSummary) records.push(tenantSummary);
      if (agentSummary) records.push(agentSummary);
      return records;
    }
    case END_LEASING_AGENT_STEP.GET_QUOTE: {
      const records: JobCaseEmailRecord[] = [];
      const agentQuote = storedEmailToRecord(
        `${caseData.id}-agent-repair-quote`,
        rc.agentRepairQuoteEmail,
        'agent_repair_quote',
        'Repair quotes for agent',
        caseData.createdAt,
      );
      const landlordQuote = storedEmailToRecord(
        `${caseData.id}-landlord-repair-quote`,
        rc.landlordRepairQuoteEmail,
        'landlord_repair_quote',
        'Landlord repair quote',
        caseData.createdAt,
      );
      if (agentQuote) records.push(agentQuote);
      if (landlordQuote) records.push(landlordQuote);
      return records;
    }
    case END_LEASING_AGENT_STEP.RESULT_CONFIRMED: {
      const tenantQuote = storedEmailToRecord(
        `${caseData.id}-tenant-repair-quote`,
        rc.tenantRepairQuoteEmail,
        'tenant_repair_quote',
        'Tenant repair quote',
        caseData.createdAt,
      );
      return tenantQuote ? [tenantQuote] : [];
    }
    case END_LEASING_AGENT_STEP.BOND_RELEASED:
      return [];
    default:
      return [];
  }
}

export function allEndLeasingEmailRecords(caseData: TerminationCaseDetail): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  for (const step of END_LEASING_AGENT_STEP_ORDER) {
    records.push(...emailRecordsForStepOnly(caseData, step));
  }
  return dedupeJobCaseEmails(records);
}

export function endLeasingEmailRecordsForStep(
  caseData: TerminationCaseDetail,
  step: EndLeasingAgentStep,
): JobCaseEmailRecord[] {
  if (step === END_LEASING_AGENT_STEP.BOND_RELEASED) {
    return allEndLeasingEmailRecords(caseData);
  }
  return dedupeJobCaseEmails(emailRecordsForStepOnly(caseData, step));
}
