import { LEASING_AGENT_DECISION, LEASING_ITEM_STATUS, LEASING_LIFECYCLE_STEP } from '@/lib/leasing/constants';
import { resolveOnboardingTenant, confirmedLeaseTerms } from '@/lib/leasing/onboarding-display';
import type { LeasingApplicationDetail, LeasingPropertyDetail } from '@/lib/leasing/types';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { Property } from '@/lib/types';
import { formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export const NEW_LEASING_TASK_STAGE_LABELS = [
  'Enquiry received',
  'Application received',
  'Applicant screened',
  'Reference checked',
  'Approved',
  'Lease preparation',
  'Lease sent',
  'Lease signed',
  'Move in',
] as const;

export type NewLeasingTaskTab =
  | 'workflow'
  | 'details'
  | 'applicants'
  | 'activity'
  | 'documents'
  | 'notes';

export type NewLeasingTaskStageState = 'complete' | 'current' | 'pending';

function leasingApplications(detail: LeasingPropertyDetail): LeasingApplicationDetail[] {
  return detail.applicationsDetail ?? [];
}

export function resolveNewLeasingTaskStageIndex(detail: LeasingPropertyDetail): number {
  const agreement = detail.onboarding.agreement;
  const keyCollection = detail.onboarding.keyCollection;
  const ingoing = detail.onboarding.ingoingInspection;

  if (
    keyCollection.status === LEASING_ITEM_STATUS.DONE ||
    ingoing.status === LEASING_ITEM_STATUS.DONE
  ) {
    return 8;
  }
  if (agreement.signingStatus === 'signed') return 7;
  if (agreement.signingStatus === 'sent' || agreement.signingStatus === 'viewed') return 6;

  const approved = leasingApplications(detail).some(
    (app) => app.agentDecision === LEASING_AGENT_DECISION.APPROVED,
  );
  if (approved || detail.activeStepHint === LEASING_LIFECYCLE_STEP.ONBOARDING) return 5;

  const referenceDone = leasingApplications(detail).some(
    (app) =>
      app.referenceRecommendation === 'recommend' ||
      app.referenceRecommendation === 'reject' ||
      app.agentDecision !== LEASING_AGENT_DECISION.PENDING,
  );
  if (referenceDone) return 4;

  const screened = leasingApplications(detail).some((app) => app.aiScore != null || app.sentToAgent);
  if (screened) return 3;

  if (leasingApplications(detail).length > 0) return 2;

  if (detail.openReport.sentToAgent || detail.openReport.reportViewable) return 1;

  return 0;
}

export function buildNewLeasingTaskStages(detail: LeasingPropertyDetail): {
  label: string;
  state: NewLeasingTaskStageState;
  dateLabel?: string;
}[] {
  const currentIndex = resolveNewLeasingTaskStageIndex(detail);
  const stageDates = buildStageDateLabels(detail);

  return NEW_LEASING_TASK_STAGE_LABELS.map((label, index) => {
    let state: NewLeasingTaskStageState = 'pending';
    if (index < currentIndex) state = 'complete';
    else if (index === currentIndex) state = 'current';
    return {
      label,
      state,
      dateLabel: stageDates[index],
    };
  });
}

function buildStageDateLabels(detail: LeasingPropertyDetail): (string | undefined)[] {
  const dates: (string | undefined)[] = Array(NEW_LEASING_TASK_STAGE_LABELS.length).fill(undefined);
  const applications = leasingApplications(detail);
  const firstApplication = applications[0];
  const approved = applications.find(
    (app) => app.agentDecision === LEASING_AGENT_DECISION.APPROVED,
  );

  if (detail.openInspection.timeConfirmedAt || detail.openInspection.scheduledTime) {
    dates[0] = formatDate(
      detail.openInspection.timeConfirmedAt ?? detail.openInspection.scheduledTime!,
    );
  }
  if (firstApplication?.submittedAt) {
    dates[1] = formatDate(firstApplication.submittedAt);
  }
  if (firstApplication?.submittedAt && firstApplication.aiScore != null) {
    dates[2] = formatDate(firstApplication.submittedAt);
  }
  if (approved?.submittedAt) {
    dates[4] = formatDate(approved.submittedAt);
  }
  if (detail.onboarding.agreement.contract.startDate) {
    dates[5] = formatDate(detail.onboarding.agreement.contract.startDate);
  }
  if (detail.onboarding.agreement.signedAt) {
    dates[7] = formatDate(detail.onboarding.agreement.signedAt);
  }
  if (detail.onboarding.keyCollection.time) {
    dates[8] = formatDate(detail.onboarding.keyCollection.time);
  }

  return dates;
}

export function resolveNewLeasingStatusBanner(detail: LeasingPropertyDetail): {
  title: string;
  subtitle: string;
  needsAction: boolean;
  crosSummary: string[];
} {
  const stageIndex = resolveNewLeasingTaskStageIndex(detail);
  const tenant = resolveOnboardingTenant(detail);
  const lease = confirmedLeaseTerms(detail);
  const tenantLine = tenant
    ? `${tenant.applicant}${lease.startDate ? ` · Start ${formatDate(lease.startDate)}` : ''}${
        lease.weeklyRent != null ? ` · ${formatCurrency(lease.weeklyRent)}/week` : ''
      }`
    : 'Awaiting applicant selection';

  const titles = [
    'Open inspection in progress',
    'Application received',
    'Applicant screening in progress',
    'Reference check in progress',
    'Applicant approved',
    'Applicant approved – Lease preparation',
    'Lease sent to tenant',
    'Lease signed',
    'Move-in preparation',
  ];

  const summaries: string[][] = [
    ['CROSSUB is coordinating the open inspection and advertising follow-up.'],
    ['Application received and queued for screening.'],
    ['CROSSUB is screening the applicant against rental criteria.'],
    ['Reference checks are underway with employer and previous agent.'],
    [
      'All checks are completed and the applicant meets rental criteria.',
      'CROSSUB recommends proceeding with lease preparation.',
    ],
    [
      'All checks are completed and the applicant meets rental criteria.',
      'CROSSUB recommends proceeding with lease preparation.',
      'Review the draft lease before sending to the tenant.',
    ],
    ['Lease has been sent to the tenant for review and signature.'],
    ['Lease is signed. Bond and move-in steps are in progress.'],
    ['Key collection and ingoing inspection are being finalised.'],
  ];

  const needsAction =
    stageIndex >= 5 &&
    detail.onboarding.agreement.signingStatus !== 'signed' &&
    detail.onboarding.agreement.signingStatus !== 'sent';

  return {
    title: titles[stageIndex] ?? titles[0],
    subtitle: tenantLine,
    needsAction,
    crosSummary: summaries[stageIndex] ?? summaries[0],
  };
}

export function buildNewLeasingLeaseDetailRows(
  property: Property,
  detail: LeasingPropertyDetail,
): { label: string; value: string }[] {
  const lease = confirmedLeaseTerms(detail);
  const contract = detail.onboarding.agreement.contract;
  const address = formatPropertyFullAddress(property);

  return [
    { label: 'Property address', value: address },
    { label: 'Property type', value: property.propertyType?.replace(/_/g, ' ') ?? '—' },
    { label: 'Rent', value: lease.weeklyRent != null ? `${formatCurrency(lease.weeklyRent)}/week` : '—' },
    { label: 'Rent review period', value: 'Annual' },
    { label: 'Lease start date', value: lease.startDate ? formatDate(lease.startDate) : '—' },
    { label: 'Lease end date', value: contract.endDate ? formatDate(contract.endDate) : '—' },
    {
      label: 'Bond amount',
      value:
        contract.bond != null
          ? formatCurrency(contract.bond)
          : detail.rental.bond != null
            ? formatCurrency(detail.rental.bond)
            : '—',
    },
    { label: 'Lease term', value: lease.leaseTerm ?? detail.rental.leaseTerm ?? '—' },
    {
      label: 'Pets allowed',
      value:
        contract.petsAllowed === true ? 'Yes' : contract.petsAllowed === false ? 'No' : '—',
    },
    {
      label: 'Water usage',
      value: detail.onboarding.agreement.contract.waterChargedSeparately ? 'Tenant pays' : 'Included',
    },
    { label: 'Parking', value: property.carSpaces != null ? String(property.carSpaces) : '—' },
    { label: 'Furnished', value: property.furnished === true ? 'Yes' : property.furnished === false ? 'No' : '—' },
  ];
}

export function buildNewLeasingWhatsNextCards(detail: LeasingPropertyDetail): {
  title: string;
  status: 'in_progress' | 'pending' | 'complete';
}[] {
  const index = resolveNewLeasingTaskStageIndex(detail);
  const cards = [
    'Lease preparation',
    'Lease sent to tenant',
    'Lease signed',
    'Bond lodgement',
    'Key collection',
    'Ingoing inspection',
    'Move-in complete',
  ];

  return cards.map((title, cardIndex) => {
    const absoluteIndex = cardIndex + 5;
    let status: 'in_progress' | 'pending' | 'complete' = 'pending';
    if (absoluteIndex < index) status = 'complete';
    else if (absoluteIndex === index) status = 'in_progress';
    return { title, status };
  });
}

export function buildNewLeasingActivityEntries(detail: LeasingPropertyDetail): {
  id: string;
  at: string;
  title: string;
  actor: string;
}[] {
  return [...(detail.timeline ?? [])]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 6)
    .map((entry) => ({
      id: entry.id,
      at: entry.at,
      title: entry.label,
      actor: entry.actor?.trim() || 'CROS System',
    }));
}

export function buildNewLeasingRelatedTasks(
  rows: PropertyJobRow[],
  currentCycleId: string,
): PropertyJobRow[] {
  return rows
    .filter((row) => row.id !== currentCycleId && row.phase === 'in_progress')
    .slice(0, 4);
}

export function newLeasingTaskReference(cycleId: string): string {
  return workflowCaseReferenceLabel(cycleId, 'leasing');
}
