'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  ChevronRight,
  Gavel,
  Pin,
  Wrench,
} from 'lucide-react';

import { PropertyOverviewJobDialog } from '@/components/agent/property-overview-job-dialog';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { leasingDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import type { PropertyLeasingWorkflowCase } from '@/lib/property-leasing-workflow-cases';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { isPropertyVacant } from '@/lib/property-leasing';
import {
  buildPropertyProfileTasks,
  countPropertyProfileTasksByCategory,
  filterPropertyProfileTasks,
  PROPERTY_PROFILE_TASK_CATEGORY_FILTERS,
  type PropertyProfileTask,
  type PropertyProfileTaskCategoryFilter,
  type PropertyProfileTaskStatusFilter,
} from '@/lib/property-profile-tasks';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  AgentDocument,
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
import { cn } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';

const VISIBLE_LIMIT = 6;

function TaskIcon({ task }: { task: PropertyProfileTask }) {
  const className = 'size-4';
  const wrapClass = cn(
    'flex size-10 shrink-0 items-center justify-center rounded-xl',
    task.category === 'maintenance' && 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    task.category === 'inspection' && 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
    task.category === 'leasing' && 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
    task.category === 'tribunal' && 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  );

  return (
    <span className={wrapClass}>
      {task.category === 'maintenance' ? (
        <Wrench className={className} />
      ) : task.category === 'inspection' ? (
        <Calendar className={className} />
      ) : task.category === 'tribunal' ? (
        <Gavel className={className} />
      ) : (
        <Briefcase className={className} />
      )}
    </span>
  );
}

function TaskPhaseBadge({ task }: { task: PropertyProfileTask }) {
  const completed = task.phase === 'completed';
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        completed
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/12 text-primary',
      )}
    >
      {completed ? 'Completed' : 'In progress'}
    </span>
  );
}

function TaskCard({
  task,
  onOpen,
}: {
  task: PropertyProfileTask;
  onOpen: (task: PropertyProfileTask) => void;
}) {
  const needsReview = task.status === 'approval_required';
  const completed = task.phase === 'completed';

  return (
    <article
      className={cn(
        'property-profile-v2__task-card relative rounded-2xl border bg-card p-4',
        needsReview && 'property-profile-v2__task-card--attention',
        completed && 'opacity-90',
      )}
    >
      {task.pinned ? (
        <Pin
          className="text-destructive absolute top-3 right-3 size-3.5 rotate-45"
          aria-label="Pinned"
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <TaskIcon task={task} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold leading-snug">{task.title}</h4>
              <TaskPhaseBadge task={task} />
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">{task.subtext}</p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{task.description}</p>
            <p
              className={cn(
                'mt-2 text-xs font-medium',
                needsReview
                  ? 'text-amber-700 dark:text-amber-300'
                  : completed
                    ? 'text-muted-foreground'
                    : 'text-primary',
              )}
            >
              {needsReview
                ? 'Approval required'
                : completed
                  ? 'No further action required'
                  : 'No action required'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:min-w-[9rem] sm:items-end">
          {task.detail ? (
            <p className="text-muted-foreground text-right text-xs leading-snug sm:max-w-[12rem]">
              {task.detail}
            </p>
          ) : null}
          {needsReview ? (
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="property-profile-v2__review-btn inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold"
            >
              Review
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="text-primary text-right text-xs font-medium hover:underline"
            >
              View details
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function PropertyProfileTasksTab({
  property,
  propertyId,
  maintenance,
  inspections,
  propertyDocs: _propertyDocs,
  leasing,
  currentLease,
  rentReviewDecisions,
  tenancyRentReviews,
  leasingCycles = [],
  tenantSelections = [],
  vacatingCases = [],
  tribunalCases = [],
  accounting,
  needActions,
  deletedLeasingCycles = [],
  deletedEndLeasingCases = [],
  deletedRentReviews = [],
  onViewRentReview,
  onOpenInspectionCreated,
  onNavigate,
}: {
  property: Property;
  propertyId: string;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasing: LeasingRecord[];
  currentLease?: LeasingRecord;
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  tenancyRentReviews: RentReviewCase[];
  leasingCycles?: LeasingCycle[];
  tenantSelections?: TenantSelectionCase[];
  vacatingCases?: VacatingCase[];
  tribunalCases?: TribunalCase[];
  accounting?: PropertyAccounting | null;
  needActions: PropertyNeedAction[];
  deletedLeasingCycles?: ArchivedLeasingCycle[];
  deletedEndLeasingCases?: ArchivedEndLeasingCase[];
  deletedRentReviews?: ArchivedRentReview[];
  onViewRentReview?: (reviewId: string) => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
  onNavigate: (href: string) => void;
}) {
  const router = useRouter();
  const isV2 = useIsAgentUiV2();
  const [categoryFilter, setCategoryFilter] =
    useState<PropertyProfileTaskCategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<PropertyProfileTaskStatusFilter>('in_progress');
  const [showAll, setShowAll] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PropertyJobRow | null>(null);

  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : leasing);

  const leasingWorkflowCases = useMemo(
    () =>
      buildPropertyLeasingWorkflowCases({
        propertyId,
        leasingCycles,
        tenantSelections,
        vacatingCases,
        rentReviews: tenancyRentReviews,
        rentReviewDecisions,
        currentLease,
        isVacant,
      }),
    [
      propertyId,
      leasingCycles,
      tenantSelections,
      vacatingCases,
      tenancyRentReviews,
      rentReviewDecisions,
      currentLease,
      isVacant,
    ],
  );

  const allTasks = useMemo(
    () =>
      buildPropertyProfileTasks({
        property,
        propertyId,
        maintenance,
        inspections,
        rentReviews: tenancyRentReviews,
        rentReviewDecisions,
        leasingCycles,
        tenantSelections,
        vacatingCases,
        tribunalCases,
        accounting,
        currentLease,
        needActions,
        deletedLeasingCycles,
        deletedEndLeasingCases,
        deletedRentReviews,
      }),
    [
      property,
      propertyId,
      maintenance,
      inspections,
      tenancyRentReviews,
      rentReviewDecisions,
      leasingCycles,
      tenantSelections,
      vacatingCases,
      tribunalCases,
      accounting,
      currentLease,
      needActions,
      deletedLeasingCycles,
      deletedEndLeasingCases,
      deletedRentReviews,
    ],
  );

  const tasksForCategoryCounts = useMemo(
    () => filterPropertyProfileTasks(allTasks, 'all', statusFilter),
    [allTasks, statusFilter],
  );

  const categoryCounts = useMemo(
    () => countPropertyProfileTasksByCategory(tasksForCategoryCounts),
    [tasksForCategoryCounts],
  );

  const filteredTasks = useMemo(
    () => filterPropertyProfileTasks(allTasks, categoryFilter, statusFilter),
    [allTasks, categoryFilter, statusFilter],
  );

  const visibleTasks = showAll ? filteredTasks : filteredTasks.slice(0, VISIBLE_LIMIT);
  const hasMore = filteredTasks.length > VISIBLE_LIMIT && !showAll;

  const navContext = useMemo(() => fromProperty(propertyId, 'Tasks'), [propertyId]);

  const openTask = (task: PropertyProfileTask) => {
    if (isV2 && task.jobRow?.kind === 'leasing') {
      router.push(leasingDetail(task.jobRow.id, navContext));
      return;
    }
    if (task.jobRow) {
      setSelectedJob(task.jobRow);
      return;
    }
    if (task.needAction) {
      onNavigate(task.needAction.href);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PROPERTY_PROFILE_TASK_CATEGORY_FILTERS.map((filter) => {
            const count =
              filter.id === 'all'
                ? tasksForCategoryCounts.length
                : categoryCounts[filter.id as keyof typeof categoryCounts];
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(filter.id);
                  setShowAll(false);
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  categoryFilter === filter.id
                    ? 'border-primary/30 bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50',
                )}
              >
                {filter.label} {count}
              </button>
            );
          })}
        </div>

        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="sr-only">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as PropertyProfileTaskStatusFilter);
              setShowAll(false);
            }}
            className="bg-background rounded-xl border px-3 py-2 text-xs font-medium"
          >
            <option value="in_progress">Active</option>
            <option value="all">All status</option>
            <option value="completed">Completed</option>
            <option value="deleted">Deleted</option>
            <option value="archived">Archived</option>
            <option value="needs_action">Needs action</option>
            <option value="no_action">No action required</option>
          </select>
        </label>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="v2-dashboard__card rounded-2xl border px-4 py-10 text-center">
          <p className="text-sm font-medium">No tasks match these filters</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Active maintenance, inspections, leasing, and tribunal cases for this property appear
            here. Use the status filter to view completed, deleted, or archived tasks.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleTasks.map((task) => (
            <li key={task.id}>
              <TaskCard task={task} onOpen={openTask} />
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
          >
            View all tasks
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}

      <PropertyOverviewJobDialog
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        property={property}
        propertyId={propertyId}
        maintenance={maintenance}
        inspections={inspections}
        rentReviews={tenancyRentReviews}
        rentReviewDecisions={rentReviewDecisions}
        leasingCases={leasingWorkflowCases}
        vacatingCases={vacatingCases}
        tribunalCases={tribunalCases}
        accounting={accounting}
        tenantSelections={tenantSelections}
        currentLease={currentLease}
        onViewRentReview={(reviewId) => {
          setSelectedJob(null);
          onViewRentReview?.(reviewId);
        }}
        onOpenInspectionCreated={(inspectionId) => {
          setSelectedJob(null);
          onOpenInspectionCreated?.(inspectionId);
        }}
      />
    </div>
  );
}
