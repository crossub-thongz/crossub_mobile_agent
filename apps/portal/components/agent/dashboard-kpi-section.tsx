'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  Wallet,
  Wrench,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type DashboardAccent = 'primary' | 'violet' | 'amber' | 'teal' | 'emerald';

const ACCENT_STYLES: Record<
  DashboardAccent,
  { card: string; icon: string; header: string; tileHighlight: string }
> = {
  primary: {
    card: 'from-primary/8 via-card to-card',
    icon: 'bg-primary/15 text-primary',
    header: 'hover:bg-primary/5',
    tileHighlight: 'border-primary/35 bg-primary/8 text-primary',
  },
  violet: {
    card: 'from-violet-500/8 via-card to-card',
    icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    header: 'hover:bg-violet-500/5',
    tileHighlight: 'border-violet-500/35 bg-violet-500/8 text-violet-600 dark:text-violet-400',
  },
  amber: {
    card: 'from-amber-500/8 via-card to-card',
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    header: 'hover:bg-amber-500/5',
    tileHighlight: 'border-amber-500/35 bg-amber-500/8 text-amber-600 dark:text-amber-400',
  },
  teal: {
    card: 'from-teal-500/8 via-card to-card',
    icon: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    header: 'hover:bg-teal-500/5',
    tileHighlight: 'border-teal-500/35 bg-teal-500/8 text-teal-600 dark:text-teal-400',
  },
  emerald: {
    card: 'from-emerald-500/8 via-card to-card',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    header: 'hover:bg-emerald-500/5',
    tileHighlight: 'border-emerald-500/35 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400',
  },
};

export type DashboardStat = {
  label: string;
  value: string | number;
  href: string;
  highlight?: boolean;
};

export function DashboardHubSection({
  title,
  icon: Icon,
  href,
  accent = 'primary',
  stats,
  description,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  accent?: DashboardAccent;
  stats: DashboardStat[];
  description?: string;
}) {
  const styles = ACCENT_STYLES[accent];
  const cols = stats.length >= 3 ? 3 : stats.length === 2 ? 2 : 1;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br shadow-sm',
        styles.card,
      )}
    >
      <Link
        href={href}
        className={cn(
          'group flex items-center gap-3 border-b border-border/60 px-4 py-3.5 transition-colors active:scale-[0.995]',
          styles.header,
        )}
      >
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
            styles.icon,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
          )}
        </div>
        <span className="text-muted-foreground flex shrink-0 items-center gap-0.5 text-xs font-medium group-hover:text-foreground">
          View all
          <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </Link>

      <div
        className={cn(
          'grid gap-px bg-border/40 p-px',
          cols === 3 && 'grid-cols-3',
          cols === 2 && 'grid-cols-2',
          cols === 1 && 'grid-cols-1',
        )}
      >
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              'group/stat flex min-h-[72px] flex-col justify-center bg-card/90 px-3 py-3 transition-colors active:scale-[0.98]',
              'hover:bg-card',
              stat.highlight && styles.tileHighlight,
            )}
          >
            <p className="text-muted-foreground text-[10px] font-medium leading-tight">
              {stat.label}
            </p>
            <p
              className={cn(
                'mt-1 text-xl font-bold tabular-nums tracking-tight',
                stat.highlight && 'text-inherit',
              )}
            >
              {stat.value}
            </p>
            <ChevronRight className="text-muted-foreground mt-1 size-3 opacity-0 transition group-hover/stat:opacity-60" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/** @deprecated Use DashboardHubSection */
export function KpiTile({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string | number;
  href: string;
  highlight?: boolean;
  sublabel?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-[76px] flex-col justify-between rounded-xl border p-3 transition-all active:scale-[0.98]',
        highlight
          ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
          : 'border-border/80 bg-secondary/30 hover:border-primary/25 hover:bg-card',
      )}
    >
      <p className="text-muted-foreground text-[10px] leading-tight font-medium">{label}</p>
      <p className={cn('text-xl font-bold tabular-nums', highlight && 'text-primary')}>{value}</p>
    </Link>
  );
}

/** @deprecated Use DashboardHubSection */
export function DashboardSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  columns?: 2 | 3;
  description?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex items-start gap-3 border-b border-border/80 px-4 py-3.5">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        )}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">{children}</div>
    </section>
  );
}

export function InspectionKpiGroup({
  href,
  openPending,
  openCompleted,
  ingoingPending,
  ingoingCompleted,
  outgoingPending,
  outgoingCompleted,
  routinePending,
  routineCompleted,
  openHref,
  ingoingHref,
  outgoingHref,
  routineHref,
}: {
  href: string;
  openPending: number;
  openCompleted: number;
  ingoingPending: number;
  ingoingCompleted: number;
  outgoingPending: number;
  outgoingCompleted: number;
  routinePending: number;
  routineCompleted: number;
  openHref: string;
  ingoingHref: string;
  outgoingHref: string;
  routineHref: string;
}) {
  const styles = ACCENT_STYLES.teal;
  const groups = [
    {
      label: 'Open',
      sub: 'Viewings',
      href: openHref,
      pending: openPending,
      completed: openCompleted,
    },
    {
      label: 'Ingoing / Outgoing',
      sub: 'Entry & exit',
      href: ingoingHref,
      pending: ingoingPending + outgoingPending,
      completed: ingoingCompleted + outgoingCompleted,
    },
    {
      label: 'Routine',
      sub: 'Scheduled',
      href: routineHref,
      pending: routinePending,
      completed: routineCompleted,
    },
  ];

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br shadow-sm',
        styles.card,
      )}
    >
      <Link
        href={href}
        className={cn(
          'group flex items-center gap-3 border-b border-border/60 px-4 py-3.5 transition-colors',
          styles.header,
        )}
      >
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
            styles.icon,
          )}
        >
          <ClipboardList className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">Inspection</p>
          <p className="text-muted-foreground mt-0.5 text-xs">Open, ingoing/outgoing & routine</p>
        </div>
        <span className="text-muted-foreground flex shrink-0 items-center gap-0.5 text-xs font-medium group-hover:text-foreground">
          View all
          <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </Link>

      <div className="space-y-px bg-border/40 p-px">
        {groups.map((g) => (
          <Link
            key={g.label}
            href={g.href}
            className="group/row flex items-center gap-3 bg-card/90 px-4 py-3 transition-colors hover:bg-card active:scale-[0.995]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{g.label}</p>
              <p className="text-muted-foreground text-[10px]">{g.sub}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <div className="min-w-[52px] rounded-lg bg-secondary/60 px-2 py-1.5 text-center">
                <p className="text-muted-foreground text-[9px]">Pending</p>
                <p className="text-base font-bold tabular-nums">{g.pending}</p>
              </div>
              <div className="min-w-[52px] rounded-lg bg-secondary/60 px-2 py-1.5 text-center">
                <p className="text-muted-foreground text-[9px]">Done</p>
                <p className="text-base font-bold tabular-nums">{g.completed}</p>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground size-4 shrink-0 group-hover/row:text-teal-600 dark:group-hover/row:text-teal-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export const DASHBOARD_ICONS = {
  properties: Building2,
  leasing: FileText,
  maintenance: Wrench,
  inspection: ClipboardList,
  accounting: Wallet,
};
