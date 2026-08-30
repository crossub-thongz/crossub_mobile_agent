import { fromTasks } from '@/lib/detail-navigation';
import { ROUTES } from '@/constants/routes';
import { propertyJobKindHref } from '@/lib/property-job-href';
import {
  isInspectionOnlyAgent,
  isInspectionOnlyTaskCategory,
  isPropertyInspectionOnly,
  isTaskCategoryAllowedForAgent,
} from '@/lib/portal-service-level';
import { buildPropertyProfileTasks, type PropertyProfileTask } from '@/lib/property-profile-tasks';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  Agency,
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
import { formatDate, formatDateTime } from '@/lib/utils';

export type TaskListV2Bucket = 'all' | 'need_action' | 'cros_handling' | 'waiting' | 'completed';

export type TaskListV2Category =
  | 'all'
  | 'maintenance'
  | 'inspection'
  | 'leasing'
  | 'rent_review'
  | 'tribunal';

export const TASK_LIST_V2_BUCKET_FILTERS: {
  id: Exclude<TaskListV2Bucket, 'all'>;
  label: string;
  sublabel: string;
}[] = [
  { id: 'need_action', label: 'Need my action', sublabel: 'Require your decision' },
  { id: 'cros_handling', label: 'CROS handling', sublabel: 'No action required' },
  { id: 'waiting', label: 'Waiting', sublabel: 'Waiting for others' },
  { id: 'completed', label: 'Completed', sublabel: 'In last 30 days' },
];

export const TASK_LIST_V2_CATEGORY_FILTERS: {
  id: TaskListV2Category;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'leasing', label: 'Leasing' },
  { id: 'rent_review', label: 'Rent review' },
  { id: 'tribunal', label: 'Tribunal' },
];

export function taskListV2CategoryFiltersForAccess(
  hasFullAccess: boolean,
): { id: TaskListV2Category; label: string }[] {
  return TASK_LIST_V2_CATEGORY_FILTERS.filter((option) =>
    isTaskCategoryAllowedForAgent(option.id, hasFullAccess),
  );
}

/** Drop Level 2 workflows from Level 1 properties (inspection + tribunal only). */
export function filterTaskListV2RowsForAgencies(
  rows: TaskListV2Row[],
  agencies: Agency[],
): TaskListV2Row[] {
  if (isInspectionOnlyAgent(agencies)) {
    return rows.filter((row) => isInspectionOnlyTaskCategory(row.category));
  }
  return rows.filter((row) => {
    if (!isPropertyInspectionOnly(agencies, row.property.agencyId)) return true;
    return isInspectionOnlyTaskCategory(row.category);
  });
}

export type TaskListV2Row = {
  id: string;
  propertyId: string;
  propertyAddress: string;
  property: Property;
  task: PropertyProfileTask;
  href: string;
  bucket: Exclude<TaskListV2Bucket, 'all'>;
  category: Exclude<TaskListV2Category, 'all'>;
  typeLabel: string;
  statusLabel: string;
  statusSublabel?: string;
  statusTone: 'action' | 'handling' | 'waiting' | 'completed' | 'muted';
  updatedAt: number;
  updatedLabel: string;
  needsReview: boolean;
};

const TYPE_LABEL: Record<Exclude<TaskListV2Category, 'all'>, string> = {
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  leasing: 'Leasing',
  rent_review: 'Rent review',
  tribunal: 'Tribunal',
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function taskCategory(task: PropertyProfileTask): Exclude<TaskListV2Category, 'all'> {
  const kind = task.jobRow?.kind;
  switch (kind) {
    case 'maintenance':
      return 'maintenance';
    case 'inspection':
      return 'inspection';
    case 'rent_review':
      return 'rent_review';
    case 'tribunal':
      return 'tribunal';
    default:
      return 'leasing';
  }
}

function isWaitingTask(task: PropertyProfileTask): boolean {
  if (task.status === 'approval_required') return false;
  const haystack = [task.jobRow?.status, task.description, task.detail].filter(Boolean).join(' ');
  return /wait|schedul|pending|tenant|owner|landlord|quote|confirm/i.test(haystack);
}

function classifyBucket(task: PropertyProfileTask): Exclude<TaskListV2Bucket, 'all'> {
  if (task.lifecycle === 'completed' || task.phase === 'completed') return 'completed';
  if (task.status === 'approval_required') return 'need_action';
  if (isWaitingTask(task)) return 'waiting';
  return 'cros_handling';
}

function statusPresentation(
  task: PropertyProfileTask,
  bucket: Exclude<TaskListV2Bucket, 'all'>,
): { label: string; sublabel?: string; tone: TaskListV2Row['statusTone'] } {
  if (bucket === 'completed') {
    return { label: 'Completed', sublabel: 'No further action required', tone: 'completed' };
  }
  if (bucket === 'need_action') {
    return {
      label: 'Need your action',
      sublabel: task.detail ?? task.jobRow?.status ?? 'Approval required',
      tone: 'action',
    };
  }
  if (bucket === 'waiting') {
    return {
      label: 'Waiting',
      sublabel: task.jobRow?.status ?? task.description,
      tone: 'waiting',
    };
  }
  return {
    label: 'CROS handling',
    sublabel: task.jobRow?.status ?? 'No action required',
    tone: 'handling',
  };
}

export function resolveTaskListV2Href(task: PropertyProfileTask, propertyId: string): string {
  if (task.needAction?.href && !task.jobRow) {
    return task.needAction.href;
  }

  const job = task.jobRow;
  if (!job) return task.needAction?.href ?? ROUTES.TASKS;

  return propertyJobKindHref(
    job.kind,
    job.id,
    fromTasks(),
    task.needAction?.href ?? ROUTES.TASKS,
  );
}

export function buildPortfolioTaskList(input: {
  properties: Property[];
  leasingRecords: LeasingRecord[];
  maintenanceAll: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  vacating: VacatingCase[];
  tribunalCases: TribunalCase[];
  accounting: PropertyAccounting[];
  getPropertyActions: (propertyId: string) => PropertyNeedAction[];
}): TaskListV2Row[] {
  const rows: TaskListV2Row[] = [];

  for (const property of input.properties) {
    const propertyId = property.id;
    const currentLease = input.leasingRecords.find(
      (row) => row.propertyId === propertyId && row.status === 'current',
    );

    const tasks = buildPropertyProfileTasks({
      property,
      propertyId,
      maintenance: input.maintenanceAll.filter((row) => row.propertyId === propertyId),
      inspections: input.inspections.filter((row) => row.propertyId === propertyId),
      rentReviews: input.rentReviews.filter((row) => row.propertyId === propertyId),
      rentReviewDecisions: input.rentReviewDecisions,
      leasingCycles: input.leasingCycles.filter((row) => row.propertyId === propertyId),
      tenantSelections: input.tenantSelections.filter((row) => row.propertyId === propertyId),
      vacatingCases: input.vacating.filter((row) => row.propertyId === propertyId),
      tribunalCases: input.tribunalCases.filter((row) => row.propertyId === propertyId),
      accounting: input.accounting.find((row) => row.propertyId === propertyId) ?? null,
      currentLease,
      needActions: input.getPropertyActions(propertyId),
    });

    for (const task of tasks) {
      if (task.lifecycle === 'deleted' || task.lifecycle === 'archived') continue;

      const bucket = classifyBucket(task);
      const category = taskCategory(task);
      const status = statusPresentation(task, bucket);
      const propertyAddress = task.needAction?.propertyAddress ?? formatPropertyAddress(property);

      rows.push({
        id: `${propertyId}:${task.id}`,
        propertyId,
        propertyAddress,
        property,
        task,
        href: resolveTaskListV2Href(task, propertyId),
        bucket,
        category,
        typeLabel: TYPE_LABEL[category],
        statusLabel: status.label,
        statusSublabel: status.sublabel,
        statusTone: status.tone,
        updatedAt: task.sortAt,
        updatedLabel: task.sortAt > 0 ? formatDateTime(new Date(task.sortAt).toISOString()) : '—',
        needsReview: task.status === 'approval_required',
      });
    }
  }

  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

function formatPropertyAddress(property: Property): string {
  return [property.address, property.suburb, property.state, property.postcode]
    .filter(Boolean)
    .join(', ');
}

export function filterTaskListV2Rows(
  rows: TaskListV2Row[],
  bucket: TaskListV2Bucket,
  category: TaskListV2Category,
  search: string,
): TaskListV2Row[] {
  const now = Date.now();
  let filtered = rows;

  if (bucket === 'all') {
    filtered = filtered.filter(
      (row) => row.bucket !== 'completed' && row.task.lifecycle === 'active',
    );
  } else if (bucket === 'completed') {
    filtered = filtered.filter(
      (row) =>
        row.bucket === 'completed' && now - row.updatedAt <= THIRTY_DAYS_MS,
    );
  } else {
    filtered = filtered.filter(
      (row) => row.bucket === bucket && row.task.lifecycle === 'active',
    );
  }

  if (category !== 'all') {
    filtered = filtered.filter((row) => row.category === category);
  }

  if (search.trim()) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.task.title.toLowerCase().includes(query) ||
        row.propertyAddress.toLowerCase().includes(query) ||
        row.typeLabel.toLowerCase().includes(query) ||
        row.statusLabel.toLowerCase().includes(query) ||
        row.task.description.toLowerCase().includes(query),
    );
  }

  return filtered;
}

export function countTaskListV2Buckets(rows: TaskListV2Row[]): Record<TaskListV2Bucket, number> {
  const now = Date.now();
  const active = rows.filter((row) => row.task.lifecycle === 'active');

  return {
    all: active.length,
    need_action: active.filter((row) => row.bucket === 'need_action').length,
    cros_handling: active.filter((row) => row.bucket === 'cros_handling').length,
    waiting: active.filter((row) => row.bucket === 'waiting').length,
    completed: rows.filter(
      (row) => row.bucket === 'completed' && now - row.updatedAt <= THIRTY_DAYS_MS,
    ).length,
  };
}

export function countTaskListV2Categories(
  rows: TaskListV2Row[],
  bucket: TaskListV2Bucket,
): Record<TaskListV2Category, number> {
  const scoped = filterTaskListV2Rows(rows, bucket, 'all', '');
  return scoped.reduce(
    (counts, row) => {
      counts[row.category] += 1;
      counts.all += 1;
      return counts;
    },
    {
      all: 0,
      maintenance: 0,
      inspection: 0,
      leasing: 0,
      rent_review: 0,
      tribunal: 0,
    },
  );
}

export function findMaintenanceForTask(
  task: PropertyProfileTask,
  maintenanceAll: MaintenanceRequest[],
): MaintenanceRequest | undefined {
  if (task.jobRow?.kind !== 'maintenance') return undefined;
  return maintenanceAll.find((row) => row.id === task.jobRow!.id);
}

export function taskReferenceLabel(job?: PropertyJobRow): string | undefined {
  if (!job) return undefined;
  return job.name !== '—' ? job.name : undefined;
}

export function taskReportedLabel(task: PropertyProfileTask): string {
  if (task.jobRow?.createdAt && task.jobRow.createdAt !== '—') {
    return task.jobRow.createdAt;
  }
  if (task.jobRow?.date && task.jobRow.date !== '—') {
    return formatDate(task.jobRow.date);
  }
  return '—';
}
