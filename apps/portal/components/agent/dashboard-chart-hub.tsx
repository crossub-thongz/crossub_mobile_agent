'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  Gavel,
  Wallet,
  Wrench,
} from 'lucide-react';

import type { DashboardKpis } from '@/lib/types';
import {
  isDashboardChartAllowedForAgent,
  type DashboardChartKey,
} from '@/lib/portal-service-level';
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
    <svg
      width={chartSize}
      height={chartSize}
      viewBox={`0 0 ${chartSize} ${chartSize}`}
      className="mx-auto shrink-0 sm:mx-0"
      aria-hidden
    >
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

function SegmentBarRow({
  label,
  value,
  color,
  total,
}: {
  label: string;
  value: number;
  color: string;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 truncate">
          <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="shrink-0 font-semibold tabular-nums">
          {value}
          {total > 0 ? (
            <span className="text-muted-foreground ml-1 text-[10px] font-normal">{pct}%</span>
          ) : null}
        </span>
      </div>
      <div className="bg-muted/50 h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
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
  const donutSegments = segments.filter((s) => s.value > 0);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <Link
      href={href}
      className={cn(
        'group flex h-full flex-row items-center gap-3 rounded-2xl border bg-card p-3 transition active:scale-[0.98] hover:border-primary/30 hover:shadow-sm lg:items-start lg:gap-4 lg:p-4',
        className,
      )}
    >
      <DonutChart
        segments={donutSegments.length ? donutSegments : segments}
        size={76}
        stroke={9}
        large
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Icon className="text-primary size-4 shrink-0" />
            <p className="truncate text-sm font-semibold lg:text-base">{title}</p>
          </div>
          <ChevronRight className="text-muted-foreground size-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        <p className="text-muted-foreground mb-1.5 text-[10px] tabular-nums lg:hidden">
          {total} total
        </p>
        <ul className="space-y-1">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-1 text-xs lg:text-sm">
              <span className="text-muted-foreground flex min-w-0 items-center gap-1 truncate">
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

function CompactKpiTile({
  title,
  icon: Icon,
  href,
  value,
  subtitle,
  tone = 'default',
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  value: number;
  subtitle: string;
  tone?: 'default' | 'warn' | 'calm';
}) {
  const toneClass =
    tone === 'warn'
      ? 'border-destructive/20 from-destructive/5 to-card'
      : tone === 'calm'
        ? 'border-primary/20 from-primary/5 to-card'
        : 'border-border from-card to-secondary/20';

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-2xl border bg-gradient-to-br p-3 transition active:scale-[0.98] hover:border-primary/25 hover:shadow-sm',
        toneClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl',
            tone === 'warn' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <ChevronRight className="text-muted-foreground size-4 shrink-0 opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="text-muted-foreground mt-2 text-[10px] font-semibold uppercase tracking-wide">
        {title}
      </p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-muted-foreground mt-1.5 line-clamp-2 text-[11px] leading-snug">{subtitle}</p>
    </Link>
  );
}

const CHART_COLORS = {
  primary: 'var(--chart-1)',
  blue: 'var(--chart-2)',
  amber: 'var(--chart-3)',
  red: 'var(--chart-4)',
  violet: 'var(--chart-5)',
  muted: 'color-mix(in oklab, var(--muted-foreground) 45%, var(--border))',
};

function inspectionCompletedTotal(k: DashboardKpis['inspection']): number {
  return (
    k.openCompleted +
    k.ingoingCompleted +
    k.outgoingCompleted +
    k.routineCompleted
  );
}

function inspectionPendingTotal(k: DashboardKpis['inspection']): number {
  return (
    k.openPending +
    k.ingoingPending +
    k.outgoingPending +
    k.routinePending
  );
}

function propertiesSegments(k: DashboardKpis): Segment[] {
  return [
    { label: 'Occupied', value: k.properties.occupied, color: CHART_COLORS.primary },
    { label: 'Vacant', value: k.properties.vacant, color: CHART_COLORS.amber },
  ];
}

function maintenanceSegments(k: DashboardKpis): Segment[] {
  return [
    { label: 'Approval', value: k.maintenance.pendingApproval, color: CHART_COLORS.red },
    { label: 'In progress', value: k.maintenance.inProgress, color: CHART_COLORS.blue },
    { label: 'Completed', value: k.maintenance.completed, color: CHART_COLORS.primary },
  ];
}

function inspectionSegments(k: DashboardKpis): Segment[] {
  return [
    { label: 'Open', value: k.inspection.openPending, color: CHART_COLORS.violet },
    { label: 'Ingoing', value: k.inspection.ingoingPending, color: CHART_COLORS.blue },
    { label: 'Outgoing', value: k.inspection.outgoingPending, color: CHART_COLORS.amber },
    { label: 'Routine', value: k.inspection.routinePending, color: CHART_COLORS.primary },
    {
      label: 'Completed',
      value: inspectionCompletedTotal(k.inspection),
      color: CHART_COLORS.muted,
    },
  ];
}

function tribunalSegments(k: DashboardKpis): Segment[] {
  return [
    { label: 'Active', value: k.tribunal.active, color: CHART_COLORS.red },
    { label: 'Action', value: k.tribunal.actionRequired, color: CHART_COLORS.amber },
    { label: 'Closed', value: k.tribunal.closed, color: CHART_COLORS.primary },
  ];
}

function leasingSegments(k: DashboardKpis): Segment[] {
  return [
    { label: 'New', value: k.leasing.newLeasing, color: CHART_COLORS.violet },
    { label: 'Rent review', value: k.leasing.upcomingRentReviews, color: CHART_COLORS.blue },
    { label: 'Renewals', value: k.leasing.leaseRenewals, color: CHART_COLORS.amber },
    { label: 'Completed', value: k.leasing.completed, color: CHART_COLORS.primary },
  ];
}

function accountingSegments(k: DashboardKpis): Segment[] {
  return [
    { label: 'In arrears', value: k.accounting.propertiesInArrears, color: CHART_COLORS.red },
    {
      label: 'Paid up',
      value: Math.max(k.properties.total - k.accounting.propertiesInArrears, 0),
      color: CHART_COLORS.primary,
    },
  ];
}

const CHART_DEFINITIONS = [
  {
    key: 'properties',
    title: 'Properties',
    icon: Building2,
    href: (k: DashboardKpis) => k.properties.href,
    segments: propertiesSegments,
  },
  {
    key: 'maintenance',
    title: 'Maintenance',
    icon: Wrench,
    href: (k: DashboardKpis) => k.maintenance.href,
    segments: maintenanceSegments,
  },
  {
    key: 'inspection',
    title: 'Inspections',
    icon: ClipboardList,
    href: (k: DashboardKpis) => k.inspection.href,
    segments: inspectionSegments,
  },
  {
    key: 'tribunal',
    title: 'Tribunal',
    icon: Gavel,
    href: (k: DashboardKpis) => k.tribunal.href,
    segments: tribunalSegments,
  },
  {
    key: 'leasing',
    title: 'Leasing',
    icon: FileText,
    href: (k: DashboardKpis) => k.leasing.href,
    segments: leasingSegments,
  },
  {
    key: 'accounting',
    title: 'Accounting',
    icon: Wallet,
    href: (k: DashboardKpis) => k.accounting.href,
    segments: accountingSegments,
  },
] as const;

type ChartDefinition = (typeof CHART_DEFINITIONS)[number];
type ChartKey = ChartDefinition['key'];

function filterChartDefinitions(hasFullManagementAccess: boolean) {
  return CHART_DEFINITIONS.filter((item) =>
    isDashboardChartAllowedForAgent(item.key as DashboardChartKey, hasFullManagementAccess),
  );
}

function BreakdownSlide({
  definition,
  k,
}: {
  definition: ChartDefinition;
  k: DashboardKpis;
}) {
  const Icon = definition.icon;
  const segments = definition.segments(k);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const donutSegments = segments.filter((segment) => segment.value > 0);

  return (
    <Link
      href={definition.href(k)}
      className="group block w-full shrink-0 snap-center snap-always space-y-4 p-4 active:bg-muted/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
              <Icon className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-base font-semibold">{definition.title}</p>
              <p className="text-muted-foreground text-xs tabular-nums">{total} total</p>
            </div>
          </div>
        </div>
        <ChevronRight className="text-muted-foreground size-5 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <div className="touch-pan-y flex justify-center py-1">
        <DonutChart
          segments={donutSegments.length ? donutSegments : segments}
          size={112}
          stroke={12}
        />
      </div>

      <div className="touch-pan-y space-y-3">
        {segments.map((segment) => (
          <SegmentBarRow
            key={segment.label}
            label={segment.label}
            value={segment.value}
            color={segment.color}
            total={total}
          />
        ))}
      </div>

      <div className="touch-pan-y text-primary flex items-center justify-center gap-1 rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-sm font-semibold">
        Open {definition.title}
        <ChevronRight className="size-4" />
      </div>
    </Link>
  );
}

function MobilePortfolioBreakdown({
  k,
  hasFullManagementAccess,
}: {
  k: DashboardKpis;
  hasFullManagementAccess: boolean;
}) {
  const charts = filterChartDefinitions(hasFullManagementAccess);
  const [activeKey, setActiveKey] = useState<ChartKey>(charts[0]?.key ?? CHART_DEFINITIONS[0].key);
  const carouselRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<ChartKey, HTMLButtonElement>());
  const scrollSyncRef = useRef(false);

  const activeIndex = Math.max(
    0,
    charts.findIndex((item) => item.key === activeKey),
  );

  const scrollChipIntoView = useCallback((key: ChartKey) => {
    chipRefs.current.get(key)?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, []);

  const scrollCarouselToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const el = carouselRef.current;
    if (!el) return;
    scrollSyncRef.current = true;
    el.scrollTo({ left: index * el.clientWidth, behavior });
    window.setTimeout(() => {
      scrollSyncRef.current = false;
    }, behavior === 'smooth' ? 350 : 0);
  }, []);

  const selectKey = useCallback(
    (key: ChartKey) => {
      const index = charts.findIndex((item) => item.key === key);
      if (index < 0) return;
      setActiveKey(key);
      scrollCarouselToIndex(index);
      scrollChipIntoView(key);
    },
    [charts, scrollCarouselToIndex, scrollChipIntoView],
  );

  const syncActiveFromCarousel = useCallback(() => {
    const el = carouselRef.current;
    if (!el || el.clientWidth <= 0) return;
    const index = Math.min(
      charts.length - 1,
      Math.max(0, Math.round(el.scrollLeft / el.clientWidth)),
    );
    const nextKey = charts[index]?.key;
    if (!nextKey) return;
    setActiveKey((current) => {
      if (current === nextKey) return current;
      scrollChipIntoView(nextKey);
      return nextKey;
    });
  }, [charts, scrollChipIntoView]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const onScrollEnd = () => {
      scrollSyncRef.current = false;
      syncActiveFromCarousel();
    };

    el.addEventListener('scrollend', onScrollEnd);
    return () => el.removeEventListener('scrollend', onScrollEnd);
  }, [syncActiveFromCarousel]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    let frame = 0;
    const onScroll = () => {
      if (scrollSyncRef.current) return;
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        syncActiveFromCarousel();
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
    };
  }, [syncActiveFromCarousel]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let lockedAxis: 'horizontal' | 'vertical' | null = null;

    const resetOverflow = () => {
      lockedAxis = null;
      el.style.overflowX = '';
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      lockedAxis = null;
      el.style.overflowX = '';
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;

      if (lockedAxis === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }

      if (lockedAxis === 'vertical') {
        // Release horizontal scroll capture so the page can scroll vertically.
        el.style.overflowX = 'hidden';
      } else {
        el.style.overflowX = '';
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', resetOverflow, { passive: true });
    el.addEventListener('touchcancel', resetOverflow, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', resetOverflow);
      el.removeEventListener('touchcancel', resetOverflow);
      el.style.overflowX = '';
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:hidden">
      <div className="border-b bg-muted/20 px-3 py-2.5">
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
          Breakdown
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">Swipe categories or tap to compare</p>
      </div>

      <div className="relative border-b">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-card to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-card to-transparent"
          aria-hidden
        />
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 py-2.5">
          {charts.map((item) => {
            const TabIcon = item.icon;
            const isActive = item.key === activeKey;
            const itemTotal = item.segments(k).reduce((sum, segment) => sum + segment.value, 0);

            return (
              <button
                key={item.key}
                ref={(node) => {
                  if (node) chipRefs.current.set(item.key, node);
                  else chipRefs.current.delete(item.key);
                }}
                type="button"
                onClick={() => selectKey(item.key)}
                aria-pressed={isActive}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-muted-foreground',
                )}
              >
                <TabIcon className="size-3.5" aria-hidden />
                {item.title}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    isActive ? 'bg-primary-foreground/20' : 'bg-muted',
                  )}
                >
                  {itemTotal}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={carouselRef}
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        aria-label="Portfolio breakdown categories"
      >
        {charts.map((definition) => (
          <div key={definition.key} className="w-full min-w-full shrink-0 snap-center snap-always">
            <BreakdownSlide definition={definition} k={k} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 border-t px-4 py-2.5">
        {charts.map((item, index) => (
          <button
            key={item.key}
            type="button"
            aria-label={`Show ${item.title}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => selectKey(item.key)}
            className={cn(
              'rounded-full transition-all',
              index === activeIndex
                ? 'bg-primary size-2'
                : 'bg-muted-foreground/30 size-1.5 hover:bg-muted-foreground/50',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function mobileKpiTiles(k: DashboardKpis, hasFullManagementAccess: boolean) {
  const maintenanceActive = k.maintenance.pendingApproval + k.maintenance.inProgress;
  const inspectionPending = inspectionPendingTotal(k.inspection);
  const leasingOpen = k.leasing.newLeasing + k.leasing.upcomingRentReviews + k.leasing.leaseRenewals;
  const tribunalOpen = k.tribunal.active + k.tribunal.actionRequired;

  const tiles = [
    {
      title: 'Properties',
      icon: Building2,
      href: k.properties.href,
      value: k.properties.total,
      subtitle: `${k.properties.occupied} occupied · ${k.properties.vacant} vacant`,
      tone: 'calm' as const,
    },
    {
      title: 'Maintenance',
      icon: Wrench,
      href: k.maintenance.href,
      value: maintenanceActive,
      subtitle:
        k.maintenance.pendingApproval > 0
          ? `${k.maintenance.pendingApproval} awaiting approval`
          : `${k.maintenance.inProgress} in progress`,
      tone: k.maintenance.pendingApproval > 0 ? ('warn' as const) : ('default' as const),
    },
    {
      title: 'Inspections',
      icon: ClipboardList,
      href: k.inspection.href,
      value: inspectionPending,
      subtitle: `${inspectionCompletedTotal(k.inspection)} completed`,
      tone: 'default' as const,
    },
    {
      title: 'Leasing',
      icon: FileText,
      href: k.leasing.href,
      value: leasingOpen,
      subtitle: `${k.leasing.newLeasing} new · ${k.leasing.upcomingRentReviews} rent reviews`,
      tone: 'default' as const,
    },
    {
      title: 'Arrears',
      icon: Wallet,
      href: k.accounting.arrearsHref,
      value: k.accounting.propertiesInArrears,
      subtitle:
        k.accounting.propertiesInArrears > 0
          ? `${k.accounting.propertiesInArrears} propert${k.accounting.propertiesInArrears === 1 ? 'y' : 'ies'} behind`
          : 'All properties paid up',
      tone: k.accounting.propertiesInArrears > 0 ? ('warn' as const) : ('calm' as const),
    },
    {
      title: 'Tribunal',
      icon: Gavel,
      href: k.tribunal.href,
      value: tribunalOpen,
      subtitle: `${k.tribunal.closed} closed`,
      tone: tribunalOpen > 0 ? ('warn' as const) : ('default' as const),
    },
  ];

  return tiles.filter((tile) => {
    const keyMap: Record<string, DashboardChartKey> = {
      Properties: 'properties',
      Maintenance: 'maintenance',
      Inspections: 'inspection',
      Tribunal: 'tribunal',
      Leasing: 'leasing',
      Arrears: 'accounting',
    };
    const key = keyMap[tile.title];
    if (!key) return true;
    return isDashboardChartAllowedForAgent(key, hasFullManagementAccess);
  });
}

export type DashboardKpiWidgetKey =
  | 'kpi_properties'
  | 'kpi_maintenance'
  | 'kpi_inspections'
  | 'kpi_tribunal'
  | 'kpi_leasing'
  | 'kpi_accounting';

const WIDGET_TO_KEY: Record<DashboardKpiWidgetKey, (typeof CHART_DEFINITIONS)[number]['key']> = {
  kpi_properties: 'properties',
  kpi_maintenance: 'maintenance',
  kpi_inspections: 'inspection',
  kpi_tribunal: 'tribunal',
  kpi_leasing: 'leasing',
  kpi_accounting: 'accounting',
};

export function DashboardKpiWidget({
  widgetId,
  k,
  className,
  hasFullManagementAccess = true,
}: {
  widgetId: DashboardKpiWidgetKey;
  k: DashboardKpis;
  className?: string;
  hasFullManagementAccess?: boolean;
}) {
  const definition = CHART_DEFINITIONS.find((item) => item.key === WIDGET_TO_KEY[widgetId]);
  if (!definition) return null;
  if (
    !isDashboardChartAllowedForAgent(
      definition.key as DashboardChartKey,
      hasFullManagementAccess,
    )
  ) {
    return null;
  }

  return (
    <ChartCard
      title={definition.title}
      icon={definition.icon}
      href={definition.href(k)}
      className={className}
      segments={definition.segments(k)}
    />
  );
}

export function DashboardChartHub({
  k,
  hasFullManagementAccess = true,
}: {
  k: DashboardKpis;
  hasFullManagementAccess?: boolean;
}) {
  const charts = filterChartDefinitions(hasFullManagementAccess);
  const tiles = mobileKpiTiles(k, hasFullManagementAccess);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold lg:text-lg">Portfolio overview</h2>
        <p className="text-muted-foreground mt-0.5 text-xs lg:text-sm">
          Tap a category to open the full list
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:hidden">
        {tiles.map((tile) => (
          <CompactKpiTile key={tile.title} {...tile} />
        ))}
      </div>

      <MobilePortfolioBreakdown k={k} hasFullManagementAccess={hasFullManagementAccess} />

      <div className="hidden grid-cols-2 gap-2 md:grid lg:gap-3">
        {charts.map((definition) => (
          <ChartCard
            key={definition.key}
            title={definition.title}
            icon={definition.icon}
            href={definition.href(k)}
            segments={definition.segments(k)}
          />
        ))}
      </div>
    </section>
  );
}
