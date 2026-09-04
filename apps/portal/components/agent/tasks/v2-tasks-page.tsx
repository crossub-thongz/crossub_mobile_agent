'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { AgentHowToUseLink } from '@/components/agent/agent-module-tutorial';
import { EmptyState } from '@/components/agent/empty-state';
import { NewTaskActionsMenu } from '@/components/agent/tasks/new-task-actions-menu';
import { TaskListV2Table } from '@/components/agent/tasks/task-list-v2-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentStore } from '@/lib/store';
import {
  buildPortfolioTaskList,
  countTaskListV2Buckets,
  countTaskListV2Categories,
  filterTaskListV2Rows,
  filterTaskListV2RowsForAgencies,
  taskListV2CategoryFiltersForAccess,
  TASK_LIST_V2_BUCKET_FILTERS,
  type TaskListV2Bucket,
  type TaskListV2Category,
} from '@/lib/task-list-v2';
import { isTaskCategoryAllowedForAgent } from '@/lib/portal-service-level';
import { cn } from '@/lib/utils';

import '@/components/agent/tasks/task-list-v2.css';

const BUCKET_ICON: Record<
  Exclude<TaskListV2Bucket, 'all'>,
  typeof AlertCircle
> = {
  need_action: AlertCircle,
  cros_handling: Sparkles,
  waiting: Clock3,
  completed: CheckCircle2,
};

const BUCKET_TONE: Record<
  Exclude<TaskListV2Bucket, 'all'>,
  { icon: string; card: string; count: string }
> = {
  need_action: {
    icon: 'text-rose-600',
    card: 'border-l-4 border-l-rose-500',
    count: 'text-rose-700 dark:text-rose-300',
  },
  cros_handling: {
    icon: 'text-emerald-600',
    card: 'border-l-4 border-l-emerald-500',
    count: 'text-emerald-700 dark:text-emerald-300',
  },
  waiting: {
    icon: 'text-amber-600',
    card: 'border-l-4 border-l-amber-500',
    count: 'text-amber-800 dark:text-amber-300',
  },
  completed: {
    icon: 'text-muted-foreground',
    card: 'border-l-4 border-l-border',
    count: 'text-foreground',
  },
};

export function V2TasksPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const propertyFilter = searchParams.get('property');

  const {
    properties,
    agencies,
    hasFullManagementAccess,
    isInspectionOnlyAgent,
    leasingRecords,
    maintenanceAll,
    inspections,
    rentReviews,
    leasingCycles,
    tenantSelections,
    vacating,
    tribunalCases,
    accounting,
    getPropertyActions,
  } = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);

  const [bucket, setBucket] = useState<TaskListV2Bucket>('all');
  const [category, setCategory] = useState<TaskListV2Category>(() => {
    if (urlFilter === 'Maintenance') return 'maintenance';
    if (urlFilter === 'Leasing') return 'leasing';
    if (urlFilter === 'Inspection') return 'inspection';
    if (urlFilter === 'Accounting') return 'rent_review';
    if (urlFilter === 'Tribunal') return 'tribunal';
    return 'all';
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allRows = useMemo(
    () =>
      filterTaskListV2RowsForAgencies(
        buildPortfolioTaskList({
          properties: propertyFilter
            ? properties.filter((property) => property.id === propertyFilter)
            : properties,
          leasingRecords,
          maintenanceAll,
          inspections,
          rentReviews,
          rentReviewDecisions,
          leasingCycles,
          tenantSelections,
          vacating,
          tribunalCases,
          accounting,
          getPropertyActions,
        }),
        agencies,
      ),
    [
      accounting,
      agencies,
      getPropertyActions,
      inspections,
      leasingCycles,
      leasingRecords,
      maintenanceAll,
      properties,
      propertyFilter,
      rentReviewDecisions,
      rentReviews,
      tenantSelections,
      tribunalCases,
      vacating,
    ],
  );

  const categoryFilters = useMemo(
    () => taskListV2CategoryFiltersForAccess(hasFullManagementAccess),
    [hasFullManagementAccess],
  );

  useEffect(() => {
    if (!isTaskCategoryAllowedForAgent(category, hasFullManagementAccess)) {
      setCategory('all');
    }
  }, [category, hasFullManagementAccess]);

  const bucketCounts = useMemo(() => countTaskListV2Buckets(allRows), [allRows]);
  const categoryCounts = useMemo(
    () => countTaskListV2Categories(allRows, bucket),
    [allRows, bucket],
  );

  const filtered = useMemo(
    () => filterTaskListV2Rows(allRows, bucket, category, search),
    [allRows, bucket, category, search],
  );

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [bucket, category, search]);

  return (
    <div className="task-list-v2 v2-dashboard normal-case space-y-4 px-6 py-4 lg:px-8 lg:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
            <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
              {bucketCounts.all}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Track all work being handled by CROSSUB
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AgentHowToUseLink module="tasks" className="rounded-xl border bg-transparent px-3 py-2" />
          <NewTaskActionsMenu propertyId={propertyFilter ?? undefined} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_LIST_V2_BUCKET_FILTERS.map((option) => {
          const Icon = BUCKET_ICON[option.id];
          const active = bucket === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-tour={`tasks-bucket-${option.id}`}
              onClick={() => setBucket((current) => (current === option.id ? 'all' : option.id))}
              className={cn(
                'v2-frosted-surface rounded-2xl border p-4 text-left transition',
                BUCKET_TONE[option.id].card,
                active && 'ring-1 ring-primary/20',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{option.sublabel}</p>
                </div>
                <Icon className={cn('size-5 shrink-0', BUCKET_TONE[option.id].icon)} />
              </div>
              <p className={cn('mt-3 text-2xl font-semibold tabular-nums', BUCKET_TONE[option.id].count)}>
                {bucketCounts[option.id]}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <div className="flex gap-1" data-tour="tasks-type-tabs">
            {categoryFilters.map((option) => (
              <button
                key={option.id}
                type="button"
                data-tour={option.id === 'all' ? undefined : `tasks-category-${option.id}`}
                onClick={() => setCategory(option.id)}
                className={cn(
                  'border-b-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition',
                  category === option.id
                    ? 'border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
              >
                {option.label}
                <span className="ml-1.5 text-xs font-semibold tabular-nums opacity-70">
                  {categoryCounts[option.id]}
                </span>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="v2-frosted-surface mb-1 shrink-0 rounded-xl"
            type="button"
            data-tour="tasks-filters"
            onClick={() => searchInputRef.current?.focus()}
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
          </Button>
        </div>
        <div className="relative mb-1 min-w-[16rem] flex-1 sm:max-w-xs" data-tour="tasks-search">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            ref={searchInputRef}
            placeholder="Search tasks, addresses, or tenants"
            className="v2-frosted-surface rounded-xl pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search || category !== 'all' || bucket !== 'all' ? 'No matching tasks' : 'No tasks yet'}
          description={
            search || category !== 'all' || bucket !== 'all'
              ? 'Try a different search or filter.'
              : isInspectionOnlyAgent
                ? 'Active inspections and tribunal work will appear here.'
                : 'Active maintenance, inspections, leasing, and tribunal work will appear here.'
          }
        />
      ) : (
        <div className="min-w-0" data-tour="tasks-table">
          <TaskListV2Table rows={pageRows} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Showing {showingFrom} to {showingTo} of {filtered.length} task
              {filtered.length === 1 ? '' : 's'}
            </p>
            {pageCount > 1 ? (
              <div className="flex items-center gap-1">
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      'min-w-8 rounded-lg px-2.5 py-1 text-xs font-semibold',
                      pageNumber === currentPage
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
