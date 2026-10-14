import { fromTasks } from '@/lib/detail-navigation';
import { ROUTES } from '@/constants/routes';
import { isAgentArchivedReason } from '@/constants/agent-archived-case';
import { propertyJobKindHref } from '@/lib/property-job-href';
import {
  getAgencyPortalLevel,
  isInspectionOnlyAgent,
  isInspectionOnlyTaskCategory,
  isLegacyLevel,
  isPropertyInspectionOnly,
  isTaskCategoryAllowedForAgent,
} from '@/lib/portal-service-level';
import { buildPropertyProfileTasks, type PropertyProfileTask } from '@/lib/property-profile-tasks';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  Agency,
  AgentArchiveView,
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
import { formatDate, formatDateTime, formatPropertyFullAddress } from '@/lib/utils';

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
  { id: 'need_action', label: 'Needs My Action', sublabel: 'Agent needs to act' },
  { id: 'cros_handling', label: 'In Progress', sublabel: 'Work actively being handled' },
  { id: 'waiting', label: 'Waiting', sublabel: 'Awaiting an external response' },
  { id: 'completed', label: 'Completed', sublabel: 'Finished in the last 30 days' },
];

export const TASK_LIST_V2_CATEGORY_FILTERS: {
  id: TaskListV2Category;
  label: string;
}[] = [
  { id: 'all', label: 'All Types' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'leasing', label: 'Leasing' },
  { id: 'rent_review', label: 'Rent Review' },
  { id: 'tribunal', label: 'Tribunal' },
];

export function taskListV2CategoryFiltersForAccess(
  hasFullAccess: boolean,
): { id: TaskListV2Category; label: string }[] {
  return TASK_LIST_V2_CATEGORY_FILTERS.filter((option) =>
    isTaskCategoryAllowedForAgent(option.id, hasFullAccess),
  );
}

function inspectionHasInspector(row: TaskListV2Row): boolean {
  const description = row.task.jobRow?.description ?? '';
  const first = description.split(' · ')[0]?.trim();
  if (!first || first === '—' || /^report:/i.test(first)) return false;
  if (/\d/.test(first) && /\b(am|pm|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b/i.test(first)) {
    return false;
  }
  return true;
}

/** Work status follows who must act, not the task type. */
function applyTaskResponsibility(row: TaskListV2Row, agencies: Agency[]): TaskListV2Row {
  if (row.bucket === 'completed' || row.task.status === 'approval_required') return row;
  if (row.category !== 'inspection') return row;
  if (isWaitingTask(row.task) && inspectionHasInspector(row)) return row;
  const agentArranges = taskServiceLabel(row, agencies) !== 'Full Service';
  const bucket = agentArranges && !inspectionHasInspector(row) ? 'need_action' : 'cros_handling';
  if (bucket === row.bucket) return row;
  const status = statusPresentation(row.task, bucket);
  return {
    ...row,
    bucket,
    statusLabel: status.label,
    statusSublabel: status.sublabel,
    statusTone: status.tone,
  };
}

/** Drop Level 2 workflows from Level 1 properties (inspection + tribunal only). */
export function filterTaskListV2RowsForAgencies(
  rows: TaskListV2Row[],
  agencies: Agency[],
): TaskListV2Row[] {
  if (isInspectionOnlyAgent(agencies)) {
    return rows
      .filter((row) => isInspectionOnlyTaskCategory(row.category))
      .map((row) => applyTaskResponsibility(row, agencies));
  }
  return rows
    .filter((row) => {
      if (!isPropertyInspectionOnly(agencies, row.property.agencyId)) return true;
      return isInspectionOnlyTaskCategory(row.category);
    })
    .map((row) => applyTaskResponsibility(row, agencies));
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
  return /awaiting|waiting|pending (tenant|owner|landlord|response)|no reply/i.test(haystack);
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
      label: 'Needs My Action',
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
    label: 'In Progress',
    sublabel: task.jobRow?.status ?? 'Being handled by CROS',
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

export type ArchivedPropertyTaskGroup = {
  property: Property;
  propertyAddress: string;
  rows: TaskListV2Row[];
};

type PortfolioTaskListInput = {
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
};

function closedStatusSublabel(task: PropertyProfileTask): string {
  const reason =
    task.jobRow?.description
      ?.split(' · ')
      .map((part) => part.trim())
      .find((part) => isAgentArchivedReason(part)) ?? null;
  if (reason) return reason;
  return 'No further action required';
}

function toTaskListV2Row(
  property: Property,
  task: PropertyProfileTask,
  options?: { presentAsClosed?: boolean },
): TaskListV2Row {
  const bucket = options?.presentAsClosed ? 'completed' : classifyBucket(task);
  const category = taskCategory(task);
  const status = options?.presentAsClosed
    ? {
        label: 'Closed',
        sublabel: closedStatusSublabel(task),
        tone: 'completed' as const,
      }
    : statusPresentation(task, bucket);
  const propertyAddress = task.needAction?.propertyAddress ?? formatPropertyAddress(property);

  return {
    id: `${property.id}:${task.id}`,
    propertyId: property.id,
    propertyAddress,
    property,
    task,
    href: resolveTaskListV2Href(task, property.id),
    bucket,
    category,
    typeLabel: TYPE_LABEL[category],
    statusLabel: status.label,
    statusSublabel: status.sublabel,
    statusTone: status.tone,
    updatedAt: task.sortAt,
    updatedLabel: task.sortAt > 0 ? formatDateTime(new Date(task.sortAt).toISOString()) : '—',
    needsReview: options?.presentAsClosed ? false : task.status === 'approval_required',
  };
}

function groupByPropertyId<T extends { propertyId: string }>(rows: readonly T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const existing = grouped.get(row.propertyId);
    if (existing) existing.push(row);
    else grouped.set(row.propertyId, [row]);
  }
  return grouped;
}

type PortfolioTaskIndexes = {
  maintenance: Map<string, MaintenanceRequest[]>;
  inspections: Map<string, Inspection[]>;
  rentReviews: Map<string, RentReviewCase[]>;
  leasingCycles: Map<string, LeasingCycle[]>;
  tenantSelections: Map<string, TenantSelectionCase[]>;
  vacating: Map<string, VacatingCase[]>;
  tribunalCases: Map<string, TribunalCase[]>;
  accounting: Map<string, PropertyAccounting>;
  currentLease: Map<string, LeasingRecord>;
  deletedLeasingCycles: Map<string, ArchivedLeasingCycle[]>;
  deletedEndLeasingCases: Map<string, ArchivedEndLeasingCase[]>;
  deletedRentReviews: Map<string, ArchivedRentReview[]>;
};

function indexPortfolioTasks(
  input: Omit<PortfolioTaskListInput, 'properties' | 'getPropertyActions'> & {
    archive?: AgentArchiveView;
  },
): PortfolioTaskIndexes {
  const currentLease = new Map<string, LeasingRecord>();
  for (const row of input.leasingRecords) {
    if (row.status === 'current' && !currentLease.has(row.propertyId)) {
      currentLease.set(row.propertyId, row);
    }
  }
  const accounting = new Map<string, PropertyAccounting>();
  for (const row of input.accounting) {
    if (!accounting.has(row.propertyId)) accounting.set(row.propertyId, row);
  }
  return {
    maintenance: groupByPropertyId(input.maintenanceAll),
    inspections: groupByPropertyId(input.inspections),
    rentReviews: groupByPropertyId(input.rentReviews),
    leasingCycles: groupByPropertyId(input.leasingCycles),
    tenantSelections: groupByPropertyId(input.tenantSelections),
    vacating: groupByPropertyId(input.vacating),
    tribunalCases: groupByPropertyId(input.tribunalCases),
    accounting,
    currentLease,
    deletedLeasingCycles: groupByPropertyId(input.archive?.cancelledLeasingCycles ?? []),
    deletedEndLeasingCases: groupByPropertyId(input.archive?.cancelledEndLeasing ?? []),
    deletedRentReviews: groupByPropertyId(input.archive?.cancelledRentReviews ?? []),
  };
}

function tasksForProperty(
  property: Property,
  input: Omit<PortfolioTaskListInput, 'properties' | 'getPropertyActions'> & {
    getPropertyActions?: (propertyId: string) => PropertyNeedAction[];
  },
  index: PortfolioTaskIndexes,
): PropertyProfileTask[] {
  const propertyId = property.id;

  return buildPropertyProfileTasks({
    property,
    propertyId,
    maintenance: index.maintenance.get(propertyId) ?? [],
    inspections: index.inspections.get(propertyId) ?? [],
    rentReviews: index.rentReviews.get(propertyId) ?? [],
    rentReviewDecisions: input.rentReviewDecisions,
    leasingCycles: index.leasingCycles.get(propertyId) ?? [],
    tenantSelections: index.tenantSelections.get(propertyId) ?? [],
    vacatingCases: index.vacating.get(propertyId) ?? [],
    tribunalCases: index.tribunalCases.get(propertyId) ?? [],
    accounting: index.accounting.get(propertyId) ?? null,
    currentLease: index.currentLease.get(propertyId),
    needActions: input.getPropertyActions?.(propertyId) ?? [],
    deletedLeasingCycles: index.deletedLeasingCycles.get(propertyId),
    deletedEndLeasingCases: index.deletedEndLeasingCases.get(propertyId),
    deletedRentReviews: index.deletedRentReviews.get(propertyId),
  });
}

export function buildPortfolioTaskList(input: PortfolioTaskListInput): TaskListV2Row[] {
  const rows: TaskListV2Row[] = [];
  const index = indexPortfolioTasks(input);

  for (const property of input.properties) {
    const tasks = tasksForProperty(property, input, index);

    for (const task of tasks) {
      if (task.lifecycle === 'deleted' || task.lifecycle === 'archived') continue;
      rows.push(toTaskListV2Row(property, task));
    }
  }

  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Closed tasks for archived properties, grouped under each address. */
export function buildArchivedPropertyTaskGroups(
  input: Omit<PortfolioTaskListInput, 'properties' | 'getPropertyActions'> & {
    archivedProperties: Property[];
    archive: AgentArchiveView;
  },
): ArchivedPropertyTaskGroup[] {
  const index = indexPortfolioTasks(input);
  return [...input.archivedProperties]
    .sort((a, b) =>
      formatPropertyFullAddress(a).localeCompare(formatPropertyFullAddress(b), undefined, {
        sensitivity: 'base',
      }),
    )
    .map((property) => {
      const tasks = tasksForProperty(property, input, index);
      const rows = tasks
        .map((task) => toTaskListV2Row(property, task, { presentAsClosed: true }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return {
        property,
        propertyAddress: formatPropertyFullAddress(property),
        rows,
      };
    });
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
      (row) =>
        (row.bucket !== 'completed' && row.task.lifecycle === 'active') ||
        (row.bucket === 'completed' && now - row.updatedAt <= THIRTY_DAYS_MS),
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
        row.task.subtext.toLowerCase().includes(query) ||
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
  const recentCompleted = rows.filter(
    (row) => row.bucket === 'completed' && now - row.updatedAt <= THIRTY_DAYS_MS,
  ).length;

  return {
    all: active.length + recentCompleted,
    need_action: active.filter((row) => row.bucket === 'need_action').length,
    cros_handling: active.filter((row) => row.bucket === 'cros_handling').length,
    waiting: active.filter((row) => row.bucket === 'waiting').length,
    completed: recentCompleted,
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

export type TaskDueTone = 'overdue' | 'soon' | 'normal' | 'muted';

export type TaskDueMeta = {
  sort: number;
  primary: string;
  secondary: string;
  tone: TaskDueTone;
};

export type TaskListPriority = 'all' | 'urgent' | 'high' | 'normal' | 'low';
export type TaskAssigneeFilter = 'all' | 'me' | 'cros' | 'unassigned';
export type TaskServiceFilter = 'all' | 'full' | 'self' | 'inspection';
export type TaskCreatedFilter = 'all' | 'today' | '7' | 'custom';
export type TaskDueFilter = 'all' | 'overdue' | 'today' | '7' | '14' | '30' | 'custom';

export type TaskMoreFilters = {
  assignee: TaskAssigneeFilter;
  service: TaskServiceFilter;
  priority: TaskListPriority;
  created: TaskCreatedFilter;
  createdFrom: string;
  createdTo: string;
  due: TaskDueFilter;
  dueFrom: string;
  dueTo: string;
  property: string;
  updated: TaskCreatedFilter;
  updatedFrom: string;
  updatedTo: string;
};

export const EMPTY_TASK_MORE_FILTERS: TaskMoreFilters = {
  assignee: 'all',
  service: 'all',
  priority: 'all',
  created: 'all',
  createdFrom: '',
  createdTo: '',
  due: 'all',
  dueFrom: '',
  dueTo: '',
  property: '',
  updated: 'all',
  updatedFrom: '',
  updatedTo: '',
};

function parseDisplayDate(value: string | undefined): number | null {
  if (!value || value === '—') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function taskReference(row: TaskListV2Row): string {
  const name = row.task.jobRow?.name?.trim();
  return name && name !== '—' ? name : '';
}

export function taskSubtypeLabel(row: TaskListV2Row): string {
  const job = row.task.jobRow;
  if (!job) return row.task.detail?.trim() || 'General';
  if (row.category === 'inspection') {
    return job.jobType.replace(/\s+inspection$/i, '') || job.status;
  }
  if (job.status && job.status !== '—') return job.status;
  return job.jobType || 'General';
}

export function taskAssignee(row: TaskListV2Row): string {
  const named =
    row.property.assignedPortalAgentName?.trim() || row.property.propertyManager?.trim();
  if (named) return named;
  if (row.category === 'inspection') {
    const inspector = row.task.jobRow?.description.split(' · ')[0]?.trim();
    if (inspector && inspector !== '—') return inspector;
  }
  return 'Unassigned';
}

export function taskAssigneeInitials(name: string): string {
  if (name === 'Unassigned') return '';
  const parts = name.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function taskServiceLabel(
  row: TaskListV2Row,
  agencies: Agency[],
): 'Full Service' | 'Self-Manage' | 'Inspection Only' {
  const level = getAgencyPortalLevel(agencies, row.property.agencyId);
  if (level === 'LEVEL_1_INSPECTION_ONLY') return 'Inspection Only';
  if (isLegacyLevel(level)) return 'Self-Manage';
  return 'Full Service';
}

export function taskPriority(row: TaskListV2Row): Exclude<TaskListPriority, 'all'> {
  const priority = row.task.needAction?.priority;
  if (priority === 'urgent' || priority === 'high' || priority === 'low') return priority;
  return 'normal';
}

export function taskAssigneeGroup(
  row: TaskListV2Row,
  currentUserName: string,
): Exclude<TaskAssigneeFilter, 'all'> {
  const assignee = taskAssignee(row);
  if (assignee === 'Unassigned') return 'unassigned';
  const name = currentUserName.trim().toLowerCase();
  const value = assignee.toLowerCase();
  if (name && name.split(/\s+/).every((part) => value.includes(part))) return 'me';
  return 'cros';
}

export function taskDueMeta(row: TaskListV2Row, now = new Date()): TaskDueMeta {
  const raw = row.task.jobRow?.date;
  const dueMs = parseDisplayDate(raw);
  if (dueMs == null) {
    return {
      sort: Number.POSITIVE_INFINITY,
      primary: 'No due date',
      secondary: row.updatedLabel === '—' ? '' : row.updatedLabel,
      tone: 'muted',
    };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dueDay = new Date(dueMs);
  dueDay.setHours(0, 0, 0, 0);
  const days = Math.round((dueDay.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const formatted = raw && raw !== '—' ? raw : formatDate(new Date(dueMs).toISOString());
  const [datePart, timePart] = formatted.split(',').map((part) => part.trim());

  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      sort: dueMs,
      primary: `Overdue ${overdue} day${overdue === 1 ? '' : 's'}`,
      secondary: datePart,
      tone: 'overdue',
    };
  }
  if (days === 0) {
    return { sort: dueMs, primary: 'Today', secondary: timePart || datePart, tone: 'soon' };
  }
  if (days === 1) {
    return { sort: dueMs, primary: 'Tomorrow', secondary: datePart, tone: 'soon' };
  }
  if (days <= 7) {
    return { sort: dueMs, primary: `In ${days} days`, secondary: datePart, tone: 'soon' };
  }
  return { sort: dueMs, primary: datePart, secondary: timePart || '', tone: 'normal' };
}

export function sortTasksByDueDate(rows: TaskListV2Row[], now = new Date()): TaskListV2Row[] {
  return [...rows].sort((a, b) => taskDueMeta(a, now).sort - taskDueMeta(b, now).sort);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayOffset(ms: number, now: Date): number {
  return Math.round((startOfDay(new Date(ms)).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000));
}

function matchesPastWindow(
  ms: number | null,
  preset: TaskCreatedFilter,
  from: string,
  to: string,
  now: Date,
): boolean {
  if (preset === 'all') return true;
  if (ms == null || Number.isNaN(ms)) return false;
  const offset = dayOffset(ms, now);
  if (preset === 'today') return offset === 0;
  if (preset === '7') return offset <= 0 && offset >= -7;
  const fromMs = from ? Date.parse(from) : null;
  const toMs = to ? Date.parse(to) : null;
  if (fromMs == null && toMs == null) return true;
  const day = startOfDay(new Date(ms)).getTime();
  if (fromMs != null && day < startOfDay(new Date(fromMs)).getTime()) return false;
  if (toMs != null && day > startOfDay(new Date(toMs)).getTime()) return false;
  return true;
}

function matchesDueWindow(row: TaskListV2Row, filters: TaskMoreFilters, now: Date): boolean {
  if (filters.due === 'all') return true;
  const due = taskDueMeta(row, now);
  if (due.sort === Number.POSITIVE_INFINITY) return false;
  const offset = dayOffset(due.sort, now);
  if (filters.due === 'overdue') return offset < 0;
  if (filters.due === 'today') return offset === 0;
  if (filters.due === '7') return offset >= 0 && offset <= 7;
  if (filters.due === '14') return offset >= 0 && offset <= 14;
  if (filters.due === '30') return offset >= 0 && offset <= 30;
  return matchesPastWindow(due.sort, 'custom', filters.dueFrom, filters.dueTo, now);
}

export function taskMatchesMoreFilters(
  row: TaskListV2Row,
  filters: TaskMoreFilters,
  options: { agencies: Agency[]; currentUserName: string; now?: Date },
): boolean {
  const now = options.now ?? new Date();
  if (filters.assignee !== 'all' && taskAssigneeGroup(row, options.currentUserName) !== filters.assignee) {
    return false;
  }
  if (filters.priority !== 'all' && taskPriority(row) !== filters.priority) return false;
  if (filters.service !== 'all') {
    const service = taskServiceLabel(row, options.agencies);
    const expected =
      filters.service === 'full'
        ? 'Full Service'
        : filters.service === 'self'
          ? 'Self-Manage'
          : 'Inspection Only';
    if (service !== expected) return false;
  }
  if (filters.property.trim()) {
    const query = filters.property.trim().toLowerCase();
    const address = `${row.property.address} ${row.property.suburb ?? ''} ${row.propertyAddress}`.toLowerCase();
    if (!address.includes(query)) return false;
  }
  const createdMs = row.task.jobRow?.createdAtMs || null;
  if (!matchesPastWindow(createdMs, filters.created, filters.createdFrom, filters.createdTo, now)) {
    return false;
  }
  if (!matchesPastWindow(row.updatedAt || null, filters.updated, filters.updatedFrom, filters.updatedTo, now)) {
    return false;
  }
  return matchesDueWindow(row, filters, now);
}

const ASSIGNEE_CHIP: Record<Exclude<TaskAssigneeFilter, 'all'>, string> = {
  me: 'Me',
  cros: 'CROS Team',
  unassigned: 'Unassigned',
};
const SERVICE_CHIP: Record<Exclude<TaskServiceFilter, 'all'>, string> = {
  full: 'Full Service',
  self: 'Self-Manage',
  inspection: 'Inspection Only',
};
const PRIORITY_CHIP: Record<Exclude<TaskListPriority, 'all'>, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};
const PAST_CHIP: Record<Exclude<TaskCreatedFilter, 'all'>, string> = {
  today: 'Today',
  '7': 'Last 7 days',
  custom: 'Custom',
};
const DUE_CHIP: Record<Exclude<TaskDueFilter, 'all'>, string> = {
  overdue: 'Overdue',
  today: 'Today',
  '7': 'Next 7 days',
  '14': 'Next 14 days',
  '30': 'Next 30 days',
  custom: 'Custom range',
};

function customRangeLabel(from: string, to: string, fallback: string): string {
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return fallback;
}

export function taskMoreFilterChips(filters: TaskMoreFilters): { key: keyof TaskMoreFilters; label: string }[] {
  const chips: { key: keyof TaskMoreFilters; label: string }[] = [];
  if (filters.assignee !== 'all') chips.push({ key: 'assignee', label: `Assigned: ${ASSIGNEE_CHIP[filters.assignee]}` });
  if (filters.service !== 'all') chips.push({ key: 'service', label: `Service: ${SERVICE_CHIP[filters.service]}` });
  if (filters.priority !== 'all') chips.push({ key: 'priority', label: `Priority: ${PRIORITY_CHIP[filters.priority]}` });
  if (filters.created !== 'all') {
    chips.push({
      key: 'created',
      label: `Created: ${
        filters.created === 'custom'
          ? customRangeLabel(filters.createdFrom, filters.createdTo, PAST_CHIP.custom)
          : PAST_CHIP[filters.created]
      }`,
    });
  }
  if (filters.due !== 'all') {
    chips.push({
      key: 'due',
      label: `Due: ${
        filters.due === 'custom'
          ? customRangeLabel(filters.dueFrom, filters.dueTo, DUE_CHIP.custom)
          : DUE_CHIP[filters.due]
      }`,
    });
  }
  if (filters.property.trim()) chips.push({ key: 'property', label: `Property: ${filters.property.trim()}` });
  if (filters.updated !== 'all') {
    chips.push({
      key: 'updated',
      label: `Updated: ${
        filters.updated === 'custom'
          ? customRangeLabel(filters.updatedFrom, filters.updatedTo, PAST_CHIP.custom)
          : PAST_CHIP[filters.updated]
      }`,
    });
  }
  return chips;
}

export function clearTaskMoreFilter(filters: TaskMoreFilters, key: keyof TaskMoreFilters): TaskMoreFilters {
  if (key === 'assignee') return { ...filters, assignee: 'all' };
  if (key === 'service') return { ...filters, service: 'all' };
  if (key === 'priority') return { ...filters, priority: 'all' };
  if (key === 'created') return { ...filters, created: 'all', createdFrom: '', createdTo: '' };
  if (key === 'due') return { ...filters, due: 'all', dueFrom: '', dueTo: '' };
  if (key === 'property') return { ...filters, property: '' };
  return { ...filters, updated: 'all', updatedFrom: '', updatedTo: '' };
}
