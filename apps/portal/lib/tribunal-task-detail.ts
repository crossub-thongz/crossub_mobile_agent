import { TRIBUNAL_CASE_STATUS } from '@/constants/api-enums';
import type { AgentTribunalRentChasingDetail } from '@/lib/crossub-api/agent-workflow-client';
import { tribunalTypeLabel, tribunalStatusLabel } from '@/lib/tribunal-labels';
import type { Property, TribunalCase } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export const TRIBUNAL_TASK_STAGE_LABELS = [
  'Issue identified',
  'Notice to tenant',
  'Notice period',
  'Application prepared',
  'Application filed',
  'Hearing date set',
  'Hearing',
  'Order / Outcome',
  'Completed',
] as const;

export type TribunalTaskTab =
  | 'workflow'
  | 'details'
  | 'documents'
  | 'activity'
  | 'orders'
  | 'notes';

export type TribunalTaskStageState = 'complete' | 'current' | 'pending';

export function tribunalTaskReference(caseId: string): string {
  return workflowCaseReferenceLabel(caseId, 'tribunal');
}

export function resolveTribunalTaskStageIndex(
  tribunalCase: TribunalCase,
  detail?: AgentTribunalRentChasingDetail | null,
): number {
  const status = detail?.status ?? tribunalCase.apiStatus;
  switch (status) {
    case TRIBUNAL_CASE_STATUS.CLOSED:
      return 8;
    case TRIBUNAL_CASE_STATUS.COMPLETED:
      return 7;
    case TRIBUNAL_CASE_STATUS.HEARING_SCHEDULED:
      return 5;
    case TRIBUNAL_CASE_STATUS.AWAITING_HEARING:
      return 4;
    case TRIBUNAL_CASE_STATUS.SUBMITTED:
      return detail?.lodgementDate ? 4 : 3;
    case TRIBUNAL_CASE_STATUS.DRAFT:
      if (detail?.lodgementDate) return 4;
      if (detail?.evictionRequired) return 1;
      return 0;
    default:
      return tribunalCase.hearingDate ? 5 : 0;
  }
}

export function buildTribunalTaskStages(
  tribunalCase: TribunalCase,
  detail?: AgentTribunalRentChasingDetail | null,
): { label: string; state: TribunalTaskStageState; dateLabel?: string }[] {
  const currentIndex = resolveTribunalTaskStageIndex(tribunalCase, detail);
  const stageDates: (string | undefined)[] = [
    tribunalCase.createdAt ? formatDate(tribunalCase.createdAt) : undefined,
    undefined,
    undefined,
    undefined,
    detail?.lodgementDate
      ? formatDate(detail.lodgementDate)
      : tribunalCase.createdAt
        ? formatDate(tribunalCase.createdAt)
        : undefined,
    tribunalCase.hearingDate || detail?.hearingDate
      ? formatDate(tribunalCase.hearingDate ?? detail?.hearingDate ?? '')
      : undefined,
    tribunalCase.hearingDate || detail?.hearingDate
      ? formatDate(tribunalCase.hearingDate ?? detail?.hearingDate ?? '')
      : undefined,
    undefined,
    tribunalCase.status === 'closed' ? formatDate(new Date().toISOString()) : undefined,
  ];

  return TRIBUNAL_TASK_STAGE_LABELS.map((label, index) => {
    let state: TribunalTaskStageState = 'pending';
    if (index < currentIndex) state = 'complete';
    else if (index === currentIndex) state = 'current';
    return {
      label,
      state,
      dateLabel: stageDates[index],
    };
  });
}

export function resolveTribunalStatusBanner(
  tribunalCase: TribunalCase,
  detail?: AgentTribunalRentChasingDetail | null,
): {
  title: string;
  subtitle: string;
  needsAction: boolean;
  crosSummary: string[];
  filingDate?: string;
  matterType?: string;
  jurisdiction?: string;
  nextStep?: string;
} {
  const status = detail?.status ?? tribunalCase.apiStatus;
  const needsAction = tribunalCase.requiresAction && tribunalCase.status === 'active';

  let title = 'Tribunal matter in progress';
  let subtitle = 'Track notices, application, and hearing milestones';
  let nextStep = 'Review case details and prepare next action';

  switch (status) {
    case TRIBUNAL_CASE_STATUS.DRAFT:
      title = 'Waiting for Account Manager';
      subtitle =
        'Your case has been lodged. The Account Manager has been notified — wait for their response.';
      nextStep = 'Wait for the Account Manager to respond';
      break;
    case TRIBUNAL_CASE_STATUS.SUBMITTED:
      title = 'Application submitted — Awaiting processing';
      subtitle = 'Tribunal application has been lodged';
      nextStep = 'Await tribunal acknowledgement';
      break;
    case TRIBUNAL_CASE_STATUS.AWAITING_HEARING:
      title = 'Application filed — Awaiting hearing date';
      subtitle = 'NCAT will advise hearing date in due course';
      nextStep = 'Monitor for hearing date notification';
      break;
    case TRIBUNAL_CASE_STATUS.HEARING_SCHEDULED:
      title = 'Hearing scheduled';
      subtitle = 'Prepare evidence and attend hearing';
      nextStep = 'Prepare for hearing';
      break;
    case TRIBUNAL_CASE_STATUS.COMPLETED:
      title = 'Order issued';
      subtitle = 'Tribunal matter completed — review outcome';
      nextStep = 'Implement tribunal order';
      break;
    case TRIBUNAL_CASE_STATUS.CLOSED:
      title = 'Case closed';
      subtitle = 'This tribunal matter has been closed';
      nextStep = 'No further action required';
      break;
  }

  const arrearsTotal = (detail?.arrears ?? []).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0,
  );
  const amount =
    tribunalCase.amountClaimed ?? (arrearsTotal > 0 ? arrearsTotal : null);

  const crosSummary = [
    status === TRIBUNAL_CASE_STATUS.AWAITING_HEARING
      ? 'Application is strong based on arrears documentation. No immediate action required — await hearing date.'
      : null,
    amount != null && amount > 0 ? `Amount claimed ${formatCurrency(amount)}` : null,
    detail?.evictionRequired ? 'Eviction marked as required for this matter.' : null,
    tribunalCase.hearingDate || detail?.hearingDate
      ? `Hearing scheduled ${formatDate(tribunalCase.hearingDate ?? detail?.hearingDate ?? '')}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return {
    title,
    subtitle,
    needsAction,
    crosSummary,
    filingDate: detail?.lodgementDate
      ? formatDate(detail.lodgementDate)
      : tribunalCase.createdAt
        ? formatDate(tribunalCase.createdAt)
        : undefined,
    matterType: tribunalTypeLabel(detail?.tribunalType ?? tribunalCase.tribunalType),
    jurisdiction: 'NCAT',
    nextStep,
  };
}

export function buildTribunalDetailRows(
  tribunalCase: TribunalCase,
  property?: Property | null,
  detail?: AgentTribunalRentChasingDetail | null,
): { label: string; value: string }[] {
  const arrearsTotal = (detail?.arrears ?? []).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0,
  );
  const amount =
    tribunalCase.amountClaimed ?? (arrearsTotal > 0 ? arrearsTotal : null);

  return [
    {
      label: 'Matter type',
      value: tribunalTypeLabel(detail?.tribunalType ?? tribunalCase.tribunalType),
    },
    {
      label: 'Jurisdiction',
      value: 'NCAT',
    },
    {
      label: 'Filing date',
      value: detail?.lodgementDate
        ? formatDate(detail.lodgementDate)
        : tribunalCase.createdAt
          ? formatDate(tribunalCase.createdAt)
          : '—',
    },
    {
      label: 'File number',
      value:
        tribunalCase.caseNumber?.trim() ||
        detail?.caseNumber?.trim() ||
        'To be advised',
    },
    {
      label: 'Hearing type',
      value: tribunalCase.hearingDate || detail?.hearingDate ? 'Directions / hearing' : '—',
    },
    {
      label: 'Applicant',
      value: property?.homeOwnerName?.trim() || 'Landlord / agent',
    },
    {
      label: 'Respondent',
      value: detail?.tenantName?.trim() || tribunalCase.tenantName || '—',
    },
    {
      label: 'Property',
      value: property
        ? `${property.address}, ${property.suburb} ${property.state} ${property.postcode}`
        : tribunalCase.propertyAddress,
    },
    {
      label: 'Amount claimed',
      value: amount != null && amount > 0 ? formatCurrency(amount) : '—',
    },
    {
      label: 'Legal basis',
      value: tribunalCase.matter || detail?.matter || '—',
    },
    {
      label: 'Status',
      value: tribunalStatusLabel(detail?.status ?? tribunalCase.apiStatus),
    },
    {
      label: 'Hearing date',
      value:
        tribunalCase.hearingDate || detail?.hearingDate
          ? formatDate(tribunalCase.hearingDate ?? detail?.hearingDate ?? '')
          : '—',
    },
  ];
}

export function buildTribunalMatterSummary(
  tribunalCase: TribunalCase,
  detail?: AgentTribunalRentChasingDetail | null,
): { label: string; value: string }[] {
  const rentRows = (detail?.arrears ?? []).filter((row) => row.kind === 'rent');
  const arrearsTotal = (detail?.arrears ?? []).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0,
  );
  const totalArrears =
    tribunalCase.amountClaimed ?? (arrearsTotal > 0 ? arrearsTotal : null);

  const earliestDue = rentRows
    .map((row) => row.dueDate)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  return [
    {
      label: 'Arrears period',
      value: earliestDue ? `From ${formatDate(earliestDue)}` : '—',
    },
    {
      label: 'Total arrears',
      value: totalArrears != null && totalArrears > 0 ? formatCurrency(totalArrears) : '—',
    },
    {
      label: 'Notices served',
      value: detail?.evictionRequired
        ? 'Notice to Pay Rent or Leave, Notice of Termination'
        : 'Notice to Pay Rent or Leave',
    },
    {
      label: 'Rent paid to',
      value: detail?.rentPaidTo ? formatDate(detail.rentPaidTo) : '—',
    },
  ];
}

export function buildTribunalActivityEntries(
  tribunalCase: TribunalCase,
  detail?: AgentTribunalRentChasingDetail | null,
): { id: string; at: string; title: string; actor: string }[] {
  const entries: { id: string; at: string; title: string; actor: string }[] = [];

  if (tribunalCase.createdAt) {
    entries.push({
      id: 'created',
      at: tribunalCase.createdAt,
      title: 'Tribunal case created',
      actor: 'CROS System',
    });
  }
  if (detail?.lodgementDate) {
    entries.push({
      id: 'lodged',
      at: detail.lodgementDate,
      title: 'Application filed with tribunal',
      actor: 'Agent',
    });
  }
  const hearing = tribunalCase.hearingDate ?? detail?.hearingDate;
  if (hearing) {
    entries.push({
      id: 'hearing',
      at: hearing,
      title: 'Hearing date scheduled',
      actor: 'NCAT',
    });
  }
  if (tribunalCase.apiStatus === TRIBUNAL_CASE_STATUS.COMPLETED) {
    entries.push({
      id: 'completed',
      at: hearing ?? tribunalCase.createdAt ?? new Date().toISOString(),
      title: 'Tribunal order issued',
      actor: 'NCAT',
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function tribunalDocumentCount(
  tribunalCase: TribunalCase,
  detail?: AgentTribunalRentChasingDetail | null,
): number {
  let count = tribunalCase.evidence?.length ?? 0;
  if (detail?.hearingNoticeUrl) count += 1;
  if (detail?.membersOrderUrl) count += 1;
  return count;
}

export function buildTribunalUpcomingCards(
  tribunalCase: TribunalCase,
  detail?: AgentTribunalRentChasingDetail | null,
): { title: string; status: string }[] {
  const status = detail?.status ?? tribunalCase.apiStatus;
  const cards: { title: string; status: string }[] = [];

  if (
    status === TRIBUNAL_CASE_STATUS.AWAITING_HEARING ||
    status === TRIBUNAL_CASE_STATUS.SUBMITTED
  ) {
    cards.push({ title: 'Awaiting hearing date', status: 'Pending' });
  }
  if (
    status === TRIBUNAL_CASE_STATUS.HEARING_SCHEDULED ||
    tribunalCase.hearingDate ||
    detail?.hearingDate
  ) {
    cards.push({ title: 'Prepare for hearing', status: 'Pending' });
  }

  return cards;
}
