import { filterNeedAttentionActions } from '@/lib/property-profile-v2-data';
import {
  archivedEndLeasingJobRows,
  archivedLeasingCycleJobRows,
  archivedRentReviewJobRows,
  buildPropertyOverviewJobRows,
  type PropertyJobPhase,
  type PropertyJobRow,
} from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { isPropertyVacant } from '@/lib/property-leasing';
import type { PropertyLeasingWorkflowCase } from '@/lib/property-leasing-workflow-cases';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  ArchivedEndLeasingCase,
  ArchivedLeasingCycle,
  ArchivedRentReview,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export type PropertyProfileTaskCategory = 'maintenance' | 'inspection' | 'leasing' | 'tribunal';

export type PropertyProfileTaskStatus = 'approval_required' | 'no_action';

export type PropertyProfileTaskLifecycle = 'active' | 'completed' | 'deleted' | 'archived';

export type PropertyProfileTask = {
  id: string;
  category: PropertyProfileTaskCategory;
  title: string;
  subtext: string;
  description: string;
  detail?: string;
  status: PropertyProfileTaskStatus;
  phase: PropertyJobPhase;
  lifecycle: PropertyProfileTaskLifecycle;
  pinned?: boolean;
  jobRow?: PropertyJobRow;
  needAction?: PropertyNeedAction;
  sortAt: number;
};

export type PropertyProfileTaskCategoryFilter =
  | 'all'
  | PropertyProfileTaskCategory;

export type PropertyProfileTaskStatusFilter =
  | 'all'
  | 'needs_action'
  | 'no_action'
  | 'in_progress'
  | 'completed'
  | 'deleted'
  | 'archived';

function deriveTaskLifecycle(
  job: PropertyJobRow,
  archived = false,
): PropertyProfileTaskLifecycle {
  if (archived) return 'archived';
  if (job.status === 'Deleted') return 'deleted';
  if (job.phase === 'completed') return 'completed';
  return 'active';
}

const CATEGORY_LABEL: Record<PropertyProfileTaskCategory, string> = {
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  leasing: 'Leasing',
  tribunal: 'Tribunal',
};

function jobCategory(row: PropertyJobRow): PropertyProfileTaskCategory {
  switch (row.kind) {
    case 'maintenance':
      return 'maintenance';
    case 'inspection':
      return 'inspection';
    case 'tribunal':
      return 'tribunal';
    default:
      return 'leasing';
  }
}

function needActionCategory(item: PropertyNeedAction): PropertyProfileTaskCategory {
  switch (item.category) {
    case 'Maintenance':
      return 'maintenance';
    case 'Inspection':
      return 'inspection';
    case 'Tribunal':
      return 'tribunal';
    default:
      return 'leasing';
  }
}

function linkedJobId(needAction: PropertyNeedAction): string | null {
  if (needAction.id.startsWith('mnt-')) return needAction.id.slice(4);
  if (needAction.id.startsWith('rr-')) return needAction.id.slice(3);
  if (needAction.id.startsWith('insp-')) return needAction.id.slice(5);
  if (needAction.id.startsWith('insp-report-')) return needAction.id.slice(12);
  if (needAction.id.startsWith('trib-')) return needAction.id.slice(5);
  return null;
}

function maintenanceTitle(request: MaintenanceRequest | undefined, job: PropertyJobRow): string {
  const title = request?.title?.trim();
  if (title) return title;
  if (job.issueType && job.issueType !== '—') return job.issueType;
  return job.name;
}

function maintenanceDetail(request: MaintenanceRequest | undefined): string | undefined {
  if (!request) return undefined;
  const parts: string[] = [];
  if (request.contractorName) parts.push(request.contractorName);
  if (request.quoteAmount != null && request.quoteAmount > 0) {
    parts.push(`${formatCurrency(request.quoteAmount)} incl. GST`);
  }
  return parts.length > 0 ? parts.join(' — ') : undefined;
}

function taskFromJobRow(
  job: PropertyJobRow,
  maintenanceById: Map<string, MaintenanceRequest>,
  needAction?: PropertyNeedAction,
  options?: { archived?: boolean },
): PropertyProfileTask {
  const category = jobCategory(job);
  const maintenance = job.kind === 'maintenance' ? maintenanceById.get(job.id) : undefined;
  const needsApproval =
    needAction != null ||
    maintenance?.requiresApproval === true ||
    /approv|quot|review|sign|confirm/i.test(job.status);

  const title =
    needAction?.label ??
    (job.kind === 'maintenance'
      ? maintenanceTitle(maintenance, job)
      : job.jobType === 'Rent review'
        ? 'Rent review'
        : job.jobType === 'End leasing'
          ? 'End leasing'
          : job.name);

  const reportedLabel = job.createdAt !== '—' ? job.createdAt : job.date;
  const subtext =
    category === 'inspection' && job.date !== '—'
      ? `${CATEGORY_LABEL[category]} • ${job.date}`
      : `${CATEGORY_LABEL[category]} • Reported ${reportedLabel}`;

  const description =
    maintenance?.description?.trim() ||
    job.description.split(' · ').filter(Boolean)[0] ||
    job.status;

  let detail: string | undefined;
  if (job.kind === 'maintenance') {
    detail = maintenanceDetail(maintenance);
  } else if (job.kind === 'inspection') {
    detail = job.description !== '—' ? job.description : job.date !== '—' ? job.date : undefined;
  } else if (job.kind === 'leasing' || job.kind === 'rent_review' || job.kind === 'end_leasing') {
    detail = job.date !== '—' ? job.date : undefined;
    if (job.status && !needsApproval) {
      detail = [detail, job.status].filter(Boolean).join(' • ');
    }
  } else {
    detail = job.date !== '—' ? job.date : undefined;
  }

  return {
    id: `job-${job.id}`,
    category,
    title,
    subtext,
    description,
    detail,
    status: needsApproval ? 'approval_required' : 'no_action',
    phase: job.phase,
    lifecycle: deriveTaskLifecycle(job, options?.archived),
    pinned: needAction?.priority === 'urgent',
    jobRow: job,
    needAction,
    sortAt: needAction
      ? Date.parse(needAction.updatedAt ?? '') || job.createdAtMs
      : job.createdAtMs,
  };
}

function taskFromNeedAction(
  needAction: PropertyNeedAction,
  jobsById: Map<string, PropertyJobRow>,
): PropertyProfileTask | null {
  const linkedId = linkedJobId(needAction);
  if (linkedId && jobsById.has(linkedId)) return null;

  return {
    id: `action-${needAction.id}`,
    category: needActionCategory(needAction),
    title: needAction.label,
    subtext: `${CATEGORY_LABEL[needActionCategory(needAction)]} • Needs review`,
    description: needAction.propertyAddress,
    status: 'approval_required',
    phase: 'in_progress',
    lifecycle: 'active',
    pinned: needAction.priority === 'urgent',
    needAction,
    sortAt: Date.parse(needAction.updatedAt ?? '') || Date.now(),
  };
}

export function buildPropertyProfileTasks(input: {
  property: Property;
  propertyId: string;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
  accounting?: PropertyAccounting | null;
  currentLease?: LeasingRecord;
  needActions: PropertyNeedAction[];
  deletedLeasingCycles?: ArchivedLeasingCycle[];
  deletedEndLeasingCases?: ArchivedEndLeasingCase[];
  deletedRentReviews?: ArchivedRentReview[];
}): PropertyProfileTask[] {
  const {
    propertyId,
    maintenance,
    inspections,
    rentReviews,
    rentReviewDecisions,
    leasingCycles,
    tenantSelections,
    vacatingCases,
    tribunalCases,
    accounting,
    currentLease,
    property,
    needActions,
  } = input;

  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const leasingCases: PropertyLeasingWorkflowCase[] = buildPropertyLeasingWorkflowCases({
    propertyId,
    leasingCycles,
    tenantSelections,
    vacatingCases,
    rentReviews,
    rentReviewDecisions,
    currentLease,
    isVacant,
  });

  const jobs = buildPropertyOverviewJobRows({
    maintenance,
    inspections,
    rentReviews,
    rentReviewDecisions,
    leasingCases,
    tribunalCases,
    vacatingCases,
    accounting,
    includeCompleted: true,
  });

  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const maintenanceById = new Map(maintenance.map((item) => [item.id, item]));
  const attention = filterNeedAttentionActions(needActions);
  const attentionByJobId = new Map<string, PropertyNeedAction>();

  for (const action of attention) {
    const jobId = linkedJobId(action);
    if (jobId) attentionByJobId.set(jobId, action);
  }

  const tasks: PropertyProfileTask[] = [];

  const archivedJobs = [
    ...archivedLeasingCycleJobRows(input.deletedLeasingCycles ?? []),
    ...archivedEndLeasingJobRows(input.deletedEndLeasingCases ?? []),
    ...archivedRentReviewJobRows(
      input.deletedRentReviews ?? [],
      rentReviews,
      rentReviewDecisions,
    ),
  ];
  const archivedJobIds = new Set(archivedJobs.map((job) => job.id));

  for (const job of jobs) {
    if (archivedJobIds.has(job.id)) continue;
    tasks.push(taskFromJobRow(job, maintenanceById, attentionByJobId.get(job.id)));
  }

  for (const job of archivedJobs) {
    tasks.push(taskFromJobRow(job, maintenanceById, undefined, { archived: true }));
  }

  for (const action of attention) {
    const extra = taskFromNeedAction(action, jobsById);
    if (extra) tasks.push(extra);
  }

  return tasks.sort((a, b) => {
    if (a.lifecycle !== b.lifecycle) {
      return a.lifecycle === 'active' ? -1 : 1;
    }
    if (a.phase !== b.phase) {
      return a.phase === 'in_progress' ? -1 : 1;
    }
    if (a.status !== b.status) {
      return a.status === 'approval_required' ? -1 : 1;
    }
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    return b.sortAt - a.sortAt;
  });
}

export function countPropertyProfileTasksByCategory(
  tasks: PropertyProfileTask[],
): Record<PropertyProfileTaskCategory, number> {
  return tasks.reduce(
    (counts, task) => {
      counts[task.category] += 1;
      return counts;
    },
    { maintenance: 0, inspection: 0, leasing: 0, tribunal: 0 },
  );
}

export function filterPropertyProfileTasks(
  tasks: PropertyProfileTask[],
  category: PropertyProfileTaskCategoryFilter,
  status: PropertyProfileTaskStatusFilter,
): PropertyProfileTask[] {
  return tasks.filter((task) => {
    if (category !== 'all' && task.category !== category) return false;
    if (status === 'needs_action' && task.status !== 'approval_required') return false;
    if (status === 'no_action' && task.status !== 'no_action') return false;
    if (status === 'in_progress' && task.lifecycle !== 'active') return false;
    if (status === 'completed' && task.lifecycle !== 'completed') return false;
    if (status === 'deleted' && task.lifecycle !== 'deleted') return false;
    if (status === 'archived' && task.lifecycle !== 'archived') return false;
    return true;
  });
}

export const PROPERTY_PROFILE_TASK_CATEGORY_FILTERS: {
  id: PropertyProfileTaskCategoryFilter;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'leasing', label: 'Leasing' },
  { id: 'tribunal', label: 'Tribunal' },
];
