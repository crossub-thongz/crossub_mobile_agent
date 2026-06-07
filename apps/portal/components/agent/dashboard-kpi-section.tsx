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

export function KpiTile({
  label,
  value,
  href,
  highlight,
  sublabel,
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
      <div className="mt-1 flex items-end justify-between gap-1">
        <p
          className={cn(
            'text-xl font-bold tabular-nums tracking-tight',
            highlight && 'text-primary',
          )}
        >
          {value}
        </p>
        <ChevronRight className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100 group-hover:text-primary" />
      </div>
      {sublabel && (
        <p className="text-muted-foreground mt-1 text-[9px]">{sublabel}</p>
      )}
    </Link>
  );
}

export function DashboardSection({
  title,
  icon: Icon,
  children,
  columns = 2,
  description,
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
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div
        className={cn(
          'grid gap-2 p-3',
          columns === 3 ? 'grid-cols-3' : 'grid-cols-2',
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function InspectionKpiGroup({
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
  const groups = [
    {
      label: 'Open',
      href: openHref,
      pending: openPending,
      completed: openCompleted,
    },
    {
      label: 'Ingoing / Outgoing',
      href: ingoingHref,
      pending: ingoingPending + outgoingPending,
      completed: ingoingCompleted + outgoingCompleted,
    },
    {
      label: 'Routine',
      href: routineHref,
      pending: routinePending,
      completed: routineCompleted,
    },
  ];

  return (
    <DashboardSection
      title="Inspection"
      icon={ClipboardList}
      description="Open, ingoing/outgoing, and routine counts"
      columns={3}
    >
      {groups.map((g) => (
        <Link
          key={g.label}
          href={g.href}
          className="group col-span-3 grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-secondary/20 p-2 sm:col-span-3"
        >
          <div className="col-span-3 flex items-center justify-between px-1">
            <span className="text-xs font-semibold">{g.label}</span>
            <ChevronRight className="text-muted-foreground size-3.5 group-hover:text-primary" />
          </div>
          <div className="rounded-lg bg-card/80 px-2 py-2 text-center">
            <p className="text-muted-foreground text-[9px]">Pending</p>
            <p className="text-base font-bold tabular-nums">{g.pending}</p>
          </div>
          <div className="rounded-lg bg-card/80 px-2 py-2 text-center">
            <p className="text-muted-foreground text-[9px]">Done</p>
            <p className="text-base font-bold tabular-nums">{g.completed}</p>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-primary/5 px-2 py-2">
            <p className="text-primary text-[10px] font-medium">View →</p>
          </div>
        </Link>
      ))}
    </DashboardSection>
  );
}

export const DASHBOARD_ICONS = {
  properties: Building2,
  leasing: FileText,
  maintenance: Wrench,
  inspection: ClipboardList,
  accounting: Wallet,
};
