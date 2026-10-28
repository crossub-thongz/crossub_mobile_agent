'use client';

import { format } from 'date-fns';

import { useAuth } from '@/components/providers/auth-provider';
import type { ModuleLaneDefinition, ModuleLaneTone } from '@/constants/module-workspace';
import { toValidDate } from '@/lib/format-datetime';
import { daysSinceDate, displayName, cn } from '@/lib/utils';

/** Status pill on the self-managed task lists — same shape as the admin worklist. */
const STATUS_PILL_CLASS: Record<ModuleLaneTone, string> = {
  attention: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  waiting: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  done: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  muted: 'bg-muted text-muted-foreground',
};

const CHIP_CLASS = 'rounded-md border px-2 py-0.5 text-xs font-medium';

export function taskListDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = toValidDate(iso);
  if (!date) return null;
  return format(date, 'dd/MM/yyyy');
}

/** Whole local days from today to `iso`. Negative when the date has passed. */
export function daysUntil(iso: string | null | undefined): number | null {
  const date = iso ? toValidDate(iso) : null;
  if (!date) return null;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((start - todayStart) / 86_400_000);
}

export function sinceLabel(iso: string | null | undefined): string | null {
  const days = daysSinceDate(iso);
  if (days == null) return null;
  if (days === 0) return 'Since today';
  if (days === 1) return 'Since yesterday';
  if (days < 14) return `Since ${days} days ago`;
  if (days < 60) {
    const weeks = Math.max(1, Math.round(days / 7));
    return weeks === 1 ? 'Since about a week ago' : `Since about ${weeks} weeks ago`;
  }
  const months = Math.max(1, Math.round(days / 30));
  return months === 1 ? 'Since about a month ago' : `Since about ${months} months ago`;
}

function titleCase(label: string): string {
  return label.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function TaskStatusPill({ lane }: { lane: ModuleLaneDefinition<string> }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_PILL_CLASS[lane.tone],
      )}
    >
      {titleCase(lane.label)}
    </span>
  );
}

export function TaskIdCell({ reference, loggedAt }: { reference: string; loggedAt?: string | null }) {
  const logged = taskListDate(loggedAt);
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium whitespace-nowrap tabular-nums">{reference}</p>
      {logged ? <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{logged}</p> : null}
    </div>
  );
}

export function TaskChip({
  children,
  tone = 'neutral',
}: {
  children: string;
  tone?: 'neutral' | 'positive' | 'urgent';
}) {
  return (
    <span
      className={cn(
        CHIP_CLASS,
        tone === 'positive' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
        tone === 'urgent' && 'border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        tone === 'neutral' && 'border-border bg-muted/40 text-foreground',
      )}
    >
      {children}
    </span>
  );
}

export function AddressIssueCell({
  address,
  issue,
  chips,
}: {
  address: string;
  issue?: string | null;
  chips?: { label: string; tone?: 'neutral' | 'positive' | 'urgent' }[];
}) {
  return (
    <div className="min-w-0 max-w-[22rem]">
      <p className="truncate font-medium" title={address}>
        {address}
      </p>
      {issue ? <p className="text-muted-foreground mt-0.5 truncate text-xs">{issue}</p> : null}
      {chips && chips.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <TaskChip key={chip.label} tone={chip.tone}>
              {chip.label}
            </TaskChip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NextActionCell({ action, since }: { action: string; since?: string | null }) {
  return (
    <div className="min-w-0 max-w-[16rem]">
      <p className="truncate text-[13px]" title={action}>
        {action}
      </p>
      {since ? <p className="text-muted-foreground mt-0.5 text-xs">{since}</p> : null}
    </div>
  );
}

export function TaskPersonCell({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[1]?.[0] ?? '') : '')).toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
        {initials || '—'}
      </span>
      <span className="truncate text-[13px]">{name}</span>
    </div>
  );
}

/** The signed-in self-managed agent. Every row on these lists is theirs. */
export function SelfManagedAgentCell() {
  const { user } = useAuth();
  const name = user ? displayName(user) : 'You';
  return <TaskPersonCell name={name} />;
}

export function DueCell({
  iso,
  settled = false,
}: {
  iso?: string | null;
  /** A finished job has no clock. */
  settled?: boolean;
}) {
  if (settled || !iso) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const date = taskListDate(iso);
  if (!date) return <span className="text-muted-foreground text-xs">—</span>;
  const remaining = daysUntil(iso);
  const overdue = remaining != null && remaining < 0;
  return (
    <div className="tabular-nums">
      <p className="text-[13px]">{date}</p>
      {overdue ? (
        <p className="mt-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          Overdue by {-remaining} {remaining === -1 ? 'day' : 'days'}
        </p>
      ) : null}
    </div>
  );
}

export function OutlineBadge({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap', className)}>
      {children}
    </span>
  );
}
