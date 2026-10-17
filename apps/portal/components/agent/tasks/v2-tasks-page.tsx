'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Gavel,
  Home,
  List,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

import { AgentHowToUseLink } from '@/components/agent/agent-module-tutorial';
import { EmptyState } from '@/components/agent/empty-state';
import { NewTaskActionsMenu } from '@/components/agent/tasks/new-task-actions-menu';
import { TaskListBoardTable } from '@/components/agent/tasks/task-list-board-table';
import { TaskMoreFiltersDrawer } from '@/components/agent/tasks/task-more-filters-drawer';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { TASK_LIST_COPY } from '@/constants/agent-copy-variant';
import { useAgentCopyVariant } from '@/hooks/use-agent-copy-variant';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentStore } from '@/lib/store';
import {
  buildPortfolioTaskList,
  clearTaskMoreFilter,
  countTaskListV2Buckets,
  countTaskListV2Categories,
  EMPTY_TASK_MORE_FILTERS,
  filterTaskListV2Rows,
  filterTaskListV2RowsForAgencies,
  sortTasksByDueDate,
  taskDueMeta,
  taskListV2BucketFilters,
  taskMatchesMoreFilters,
  taskMoreFilterChips,
  taskSubtypeLabel,
  taskListV2CategoryFiltersForAccess,
  type TaskDueFilter,
  type TaskListPriority,
  type TaskListV2Bucket,
  type TaskServiceFilter,
  type TaskListV2Category,
  type TaskListV2Row,
  type TaskMoreFilters,
} from '@/lib/task-list-v2';
import { isTaskCategoryAllowedForAgent } from '@/lib/portal-service-level';
import { cn } from '@/lib/utils';

import '@/components/agent/tasks/task-list-v2.css';

const BUCKET_ICON = {
  need_action: AlertCircle,
  cros_handling: Sparkles,
  waiting: Clock3,
  completed: CheckCircle2,
} as const;

const BUCKET_TONE = {
  need_action: 'bg-rose-500/12 text-rose-600',
  cros_handling: 'bg-emerald-500/12 text-emerald-600',
  waiting: 'bg-amber-500/15 text-amber-700',
  completed: 'bg-muted text-muted-foreground',
} as const;

const CATEGORY_ICON = {
  all: List,
  maintenance: Wrench,
  inspection: CalendarDays,
  leasing: Home,
  rent_review: Home,
  tribunal: Gavel,
} as const;

const selectClass =
  'border-input bg-background h-9 rounded-xl border px-3 text-sm outline-none';

const TIMING_OPTIONS: { value: TaskDueFilter; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Next 7 days' },
  { value: '14', label: 'Next 14 days' },
  { value: '30', label: 'Next 30 days' },
  { value: 'custom', label: 'Custom range' },
];

function categoryFromFilter(value: string | null): TaskListV2Category {
  if (value === 'Maintenance') return 'maintenance';
  if (value === 'Leasing') return 'leasing';
  if (value === 'Inspection') return 'inspection';
  if (value === 'Accounting') return 'rent_review';
  if (value === 'Tribunal') return 'tribunal';
  return 'all';
}

function bucketFromStatus(value: string | null): TaskListV2Bucket {
  if (
    value === 'need_action' ||
    value === 'cros_handling' ||
    value === 'waiting' ||
    value === 'completed'
  ) {
    return value;
  }
  return 'all';
}

function dueFromTiming(value: string | null): TaskDueFilter | null {
  if (
    value === 'overdue' ||
    value === 'today' ||
    value === '7' ||
    value === '14' ||
    value === '30'
  ) {
    return value;
  }
  return null;
}

export function V2TasksPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const propertyFilter = searchParams.get('property');
  const { user } = useAuth();
  const currentUserName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

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
  const copyVariant = useAgentCopyVariant();
  const bucketFilters = useMemo(() => taskListV2BucketFilters(copyVariant), [copyVariant]);

  const [bucket, setBucket] = useState<TaskListV2Bucket>(() => bucketFromStatus(searchParams.get('status')));
  const [category, setCategory] = useState<TaskListV2Category>(() => categoryFromFilter(urlFilter));
  const [search, setSearch] = useState('');
  const [subtype, setSubtype] = useState(() => searchParams.get('subtype') || 'all');
  const [moreFilters, setMoreFilters] = useState<TaskMoreFilters>(() => {
    const due = dueFromTiming(searchParams.get('timing'));
    return due ? { ...EMPTY_TASK_MORE_FILTERS, due } : EMPTY_TASK_MORE_FILTERS;
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [page, setPage] = useState(1);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const status = searchParams.get('status');
    const timing = dueFromTiming(searchParams.get('timing'));
    const subtypeParam = searchParams.get('subtype');
    const filter = searchParams.get('filter');
    if (status) setBucket(bucketFromStatus(status));
    if (filter) setCategory(categoryFromFilter(filter));
    if (subtypeParam) setSubtype(subtypeParam);
    if (timing) {
      setMoreFilters((current) => ({ ...current, due: timing, dueFrom: '', dueTo: '' }));
    }
  }, [searchParams]);

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
          agencies,
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

  const scoped = useMemo(
    () => filterTaskListV2Rows(allRows, bucket, category, search),
    [allRows, bucket, category, search],
  );

  const subtypeOptions = useMemo(() => {
    const labels = new Set(scoped.map((row) => taskSubtypeLabel(row)));
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [scoped]);

  const filterChips = useMemo(() => taskMoreFilterChips(moreFilters), [moreFilters]);

  const filtered = useMemo(
    () =>
      sortTasksByDueDate(
        scoped.filter((row) => {
          if (subtype !== 'all' && taskSubtypeLabel(row) !== subtype) return false;
          return taskMatchesMoreFilters(row, moreFilters, { agencies, currentUserName });
        }),
      ),
    [agencies, currentUserName, moreFilters, scoped, subtype],
  );

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [bucket, category, moreFilters, search, subtype]);

  useEffect(() => {
    if (subtype !== 'all' && !subtypeOptions.includes(subtype)) setSubtype('all');
  }, [subtype, subtypeOptions]);

  return (
    <div className="task-list-v2 v2-dashboard normal-case space-y-4 px-4 py-4 lg:px-6 lg:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
              {bucketCounts.all}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {TASK_LIST_COPY[copyVariant].pageSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AgentHowToUseLink module="tasks" className="rounded-full bg-transparent px-3 py-2" />
          <NewTaskActionsMenu propertyId={propertyFilter ?? undefined} />
        </div>
      </div>

      <div
        className={cn(
          'grid gap-3 sm:grid-cols-2',
          bucketFilters.length > 3 ? 'xl:grid-cols-4' : 'xl:grid-cols-3',
        )}
      >
        {bucketFilters.map((option) => {
          const Icon = BUCKET_ICON[option.id];
          const active = bucket === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-tour={`tasks-bucket-${option.id}`}
              onClick={() => setBucket((current) => (current === option.id ? 'all' : option.id))}
              className={cn(
                'v2-dashboard__card flex items-center gap-3 p-4 text-left transition',
                active && 'ring-primary/30 ring-2',
              )}
            >
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                  BUCKET_TONE[option.id],
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-muted-foreground block text-xs font-medium">{option.label}</span>
                <span className="block text-2xl font-semibold tabular-nums leading-tight">
                  {bucketCounts[option.id]}
                </span>
                <span className="text-muted-foreground block truncate text-xs">{option.sublabel}</span>
              </span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </button>
          );
        })}
      </div>

      <section className="v2-dashboard__card grid grid-cols-1 items-center gap-3 p-3 sm:p-4 lg:grid-cols-[7.75rem_minmax(0,1fr)_28rem] lg:gap-x-4 lg:gap-y-3">
        <FilterLabel index="1" label="Work Status" />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {bucketFilters.map((option) => {
            const Icon = BUCKET_ICON[option.id];
            const active = bucket === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setBucket((current) => (current === option.id ? 'all' : option.id))}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold',
                  active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted/50',
                )}
              >
                <Icon className="size-3.5" />
                {option.label}
                <span className="tabular-nums opacity-70">{bucketCounts[option.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full" data-tour="tasks-search">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks, addresses, or tenants..."
            className={cn(selectClass, 'w-full pl-9')}
          />
        </div>

        <FilterLabel index="2" label="Task Type" />
        <div className="flex min-w-0 flex-wrap items-center gap-2" data-tour="tasks-type-tabs">
          {categoryFilters.map((option) => {
            const Icon = CATEGORY_ICON[option.id];
            const active = category === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-tour={option.id === 'all' ? undefined : `tasks-category-${option.id}`}
                onClick={() => setCategory(option.id)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold',
                  active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted/50',
                )}
              >
                <Icon className="size-3.5" />
                {option.label}
                <span className="tabular-nums opacity-70">{categoryCounts[option.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex w-full justify-end">
          <button
            type="button"
            data-tour="tasks-filters"
            onClick={() => setFiltersOpen(true)}
            className={cn(
              'hover:text-foreground inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold',
              filterChips.length > 0 ? 'border-primary text-primary' : 'text-muted-foreground',
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            More Filters
            {filterChips.length > 0 ? (
              <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[11px] leading-none">
                {filterChips.length}
              </span>
            ) : null}
          </button>
        </div>

        <FilterLabel index="3" label="Subtype" className="lg:self-end lg:pb-[18px]" />
        <select
          className={cn(selectClass, 'w-full max-w-44 lg:self-end')}
          value={subtype}
          onChange={(event) => setSubtype(event.target.value)}
          aria-label="Subtype"
        >
          <option value="all">All subtypes</option>
          {subtypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:self-end">
          <FieldSelect
            label="Date / Timing"
            icon={CalendarDays}
            ariaLabel="Date / Timing"
            value={moreFilters.due}
            onChange={(due) =>
              setMoreFilters((current) => ({
                ...current,
                due: due as TaskDueFilter,
                dueFrom: due === 'custom' ? current.dueFrom : '',
                dueTo: due === 'custom' ? current.dueTo : '',
              }))
            }
            options={TIMING_OPTIONS.filter((option) => option.value !== 'custom' || moreFilters.due === 'custom')}
          />
          <FieldSelect
            label="Priority"
            icon={Flag}
            ariaLabel="Priority"
            value={moreFilters.priority}
            onChange={(priority) =>
              setMoreFilters((current) => ({ ...current, priority: priority as TaskListPriority }))
            }
            options={[
              { value: 'all', label: 'All priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' },
              { value: 'low', label: 'Low' },
            ]}
          />
          <FieldSelect
            label="Service Mode"
            icon={Briefcase}
            ariaLabel="Service Mode"
            value={moreFilters.service}
            onChange={(service) =>
              setMoreFilters((current) => ({ ...current, service: service as TaskServiceFilter }))
            }
            options={[
              { value: 'all', label: 'All services' },
              { value: 'full', label: 'Full Service' },
              { value: 'self', label: 'Self-Manage' },
              { value: 'inspection', label: 'Inspection Only' },
            ]}
          />
        </div>
      </section>

      <TaskMoreFiltersDrawer
        open={filtersOpen}
        applied={moreFilters}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setMoreFilters(next);
          setFiltersOpen(false);
        }}
      />

      {filterChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setMoreFilters((current) => clearTaskMoreFilter(current, chip.key))}
              className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            >
              {chip.label}
              <span aria-hidden>×</span>
              <span className="sr-only">Remove {chip.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMoreFilters(EMPTY_TASK_MORE_FILTERS)}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold"
          >
            Clear all
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold">{filtered.length} tasks</span>
          <span className="text-muted-foreground"> · Sorted by: Due date (soonest first)</span>
        </p>
        <div className="bg-muted/40 inline-flex rounded-full border p-0.5">
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
              view === 'list' && 'bg-background shadow-sm',
            )}
          >
            <List className="size-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
              view === 'calendar' && 'bg-background shadow-sm',
            )}
          >
            <CalendarDays className="size-3.5" />
            Calendar
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            search || category !== 'all' || bucket !== 'all' || subtype !== 'all' || filterChips.length > 0
              ? 'No matching tasks'
              : 'No tasks yet'
          }
          description={
            search || category !== 'all' || bucket !== 'all' || subtype !== 'all' || filterChips.length > 0
              ? 'Try a different search or filter.'
              : isInspectionOnlyAgent
                ? 'Active inspections and tribunal work will appear here.'
                : 'Active maintenance, inspections, leasing, and tribunal work will appear here.'
          }
        />
      ) : view === 'calendar' ? (
        <TaskCalendar
          rows={filtered}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
        />
      ) : (
        <div className="min-w-0 space-y-3" data-tour="tasks-table">
          <TaskListBoardTable rows={pageRows} agencies={agencies} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of{' '}
              {filtered.length}
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

function FilterLabel({ index, label, className }: { index: string; label: string; className?: string }) {
  return (
    <p className={cn('text-muted-foreground text-xs font-semibold', className)}>
      {index}. {label}
    </p>
  );
}

function FieldSelect({
  label,
  icon: Icon,
  ariaLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="text-muted-foreground flex min-w-0 flex-col gap-1 text-[12px] font-medium">
      {label}
      <span className="relative block">
        <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(selectClass, 'w-full pl-8')}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function TaskCalendar({
  rows,
  month,
  onMonthChange,
}: {
  rows: TaskListV2Row[];
  month: Date;
  onMonthChange: (next: Date) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const byDay = new Map<string, TaskListV2Row[]>();
  for (const row of rows) {
    const due = taskDueMeta(row);
    if (due.sort === Number.POSITIVE_INFINITY) continue;
    const date = new Date(due.sort);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex) continue;
    const key = String(date.getDate());
    byDay.set(key, [...(byDay.get(key) ?? []), row]);
  }

  const selectedRows = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  return (
    <div className="v2-dashboard__card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className="hover:bg-muted flex size-8 items-center justify-center rounded-full"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold">
          {month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className="hover:bg-muted flex size-8 items-center justify-center rounded-full"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-semibold">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-muted-foreground py-1">
            {day}
          </div>
        ))}
        {cells.map((day, index) => {
          const count = day ? byDay.get(String(day))?.length ?? 0 : 0;
          const active = day != null && selectedDay === String(day);
          return (
            <button
              key={`${day ?? 'empty'}-${index}`}
              type="button"
              disabled={day == null}
              onClick={() => day && setSelectedDay(String(day))}
              className={cn(
                'flex h-12 flex-col items-center justify-center rounded-xl text-xs',
                day == null && 'invisible',
                active && 'bg-primary text-primary-foreground',
                !active && count > 0 && 'bg-primary/10',
              )}
            >
              <span>{day}</span>
              {count > 0 ? <span className="text-[11px] font-semibold">{count}</span> : null}
            </button>
          );
        })}
      </div>
      {selectedDay ? (
        <ul className="space-y-2">
          {selectedRows.length === 0 ? (
            <li className="text-muted-foreground text-sm">No tasks due this day.</li>
          ) : (
            selectedRows.map((row) => (
              <li key={row.id} className="rounded-xl border px-3 py-2 text-sm">
                <p className="font-semibold">{row.task.title}</p>
                <p className="text-muted-foreground text-xs">
                  {row.property.address} · {row.statusLabel}
                </p>
              </li>
            ))
          )}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Select a day to see the tasks due then.</p>
      )}
    </div>
  );
}
