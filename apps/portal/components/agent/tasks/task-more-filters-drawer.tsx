'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import {
  EMPTY_TASK_MORE_FILTERS,
  type TaskAssigneeFilter,
  type TaskCreatedFilter,
  type TaskDueFilter,
  type TaskListPriority,
  type TaskMoreFilters,
  type TaskServiceFilter,
} from '@/lib/task-list-v2';
import { cn } from '@/lib/utils';

const ASSIGNEE_OPTIONS: { value: TaskAssigneeFilter; label: string }[] = [
  { value: 'all', label: 'All assignees' },
  { value: 'me', label: 'Me' },
  { value: 'cros', label: 'CROS Team' },
  { value: 'unassigned', label: 'Unassigned' },
];

const SERVICE_OPTIONS: { value: TaskServiceFilter; label: string }[] = [
  { value: 'all', label: 'All services' },
  { value: 'full', label: 'Full Service' },
  { value: 'self', label: 'Self-Manage' },
  { value: 'inspection', label: 'Inspection Only' },
];

const PRIORITY_OPTIONS: { value: TaskListPriority; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

const CREATED_OPTIONS: { value: TaskCreatedFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: 'custom', label: 'Custom' },
];

const DUE_OPTIONS: { value: TaskDueFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Next 7 days' },
  { value: '14', label: 'Next 14 days' },
  { value: '30', label: 'Next 30 days' },
  { value: 'custom', label: 'Custom range' },
];

export function TaskMoreFiltersDrawer({
  open,
  applied,
  onClose,
  onApply,
}: {
  open: boolean;
  applied: TaskMoreFilters;
  onClose: () => void;
  onApply: (next: TaskMoreFilters) => void;
}) {
  const [draft, setDraft] = useState(applied);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setDraft(applied);
  }, [applied, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-more-filters-title"
        className="bg-background absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 id="task-more-filters-title" className="text-base font-semibold">
              More Filters
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Work status, task type, and subtype stay on the page. These extras apply when you press Apply.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <FilterSection title="Assigned to">
            <ChoiceRow
              options={ASSIGNEE_OPTIONS}
              value={draft.assignee}
              onChange={(assignee) => setDraft((current) => ({ ...current, assignee }))}
            />
          </FilterSection>

          <FilterSection title="Service type">
            <ChoiceRow
              options={SERVICE_OPTIONS}
              value={draft.service}
              onChange={(service) => setDraft((current) => ({ ...current, service }))}
            />
          </FilterSection>

          <FilterSection title="Priority">
            <ChoiceRow
              options={PRIORITY_OPTIONS}
              value={draft.priority}
              onChange={(priority) => setDraft((current) => ({ ...current, priority }))}
            />
          </FilterSection>

          <FilterSection title="Created date">
            <ChoiceRow
              options={CREATED_OPTIONS}
              value={draft.created}
              onChange={(created) => setDraft((current) => ({ ...current, created }))}
            />
            {draft.created === 'custom' ? (
              <DateRange
                from={draft.createdFrom}
                to={draft.createdTo}
                onFrom={(createdFrom) => setDraft((current) => ({ ...current, createdFrom }))}
                onTo={(createdTo) => setDraft((current) => ({ ...current, createdTo }))}
              />
            ) : null}
          </FilterSection>

          <FilterSection title="Due date">
            <ChoiceRow
              options={DUE_OPTIONS}
              value={draft.due}
              onChange={(due) => setDraft((current) => ({ ...current, due }))}
            />
            {draft.due === 'custom' ? (
              <DateRange
                from={draft.dueFrom}
                to={draft.dueTo}
                onFrom={(dueFrom) => setDraft((current) => ({ ...current, dueFrom }))}
                onTo={(dueTo) => setDraft((current) => ({ ...current, dueTo }))}
              />
            ) : null}
          </FilterSection>

          <FilterSection title="Property">
            <input
              value={draft.property}
              onChange={(event) => setDraft((current) => ({ ...current, property: event.target.value }))}
              placeholder="Search property address..."
              className="border-input bg-background h-9 w-full rounded-xl border px-3 text-sm outline-none"
            />
          </FilterSection>

          <FilterSection title="Last updated">
            <ChoiceRow
              options={CREATED_OPTIONS}
              value={draft.updated}
              onChange={(updated) => setDraft((current) => ({ ...current, updated }))}
            />
            {draft.updated === 'custom' ? (
              <DateRange
                from={draft.updatedFrom}
                to={draft.updatedTo}
                onFrom={(updatedFrom) => setDraft((current) => ({ ...current, updatedFrom }))}
                onTo={(updatedTo) => setDraft((current) => ({ ...current, updatedTo }))}
              />
            ) : null}
          </FilterSection>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t px-5 py-4">
          <button
            type="button"
            onClick={() => setDraft(EMPTY_TASK_MORE_FILTERS)}
            className="text-muted-foreground hover:text-foreground text-sm font-semibold"
          >
            Reset all
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-2 text-sm font-semibold"
          >
            Apply Filters
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold',
              active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted/50',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DateRange({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">From</span>
        <input
          type="date"
          value={from}
          onChange={(event) => onFrom(event.target.value)}
          className="border-input bg-background h-9 w-full rounded-xl border px-2 text-sm"
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">To</span>
        <input
          type="date"
          value={to}
          onChange={(event) => onTo(event.target.value)}
          className="border-input bg-background h-9 w-full rounded-xl border px-2 text-sm"
        />
      </label>
    </div>
  );
}
