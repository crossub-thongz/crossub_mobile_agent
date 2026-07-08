'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileText,
  Gavel,
  Wallet,
  Wrench,
} from 'lucide-react';

import type { DashboardKpis } from '@/lib/types';
import { cn } from '@/lib/utils';

type Segment = { label: string; value: number; color: string; href?: string };

function DonutChart({
  segments,
  size = 72,
  stroke = 9,
  large = false,
}: {
  segments: Segment[];
  size?: number;
  stroke?: number;
  large?: boolean;
}) {
  const chartSize = large ? 96 : size;
  const chartStroke = large ? 11 : stroke;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (chartSize - chartStroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`} className="shrink-0">
      <circle
        cx={chartSize / 2}
        cy={chartSize / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={chartStroke}
      />
      {total > 0
        ? segments.map((seg) => {
            if (seg.value <= 0) return null;
            const dash = (seg.value / total) * c;
            const el = (
              <circle
                key={seg.label}
                cx={chartSize / 2}
                cy={chartSize / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={chartStroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${chartSize / 2} ${chartSize / 2})`}
              />
            );
            offset += dash;
            return el;
          })
        : null}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className={cn('fill-foreground font-bold', large ? 'text-sm' : 'text-[11px]')}
      >
        {total}
      </text>
    </svg>
  );
}

function ChartCard({
  title,
  icon: Icon,
  href,
  segments,
  className,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  segments: Segment[];
  className?: string;
}) {
  const active = segments.filter((s) => s.value > 0);

  return (
    <Link
      href={href}
      className={cn(
        'flex gap-3 rounded-2xl border bg-card p-3 transition active:scale-[0.98] hover:border-primary/30 hover:shadow-sm lg:gap-4 lg:p-4',
        className,
      )}
    >
      <DonutChart segments={active} large />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Icon className="text-primary size-4 shrink-0" />
          <p className="truncate text-sm font-semibold lg:text-base">{title}</p>
        </div>
        <ul className="space-y-1">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-1 text-xs lg:text-sm">
              <span className="text-muted-foreground flex items-center gap-1 truncate">
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}

const CHART_COLORS = {
  primary: 'var(--chart-1)',
  blue: 'var(--chart-2)',
  amber: 'var(--chart-3)',
  red: 'var(--chart-4)',
  violet: 'var(--chart-5)',
};

export function DashboardChartHub({ k }: { k: DashboardKpis }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold lg:text-lg">Portfolio overview</h2>
      <div className="grid grid-cols-2 gap-2 lg:gap-3">
        <ChartCard
          title="Properties"
          icon={Building2}
          href={k.properties.href}
          segments={[
            { label: 'Occupied', value: k.properties.occupied, color: CHART_COLORS.primary },
            { label: 'Vacant', value: k.properties.vacant, color: CHART_COLORS.amber },
          ]}
        />
        <ChartCard
          title="Maintenance"
          icon={Wrench}
          href={k.maintenance.href}
          segments={[
            {
              label: 'Approval',
              value: k.maintenance.pendingApproval,
              color: CHART_COLORS.red,
            },
            {
              label: 'In progress',
              value: k.maintenance.inProgress,
              color: CHART_COLORS.blue,
            },
            {
              label: 'Done',
              value: k.maintenance.completed,
              color: CHART_COLORS.primary,
            },
          ]}
        />
        <ChartCard
          title="Inspections"
          icon={ClipboardList}
          href={k.inspection.href}
          segments={[
            { label: 'Open', value: k.inspection.openPending, color: CHART_COLORS.violet },
            { label: 'Ingoing', value: k.inspection.ingoingPending, color: CHART_COLORS.blue },
            { label: 'Outgoing', value: k.inspection.outgoingPending, color: CHART_COLORS.amber },
            { label: 'Routine', value: k.inspection.routinePending, color: CHART_COLORS.primary },
          ]}
        />
        <ChartCard
          title="Tribunal"
          icon={Gavel}
          href={k.tribunal.href}
          segments={[
            { label: 'Active', value: k.tribunal.active, color: CHART_COLORS.red },
            {
              label: 'Action',
              value: k.tribunal.actionRequired,
              color: CHART_COLORS.amber,
            },
            { label: 'Closed', value: k.tribunal.closed, color: CHART_COLORS.primary },
          ]}
        />
        <ChartCard
          title="Leasing"
          icon={FileText}
          href={k.leasing.href}
          segments={[
            { label: 'New', value: k.leasing.newLeasing, color: CHART_COLORS.violet },
            { label: 'Rent review', value: k.leasing.upcomingRentReviews, color: CHART_COLORS.blue },
            { label: 'Renewals', value: k.leasing.leaseRenewals, color: CHART_COLORS.primary },
          ]}
        />
        <ChartCard
          title="Accounting"
          icon={Wallet}
          href={k.accounting.href}
          segments={[
            {
              label: 'In arrears',
              value: k.accounting.propertiesInArrears,
              color: CHART_COLORS.red,
            },
            {
              label: 'Paid up',
              value: Math.max(k.properties.total - k.accounting.propertiesInArrears, 0),
              color: CHART_COLORS.primary,
            },
          ]}
        />
      </div>
    </section>
  );
}
