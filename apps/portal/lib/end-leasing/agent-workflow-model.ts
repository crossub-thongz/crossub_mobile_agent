import { TERMINATION_TYPE, TENANT_SETTLEMENT_CONFIRMATION } from '@/constants/end-leasing';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';

export const END_LEASING_AGENT_STEP = {
  OVERVIEW: 'overview',
  VACATING_PREPARATION: 'vacating_preparation',
  OUTGOING_ARRANGEMENT: 'outgoing_arrangement',
  OUTGOING_INSPECTION: 'outgoing_inspection',
  REPORT_COMPARISON: 'report_comparison',
  SUMMARY_DISTRIBUTION: 'summary_distribution',
  BOND_SETTLEMENT: 'bond_settlement',
} as const;

export type EndLeasingAgentStep =
  (typeof END_LEASING_AGENT_STEP)[keyof typeof END_LEASING_AGENT_STEP];

export const END_LEASING_AGENT_STEP_ORDER: EndLeasingAgentStep[] = [
  END_LEASING_AGENT_STEP.OVERVIEW,
  END_LEASING_AGENT_STEP.VACATING_PREPARATION,
  END_LEASING_AGENT_STEP.OUTGOING_ARRANGEMENT,
  END_LEASING_AGENT_STEP.OUTGOING_INSPECTION,
  END_LEASING_AGENT_STEP.REPORT_COMPARISON,
  END_LEASING_AGENT_STEP.SUMMARY_DISTRIBUTION,
  END_LEASING_AGENT_STEP.BOND_SETTLEMENT,
];

export const END_LEASING_AGENT_STEP_LABEL: Record<EndLeasingAgentStep, string> = {
  [END_LEASING_AGENT_STEP.OVERVIEW]: 'Overview',
  [END_LEASING_AGENT_STEP.VACATING_PREPARATION]: 'Vacating',
  [END_LEASING_AGENT_STEP.OUTGOING_ARRANGEMENT]: 'Arrange',
  [END_LEASING_AGENT_STEP.OUTGOING_INSPECTION]: 'Outgoing',
  [END_LEASING_AGENT_STEP.REPORT_COMPARISON]: 'Compare',
  [END_LEASING_AGENT_STEP.SUMMARY_DISTRIBUTION]: 'Summary',
  [END_LEASING_AGENT_STEP.BOND_SETTLEMENT]: 'Bond',
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

function timelineLabel(caseData: TerminationCaseDetail, pattern: RegExp): string | null {
  const hit = caseData.timeline.find((e) => pattern.test(e.label));
  return hit?.label ?? null;
}

function timelineAt(caseData: TerminationCaseDetail, pattern: RegExp): string | null {
  const hit = caseData.timeline.find((e) => pattern.test(e.label));
  return hit?.timestamp ?? null;
}

/** Build the tenant notice email view from the termination case API payload. */
export function buildTenantNoticeEmailView(
  caseData: TerminationCaseDetail,
): TenantNoticeEmailView {
  const stored = caseData.overviewEmail;
  if (stored?.body) {
    return {
      from: stored.from ?? caseData.agentName ?? 'CROSSUB',
      to: stored.to ?? caseData.tenant.email ?? '—',
      subject: stored.subject ?? `End leasing — ${caseData.property.address}`,
      receivedAt: stored.sentAt ?? caseData.createdAt,
      body: stored.body,
      commConversationId: stored.commConversationId,
    };
  }

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
    from: caseData.agentName ?? 'CROSSUB',
    to: tenantEmail,
    subject: `Notice to terminate tenancy — ${caseData.property.address}`,
    receivedAt: notice?.noticeEmailSentAt ?? receivedAt,
    body: [
      `Statutory termination notice issued to ${tenantName}.`,
      notice?.groundLabel ? `Ground: ${notice.groundLabel}` : null,
      notice?.terminationDate
        ? `Proposed termination date: ${notice.terminationDate.slice(0, 10)}`
        : null,
      notice?.tenantVacateDate
        ? `Tenant advised vacate date: ${notice.tenantVacateDate.slice(0, 10)}`
        : 'Awaiting tenant vacate date confirmation.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function vacatingPreparationSubProgress(
  caseData: TerminationCaseDetail,
): EndLeasingSubProgressItem[] {
  const noticeSent =
    caseData.terminationType === TERMINATION_TYPE.TENANT_INITIATED
      ? Boolean(
          timelineLabel(caseData, /notice to vacate|vacating notice|acknowledg/i) ||
            caseData.vacate.noticeEffectiveDate,
        )
      : Boolean(caseData.terminationNotice?.emailSent);
  const vacateDateConfirmed = Boolean(
    caseData.vacate.expectedVacateDate ?? caseData.vacateDate ?? caseData.terminationNotice?.tenantVacateDate,
  );
  const keyDateConfirmed = Boolean(
    caseData.vacate.actualVacateDate ?? caseData.vacate.possessionRegainedDate,
  );
  const cleaningConfirmed =
    caseData.vacatingPreparation?.exitCleaningConfirmed ||
    caseData.makeGood.status === DONE ||
    caseData.makeGood.qaComplete ||
    timelineLabel(caseData, /clean/i) != null;

  return [
    { id: 'notice', label: 'Vacating notice sent to tenant', done: noticeSent },
    { id: 'vacate_date', label: 'Move-out date confirmed', done: vacateDateConfirmed },
    { id: 'key_date', label: 'Key return date confirmed', done: keyDateConfirmed },
    { id: 'cleaning', label: 'Exit cleaning confirmed', done: cleaningConfirmed },
  ];
}

function outgoingArrangementSubProgress(
  caseData: TerminationCaseDetail,
): EndLeasingSubProgressItem[] {
  const dateCommunicated = Boolean(caseData.inspection.inspectionDate);
  const attendanceConfirmed =
    caseData.inspection.tenantAttendance === 'yes' ||
    caseData.inspection.tenantAttendance === 'no';

  return [
    { id: 'inform', label: 'Inform tenant of outgoing inspection date', done: dateCommunicated },
    { id: 'attendance', label: 'Confirm tenant attendance', done: attendanceConfirmed },
  ];
}

function outgoingInspectionSubProgress(
  caseData: TerminationCaseDetail,
): EndLeasingSubProgressItem[] {
  return [
    {
      id: 'schedule',
      label: 'Outgoing inspection scheduled',
      done: Boolean(caseData.inspection.inspectionDate),
    },
    {
      id: 'conduct',
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
    (rc.agentAcknowledged && rc.tenantAcknowledged) ||
    caseData.inspection.reportAvailable;
  const drafted = Boolean(rc.draftSummaryEmail?.body);
  const quoted =
    rc.tenantResponsibility.length > 0 ||
    rc.landlordResponsibility.length > 0 ||
    caseData.makeGood.estimatedDeductions > 0;

  return [
    { id: 'compare', label: 'Compare ingoing and outgoing reports', done: compared },
    { id: 'draft', label: 'Draft summary', done: drafted },
    { id: 'quote', label: 'Obtain repair quote', done: quoted },
  ];
}

function summaryDistributionSubProgress(
  caseData: TerminationCaseDetail,
): EndLeasingSubProgressItem[] {
  const sentToTenant =
    caseData.tenantConfirmation.status !== TENANT_SETTLEMENT_CONFIRMATION.PENDING ||
    Boolean(caseData.tenantConfirmation.dueAt);
  const sentToAgent =
    caseData.agentApproval.status !== LEASING_ITEM_STATUS.NOT_STARTED ||
    caseData.settlement.managerApprovalComplete;

  return [
    { id: 'tenant', label: 'Summary & quote sent to tenant', done: sentToTenant },
    { id: 'agent', label: 'Summary & quote sent to agent', done: sentToAgent },
  ];
}

function bondSettlementSubProgress(caseData: TerminationCaseDetail): EndLeasingSubProgressItem[] {
  const rentReviewed = caseData.settlement.deductions.some((d) => /rent/i.test(d.category));
  const billsChecked = caseData.settlement.deductions.length > 0;
  const repairsApplied = caseData.makeGood.status === DONE;
  const bondCalculated =
    caseData.settlement.status === DONE || caseData.bond.status === DONE;

  return [
    {
      id: 'rent_paid',
      label: 'Rent paid-to reviewed',
      done: rentReviewed || caseData.settlement.status !== LEASING_ITEM_STATUS.NOT_STARTED,
    },
    { id: 'bills', label: 'Outstanding bills checked', done: billsChecked },
    { id: 'repairs', label: 'Repair costs applied', done: repairsApplied },
    { id: 'bond', label: 'Bond deduction calculated', done: bondCalculated },
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
    case END_LEASING_AGENT_STEP.OVERVIEW:
      return caseData.terminationType === TERMINATION_TYPE.TENANT_INITIATED
        ? 'Tenant move-out notice received'
        : 'Termination notice issued';
    case END_LEASING_AGENT_STEP.VACATING_PREPARATION:
      if (next?.id === 'notice') return 'Send vacating notice to tenant';
      if (next?.id === 'vacate_date') return 'Confirm move-out date';
      if (next?.id === 'key_date') return 'Confirm key return date';
      if (next?.id === 'cleaning') return 'Confirm exit cleaning';
      return 'Vacating notice sent · outgoing arranged';
    case END_LEASING_AGENT_STEP.OUTGOING_ARRANGEMENT:
      if (next?.id === 'inform') return 'Inform tenant of outgoing inspection date';
      if (next?.id === 'attendance') return 'Confirm tenant will attend outgoing';
      return 'Calculate bond from rent paid-to, bills & repairs';
    case END_LEASING_AGENT_STEP.OUTGOING_INSPECTION:
      if (caseData.inspection.status === DONE) return 'Claim bond / release bond';
      return 'Conduct outgoing inspection';
    case END_LEASING_AGENT_STEP.REPORT_COMPARISON:
      if (caseData.makeGood.status === DONE) return 'Completed';
      return 'Compare reports · draft summary · get quote';
    case END_LEASING_AGENT_STEP.SUMMARY_DISTRIBUTION:
      return 'Send summary & quote to tenant and agent';
    case END_LEASING_AGENT_STEP.BOND_SETTLEMENT:
      if (caseData.bond.refundPaid) return 'Bond released';
      return 'Calculate bond deduction from rent, bills & maintenance';
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
    case END_LEASING_AGENT_STEP.OVERVIEW:
      return true;
    case END_LEASING_AGENT_STEP.VACATING_PREPARATION:
      return subProgress.every((i) => i.done) || caseData.inspection.inspectionDate != null;
    case END_LEASING_AGENT_STEP.OUTGOING_ARRANGEMENT:
      return subProgress.every((i) => i.done) || caseData.inspection.status === DONE;
    case END_LEASING_AGENT_STEP.OUTGOING_INSPECTION:
      return caseData.inspection.status === DONE;
    case END_LEASING_AGENT_STEP.REPORT_COMPARISON:
      return caseData.makeGood.status === DONE;
    case END_LEASING_AGENT_STEP.SUMMARY_DISTRIBUTION:
      return (
        caseData.settlement.status === DONE ||
        caseData.tenantConfirmation.status === TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED
      );
    case END_LEASING_AGENT_STEP.BOND_SETTLEMENT:
      return caseData.bond.status === DONE;
    default:
      return false;
  }
}

function resolveLiveStep(steps: EndLeasingAgentStepState[]): EndLeasingAgentStep {
  const active = steps.find((s) => s.status === 'active');
  if (active) return active.id;
  const firstUpcoming = steps.find((s) => s.status === 'upcoming');
  if (firstUpcoming) return firstUpcoming.id;
  return END_LEASING_AGENT_STEP.BOND_SETTLEMENT;
}

export function buildEndLeasingAgentWorkflow(
  caseData: TerminationCaseDetail,
): EndLeasingAgentWorkflowModel {
  const subByStep: Record<EndLeasingAgentStep, EndLeasingSubProgressItem[]> = {
    [END_LEASING_AGENT_STEP.OVERVIEW]: [
      {
        id: 'received',
        label: 'Tenant move-out notice received',
        done: true,
      },
    ],
    [END_LEASING_AGENT_STEP.VACATING_PREPARATION]: vacatingPreparationSubProgress(caseData),
    [END_LEASING_AGENT_STEP.OUTGOING_ARRANGEMENT]: outgoingArrangementSubProgress(caseData),
    [END_LEASING_AGENT_STEP.OUTGOING_INSPECTION]: outgoingInspectionSubProgress(caseData),
    [END_LEASING_AGENT_STEP.REPORT_COMPARISON]: reportComparisonSubProgress(caseData),
    [END_LEASING_AGENT_STEP.SUMMARY_DISTRIBUTION]: summaryDistributionSubProgress(caseData),
    [END_LEASING_AGENT_STEP.BOND_SETTLEMENT]: bondSettlementSubProgress(caseData),
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
  };
}
