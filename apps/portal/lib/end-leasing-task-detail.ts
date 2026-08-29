import { TERMINATION_CASE_STATUS, TERMINATION_TYPE } from '@/constants/end-leasing';
import {
  buildEndLeasingAgentWorkflow,
  endLeasingVacateDate,
  type EndLeasingAgentWorkflowModel,
  END_LEASING_AGENT_STEP,
} from '@/lib/end-leasing/agent-workflow-model';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import {
  actualDaysNoticeToVacate,
  daysNotifyInAdvanceLabel,
  tenantNoticeDate,
} from '@/lib/end-leasing/vacate-display';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export const END_LEASING_TASK_STAGE_LABELS = [
  'Notice received',
  'Tenant vacating',
  'Pre-exit reminder',
  'Vacate confirmed',
  'Inspection scheduled',
  'Vacating inspection',
  'Bond processing',
  'Completed',
] as const;

export type EndLeasingTaskTab =
  | 'workflow'
  | 'details'
  | 'inspections'
  | 'activity'
  | 'documents'
  | 'notes';

export type EndLeasingTaskStageState = 'complete' | 'current' | 'pending';

const DONE = LEASING_ITEM_STATUS.DONE;

export function endLeasingTaskReference(caseId: string): string {
  return workflowCaseReferenceLabel(caseId, 'end_leasing');
}

export function resolveEndLeasingTaskStageIndex(
  caseData: TerminationCaseDetail,
  workflow: EndLeasingAgentWorkflowModel,
): number {
  if (caseData.status === TERMINATION_CASE_STATUS.COMPLETED) {
    return END_LEASING_TASK_STAGE_LABELS.length - 1;
  }

  const live = workflow.liveStepId;
  if (live === END_LEASING_AGENT_STEP.BOND_RELEASED) return 6;
  if (
    live === END_LEASING_AGENT_STEP.RESULT_CONFIRMED ||
    live === END_LEASING_AGENT_STEP.GET_QUOTE ||
    live === END_LEASING_AGENT_STEP.REPORT_COMPARISON
  ) {
    return 5;
  }

  if (live === END_LEASING_AGENT_STEP.OUTGOING_INSPECTION) {
    if (caseData.inspection.inspectionDate && caseData.inspection.status !== DONE) return 5;
    if (caseData.inspection.inspectionDate) return 4;
    return 4;
  }

  if (caseData.vacate.keysReturned) return 3;
  if (caseData.vacatingPreparation.exitCleaningConfirmed || caseData.vacate.expectedVacateDate) {
    return 2;
  }
  if (tenantNoticeDate(caseData) || caseData.vacateDate) return 1;
  return 0;
}

export function buildEndLeasingTaskStages(
  caseData: TerminationCaseDetail,
  workflow: EndLeasingAgentWorkflowModel,
): { label: string; state: EndLeasingTaskStageState; dateLabel?: string }[] {
  const currentIndex = resolveEndLeasingTaskStageIndex(caseData, workflow);
  const vacateDate = endLeasingVacateDate(caseData);
  const inspectionDate = caseData.inspection.inspectionDate;

  const stageDates: (string | undefined)[] = [
    caseData.createdAt ? formatDate(caseData.createdAt) : undefined,
    tenantNoticeDate(caseData) ? formatDate(tenantNoticeDate(caseData)!) : undefined,
    vacateDate ? formatDate(vacateDate) : undefined,
    caseData.vacate.keysReturned && vacateDate ? formatDate(vacateDate) : undefined,
    inspectionDate ? formatDate(inspectionDate) : undefined,
    inspectionDate ? formatDate(inspectionDate) : undefined,
    caseData.settlement.status === DONE ? formatDate(caseData.createdAt) : undefined,
    caseData.status === TERMINATION_CASE_STATUS.COMPLETED ? 'Done' : undefined,
  ];

  return END_LEASING_TASK_STAGE_LABELS.map((label, index) => {
    let state: EndLeasingTaskStageState = 'pending';
    if (index < currentIndex) state = 'complete';
    else if (index === currentIndex) state = 'current';
    return {
      label,
      state,
      dateLabel: stageDates[index],
    };
  });
}

export function resolveEndLeasingStatusBanner(
  caseData: TerminationCaseDetail,
  workflow: EndLeasingAgentWorkflowModel,
): {
  title: string;
  subtitle: string;
  needsAction: boolean;
  crosSummary: string[];
} {
  const liveStep = workflow.steps.find((step) => step.id === workflow.liveStepId);
  const pending = liveStep?.subProgress.filter((item) => !item.done) ?? [];
  const needsAction =
    caseData.status !== TERMINATION_CASE_STATUS.COMPLETED &&
    (pending.length > 0 ||
      /approv|confirm|review|action|attend/i.test(caseData.nextAction));

  const inspection = caseData.inspection;
  let title = liveStep?.workflowName ?? caseData.nextAction;
  let subtitle = caseData.nextAction;

  if (workflow.liveStepId === END_LEASING_AGENT_STEP.OUTGOING_INSPECTION && inspection.inspectionDate) {
    title = 'Vacating inspection scheduled';
    const parts = [
      inspection.inspectionDate ? formatDate(inspection.inspectionDate) : null,
      inspection.inspectorName ? `Inspector: ${inspection.inspectorName}` : null,
      caseData.vacate.keysReturnAddress
        ? `Keys: ${caseData.vacate.keysReturnAddress}`
        : null,
    ].filter(Boolean);
    subtitle = parts.join(' · ') || caseData.nextAction;
  }

  const crosSummary = [
    caseData.nextAction,
    pending[0] ? `Next: ${pending[0].label}` : null,
    caseData.refundAmount > 0
      ? `Estimated bond refund ${formatCurrency(caseData.refundAmount)}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return { title, subtitle, needsAction, crosSummary };
}

export function buildEndLeasingLeaseDetailRows(caseData: TerminationCaseDetail): {
  label: string;
  value: string;
}[] {
  const vacateDate = endLeasingVacateDate(caseData);
  const noticeDate = tenantNoticeDate(caseData);
  const actualDays = actualDaysNoticeToVacate(caseData);

  return [
    {
      label: 'Lease end date',
      value: caseData.leaseEndDate ? formatDate(caseData.leaseEndDate) : '—',
    },
    {
      label: 'Notice received',
      value: noticeDate ? formatDate(noticeDate) : '—',
    },
    {
      label: 'Notice period',
      value: daysNotifyInAdvanceLabel(caseData),
    },
    {
      label: 'Notice served by',
      value: caseData.terminationType === TERMINATION_TYPE.TENANT_INITIATED ? 'Tenant' : 'Landlord / agent',
    },
    {
      label: 'Tenant vacating date',
      value: vacateDate ? formatDate(vacateDate) : 'Not confirmed',
    },
    {
      label: 'Reason for leaving',
      value: caseData.terminationReason?.trim() || '—',
    },
    {
      label: 'Forwarding address',
      value: caseData.vacate.keysReturnAddress?.trim() || '—',
    },
    {
      label: 'Rent until',
      value: vacateDate ? formatDate(vacateDate) : '—',
    },
    {
      label: 'Last rent paid',
      value:
        caseData.outstandingRent > 0
          ? `${formatCurrency(caseData.outstandingRent)} outstanding`
          : 'Up to date',
    },
    {
      label: 'Lease break fee',
      value: caseData.debtAmount > 0 ? formatCurrency(caseData.debtAmount) : '—',
    },
    {
      label: 'Days notice given',
      value: actualDays != null ? `${actualDays} days` : '—',
    },
    {
      label: 'Bond held',
      value: formatCurrency(caseData.bondHeld),
    },
  ];
}

export type EndLeasingWhatsNextCard = {
  id: string;
  title: string;
  detail?: string;
  status: 'upcoming' | 'in_progress' | 'pending' | 'complete';
};

export function buildEndLeasingWhatsNextCards(
  caseData: TerminationCaseDetail,
  workflow: EndLeasingAgentWorkflowModel,
): EndLeasingWhatsNextCard[] {
  const cards: EndLeasingWhatsNextCard[] = [];
  const inspection = caseData.inspection;

  if (inspection.inspectionDate || workflow.liveStepId === END_LEASING_AGENT_STEP.OUTGOING_INSPECTION) {
    cards.push({
      id: 'inspection',
      title: 'Vacating inspection',
      detail: [
        inspection.inspectionDate ? formatDate(inspection.inspectionDate) : null,
        inspection.inspectorName,
      ]
        .filter(Boolean)
        .join(' · '),
      status:
        inspection.status === DONE
          ? 'complete'
          : inspection.inspectionDate
            ? 'upcoming'
            : 'pending',
    });
  }

  cards.push({
    id: 'keys',
    title: 'Key return',
    detail: caseData.vacate.keysReturnAddress || 'Awaiting key return instructions',
    status: caseData.vacate.keysReturned
      ? 'complete'
      : caseData.vacate.keysReturnAddress
        ? 'upcoming'
        : 'pending',
  });

  cards.push({
    id: 'bond',
    title: 'Bond processing',
    detail:
      caseData.refundAmount > 0
        ? `Estimated refund ${formatCurrency(caseData.refundAmount)}`
        : 'Pending inspection outcome',
    status:
      caseData.bond.refundPaid || caseData.status === TERMINATION_CASE_STATUS.COMPLETED
        ? 'complete'
        : workflow.liveStepId === END_LEASING_AGENT_STEP.BOND_RELEASED
          ? 'in_progress'
          : 'pending',
  });

  return cards;
}

export function buildEndLeasingActivityEntries(caseData: TerminationCaseDetail): {
  id: string;
  at: string;
  title: string;
  actor: string;
}[] {
  return [...caseData.timeline]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((entry) => ({
      id: entry.id,
      at: entry.timestamp,
      title: entry.label,
      actor: entry.actor ?? 'CROS System',
    }));
}

export function buildEndLeasingRelatedTasks(
  rows: PropertyJobRow[],
  currentCaseId: string,
): PropertyJobRow[] {
  return rows
    .filter((row) => !(row.kind === 'end_leasing' && row.id === currentCaseId))
    .slice(0, 4);
}

export function buildEndLeasingWorkflowModel(caseData: TerminationCaseDetail) {
  return buildEndLeasingAgentWorkflow(caseData);
}

export function formatEndLeasingActivityTime(iso: string): string {
  return formatDateTime(iso);
}
