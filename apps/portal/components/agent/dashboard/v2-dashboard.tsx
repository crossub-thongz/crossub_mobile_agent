'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Home,
  Mic,
  Scale,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react';

import {
  crosNoteForAttentionItem,
  attentionItemSubtext,
  DashboardAttentionCard,
} from '@/components/agent/dashboard/dashboard-attention-card';
import { InspectionOnlyPlanBanner } from '@/components/agent/inspection-only-plan-banner';
import { PortfolioHealthDetailDialog } from '@/components/agent/dashboard/portfolio-health-detail-dialog';
import { CrosAssistantLogo } from '@/components/brand/cros-assistant-logo';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  ROUTES,
} from '@/constants/routes';
import {
  activityWhen,
  buildPortfolioHealthBreakdown,
  buildRecentActivity,
  crosHandlingTotals,
  formatDashboardMoney,
  greetingForNow,
  type PortfolioHealthBucketKey,
  underOfferCount,
  PORTFOLIO_HEALTH_BUCKET_LABEL,
} from '@/lib/dashboard-home';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { formatTitleCase } from '@/lib/display-text';
import { cn } from '@/lib/utils';

import './v2-dashboard.css';

const ATTENTION_LIMIT = 3;
const ACTIVITY_ICON: Record<
  string,
  { icon: LucideIcon; tone: string }
> = {
  Inspection: { icon: CheckCircle2, tone: 'bg-emerald-500/10 text-emerald-700' },
  Leasing: { icon: UserRound, tone: 'bg-primary/10 text-primary' },
  Maintenance: { icon: Wrench, tone: 'bg-primary/10 text-primary' },
  Tribunal: { icon: Scale, tone: 'bg-sky-500/10 text-sky-700' },
};

const ACTIVITY_TONE: Record<string, string> = {
  Inspection: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  Leasing: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  Maintenance: 'border-primary/30 bg-primary/10 text-primary',
  Tribunal: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300',
};

function SectionHead({
  title,
  count,
  countTone = 'primary',
  href,
  linkLabel = 'View All',
}: {
  title: string;
  count?: number;
  countTone?: 'primary' | 'danger';
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="v2-dashboard__section-title truncate text-sm font-semibold tracking-tight">{title}</h2>
        {count != null && count > 0 ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              countTone === 'danger' ? 'bg-rose-500 text-white' : 'bg-primary/15 text-primary',
            )}
          >
            {count}
          </span>
        ) : null}
      </div>
      <Link href={href} className="text-primary flex shrink-0 items-center gap-0.5 text-xs font-medium hover:underline">
        {linkLabel}
        <ChevronRight className="size-3" aria-hidden />
        <span className="sr-only"> {title}</span>
      </Link>
    </div>
  );
}

export function V2Dashboard() {
  const { user } = useAuth();
  const {
    properties,
    dashboardKpis: k,
    needActionItems,
    hasFullManagementAccess,
    inspections,
    rentReviews,
    tenantSelections,
    maintenanceAll,
    tribunalCases,
  } = useAgentData();
  const openGii = useShellDockStore((s) => s.openGii);
  const expandGii = useShellDockStore((s) => s.expandGii);
  const activePanel = useShellDockStore((s) => s.activePanel);
  const giiExpanded = useShellDockStore((s) => s.giiExpanded);

  const [healthBucket, setHealthBucket] = useState<PortfolioHealthBucketKey | null>(null);
  const [ask, setAsk] = useState('');

  const firstName = user?.firstName?.trim() || 'there';
  const greeting = greetingForNow();

  const health = useMemo(
    () =>
      buildPortfolioHealthBreakdown({
        properties,
        needActionItems,
        maintenance: maintenanceAll,
        inspections,
        rentReviews,
        tenantSelections,
      }),
    [properties, needActionItems, maintenanceAll, inspections, rentReviews, tenantSelections],
  );

  const offerCount = useMemo(
    () => (hasFullManagementAccess ? underOfferCount(tenantSelections) : 0),
    [hasFullManagementAccess, tenantSelections],
  );

  const attentionSubtextCtx = useMemo(
    () => ({
      maintenanceAll,
      rentReviews,
      tribunalCases,
      properties,
      formatMoney: formatDashboardMoney,
    }),
    [maintenanceAll, rentReviews, tribunalCases, properties],
  );

  const attention = useMemo(() => needActionItems.slice(0, ATTENTION_LIMIT), [needActionItems]);

  const activity = useMemo(
    () =>
      buildRecentActivity({
        inspections,
        maintenance: maintenanceAll,
        rentReviews,
        inspectionHref: (id) => inspectionDetail(id),
        maintenanceHref: (id) => maintenanceDetail(id),
        rentReviewHref: (id) => rentReviewDetail(id),
        take: 6,
      }),
    [inspections, maintenanceAll, rentReviews],
  );

  const cros = crosHandlingTotals(k);
  const healthTotal = Math.max(
    1,
    health.healthy + health.crosHandling + health.needAction + health.issues,
  );

  const submitAsk = (event: FormEvent) => {
    event.preventDefault();
    const prompt = ask.trim();
    openGii(prompt ? { initialPrompt: prompt } : undefined);
    setAsk('');
  };

  const focusAskBar = () => {
    if (activePanel === 'gii' && !giiExpanded) {
      expandGii();
      return;
    }
    if (activePanel !== 'gii') {
      openGii();
    }
  };

  const showMobileAskBar = !(activePanel === 'gii' && giiExpanded);

  return (
    <div className="v2-dashboard normal-case space-y-4 pb-8 lg:space-y-6 lg:pb-0">
      <InspectionOnlyPlanBanner />

      <header className="pt-2 lg:pt-6">
        <h1 className="v2-dashboard__greeting text-xl font-semibold tracking-tight sm:text-2xl">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here&apos;s what&apos;s happening with your portfolio today.
        </p>
      </header>

      {/* Mobile — portfolio overview */}
      <article className="v2-dashboard__card p-4 lg:hidden">
        <Link
          href={k.properties.href}
          className="text-muted-foreground mb-3 flex items-center justify-between text-xs font-medium"
        >
          Portfolio overview
          <ChevronRight className="size-4" />
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{k.properties.total}</p>
              <p className="text-muted-foreground text-xs">Properties</p>
            </div>
          </div>
          <div className="flex shrink-0 divide-x">
            <OccupancyColumn color="bg-emerald-500" count={k.properties.occupied} label="Occupied" />
            <OccupancyColumn color="bg-amber-400" count={k.properties.vacant} label="Vacant" />
            {hasFullManagementAccess ? (
              <OccupancyColumn color="bg-sky-500" count={offerCount} label="Under offer" />
            ) : null}
          </div>
        </div>
      </article>

      {/* Mobile — portfolio health */}
      <article className="v2-dashboard__health-card relative overflow-hidden p-4 lg:hidden">
        <div className="relative z-[1] mb-3 flex items-center gap-2">
          <p className="text-xs font-medium">Portfolio health</p>
          <HealthLabelBadge label={health.label} />
        </div>
        <div className="relative z-[1] -mx-0.5 flex gap-2 overflow-x-auto pb-0.5">
          <MobileHealthChip
            icon={CheckCircle2}
            tone="text-emerald-600"
            value={health.healthy}
            label="Healthy"
            onClick={() => setHealthBucket('healthy')}
          />
          <MobileHealthChip
            icon={Sparkles}
            tone="text-primary"
            value={health.crosHandling}
            label="CROS handling"
            onClick={() => setHealthBucket('crosHandling')}
          />
          <MobileHealthChip
            icon={AlertCircle}
            tone="text-rose-600"
            value={health.needAction}
            label="Need your action"
            onClick={() => setHealthBucket('needAction')}
          />
        </div>
        <ShieldCheck
          className="text-primary/15 pointer-events-none absolute top-1/2 right-2 size-[4.5rem] -translate-y-1/2"
          aria-hidden
        />
      </article>

      {/* Desktop — combined top band */}
      <article className="v2-dashboard__card hidden overflow-hidden lg:block">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] divide-x">
          <section className="flex flex-col p-5">
            <Link
              href={k.properties.href}
              className="text-muted-foreground mb-3 flex items-center justify-between text-xs font-medium hover:text-foreground"
            >
              Portfolio Overview
              <ChevronRight className="size-4" />
            </Link>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {k.properties.total}{' '}
              <span className="text-muted-foreground text-base font-medium">Properties</span>
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <OccupancyRow color="bg-emerald-500" label={`${k.properties.occupied} Occupied`} />
              <OccupancyRow color="bg-muted-foreground/40" label={`${k.properties.vacant} Vacant`} />
              {hasFullManagementAccess && offerCount > 0 ? (
                <OccupancyRow color="bg-sky-500" label={`${offerCount} Under offer`} />
              ) : null}
            </div>
          </section>

          <section className="flex min-w-0 flex-col p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs font-medium">Portfolio Health</p>
              <HealthLabelBadge label={health.label} />
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <HealthBarSegment value={health.healthy} total={healthTotal} className="bg-emerald-500" />
              <HealthBarSegment value={health.crosHandling} total={healthTotal} className="bg-amber-400" />
              <HealthBarSegment value={health.needAction} total={healthTotal} className="bg-rose-500" />
              <HealthBarSegment value={health.issues} total={healthTotal} className="bg-muted-foreground/30" />
            </div>
            <div className="mt-4 grid grid-cols-4 items-start gap-1">
              <HealthStat
                value={health.healthy}
                label="Healthy"
                tone="text-emerald-600"
                onClick={() => setHealthBucket('healthy')}
              />
              <HealthStat
                value={health.crosHandling}
                label={PORTFOLIO_HEALTH_BUCKET_LABEL.crosHandling}
                tone="text-amber-600"
                onClick={() => setHealthBucket('crosHandling')}
              />
              <HealthStat
                value={health.needAction}
                label={PORTFOLIO_HEALTH_BUCKET_LABEL.needAction}
                tone="text-rose-600"
                onClick={() => setHealthBucket('needAction')}
              />
              <HealthStat
                value={health.issues}
                label="Issues"
                tone="text-muted-foreground"
                onClick={() => setHealthBucket('issues')}
              />
            </div>
          </section>

          <section className="flex flex-col p-5">
            {hasFullManagementAccess ? (
              <>
                <p className="text-muted-foreground mb-3 text-xs font-medium">Financial Summary</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatDashboardMoney(k.accounting.totalRentalIncome)}
                </p>
                <p className="text-muted-foreground text-xs">Rent Collected (YTD)</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">In Arrears</dt>
                    <dd className="font-medium tabular-nums">
                      {k.accounting.propertiesInArrears} · {formatDashboardMoney(k.accounting.totalArrearsAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Outstanding Rent</dt>
                    <dd className="font-medium tabular-nums">
                      {formatDashboardMoney(k.accounting.outstandingBills)}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={k.accounting.href}
                  className="text-primary mt-3 inline-flex items-center text-xs font-medium hover:underline"
                >
                  Go to Accounting
                  <ChevronRight className="size-3.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-3 text-xs font-medium">Inspections</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{cros.inspections.count}</p>
                <p className="text-muted-foreground text-xs">Open Inspection Jobs</p>
                <Link
                  href={k.inspection.href}
                  className="text-primary mt-3 inline-flex items-center text-xs font-medium hover:underline"
                >
                  Go to Inspections
                  <ChevronRight className="size-3.5" />
                </Link>
              </>
            )}
          </section>
        </div>
      </article>

      {/* Needs your attention — mobile only (desktop uses side panel) */}
      <section className="space-y-3 lg:hidden">
        <SectionHead
          title="Needs your attention"
          count={needActionItems.length}
          countTone="danger"
          href={ROUTES.TASKS}
        />
        {attention.length === 0 ? (
          <p className="text-muted-foreground v2-dashboard__empty px-4 py-8 text-center text-sm">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {attention.map((item) => (
              <li key={item.id}>
                <DashboardAttentionCard
                  item={item}
                  mobile
                  subtext={attentionItemSubtext(item, attentionSubtextCtx)}
                  note={crosNoteForAttentionItem(
                    item,
                    maintenanceAll,
                    rentReviews,
                    formatDashboardMoney,
                  )}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <SectionHead
          title={`${CROS_ASSISTANT_NAME} is handling`}
          count={hasFullManagementAccess ? cros.total : cros.inspections.count}
          href={ROUTES.TASKS}
          linkLabel="View all tasks"
        />
        <div
          className={cn(
            '-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0',
            hasFullManagementAccess ? 'lg:grid-cols-3' : 'lg:grid-cols-1',
          )}
        >
          {hasFullManagementAccess ? (
            <CrosLane
              href={k.maintenance.href}
              icon={Wrench}
              iconTone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              count={cros.maintenance.count}
              label="Maintenance"
              status={
                cros.maintenance.pending > 0
                  ? `${cros.maintenance.pending} on track`
                  : cros.maintenance.count > 0
                    ? 'On track'
                    : 'Quiet'
              }
              warn={cros.maintenance.pending > 0}
            />
          ) : null}
          <CrosLane
            href={k.inspection.href}
            icon={ClipboardList}
            iconTone="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            count={cros.inspections.count}
            label="Inspections"
            status={cros.inspections.count > 0 ? 'All on track' : 'Quiet'}
          />
          {hasFullManagementAccess ? (
            <CrosLane
              href={k.leasing.href}
              icon={Home}
              iconTone="bg-violet-500/10 text-violet-700 dark:text-violet-300"
              count={cros.leasing.count}
              label="Leasing"
              status={
                k.leasing.newLeasing > 0
                  ? `${k.leasing.newLeasing} pending`
                  : cros.leasing.count > 0
                    ? 'On track'
                    : 'Quiet'
              }
              warn={k.leasing.newLeasing > 0}
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-3 max-lg:pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        <SectionHead title="Recent activity" href={ROUTES.TASKS} linkLabel="View all" />
        {activity.length === 0 ? (
          <p className="text-muted-foreground v2-dashboard__empty px-4 py-8 text-center text-sm">
            No recent activity yet.
          </p>
        ) : (
          <>
            <ul className="space-y-2.5 lg:hidden">
              {activity.map((row) => {
                const visual = ACTIVITY_ICON[row.category] ?? ACTIVITY_ICON.Maintenance;
                const ActivityIcon = visual.icon;
                return (
                  <li key={row.id}>
                    <Link
                      href={row.href}
                      className="v2-dashboard__card flex items-start gap-3 p-3 transition hover:opacity-95"
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full',
                          visual.tone,
                        )}
                      >
                        <ActivityIcon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-[11px] tabular-nums">
                          {activityWhen(row.at)}
                        </p>
                        <p className="text-sm font-medium leading-snug">{formatTitleCase(row.title)}</p>
                        <p className="text-muted-foreground truncate text-xs">{row.address}</p>
                      </div>
                      <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ul className="v2-dashboard__card divide-y overflow-hidden hidden lg:block">
              {activity.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className="hover:bg-muted/40 flex items-start gap-3 px-4 py-3">
                    <span className="text-muted-foreground w-14 shrink-0 pt-0.5 text-[11px] tabular-nums">
                      {activityWhen(row.at)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{formatTitleCase(row.title)}</p>
                      <p className="text-muted-foreground truncate text-xs">{row.address}</p>
                    </div>
                    <span
                      className={cn(
                        'hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium lg:inline',
                        ACTIVITY_TONE[row.category],
                      )}
                    >
                      {row.category}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {showMobileAskBar ? (
        <form
          onSubmit={submitAsk}
          className="v2-frosted-surface fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-full border px-2 py-1.5 lg:hidden"
        >
          <CrosAssistantLogo size="sm" />
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            onFocus={focusAskBar}
            placeholder={`Ask ${CROS_ASSISTANT_NAME} anything… e.g. Show me arrears, next inspections, etc.`}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label={`Ask ${CROS_ASSISTANT_NAME}`}
          />
          <button
            type="button"
            onClick={() => openGii()}
            className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full"
            aria-label={`Talk to ${CROS_ASSISTANT_NAME}`}
          >
            <Mic className="size-4" />
          </button>
        </form>
      ) : null}

      <PortfolioHealthDetailDialog
        bucket={healthBucket}
        entries={healthBucket ? health.buckets[healthBucket] : []}
        open={healthBucket != null}
        onOpenChange={(open) => {
          if (!open) setHealthBucket(null);
        }}
      />
    </div>
  );
}

function OccupancyRow({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
      <span className={cn('size-1.5 rounded-full', color)} aria-hidden />
      {label}
    </span>
  );
}

function OccupancyColumn({
  color,
  count,
  label,
}: {
  color: string;
  count: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center px-2.5 first:pl-0 last:pr-0 sm:px-3">
      <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
        <span className={cn('size-1.5 rounded-full', color)} aria-hidden />
        {count}
      </span>
      <span className="text-muted-foreground text-[10px]">{label}</span>
    </div>
  );
}

function MobileHealthChip({
  icon: Icon,
  tone,
  value,
  label,
  onClick,
}: {
  icon: LucideIcon;
  tone: string;
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const interactive = value > 0 && onClick;
  const body = (
    <>
      <Icon className={cn('size-3.5 shrink-0', tone)} aria-hidden />
      <span className="text-xs font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-[10px]">{label}</span>
    </>
  );

  const className =
    'v2-dashboard__health-chip flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5';

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

function HealthLabelBadge({ label }: { label: 'Good' | 'Needs attention' | 'Quiet' }) {
  const display =
    label === 'Needs attention' ? 'Needs Attention' : label === 'Quiet' ? 'Quiet' : 'Good';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        label === 'Good'
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : label === 'Quiet'
            ? 'bg-muted text-muted-foreground'
            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
      )}
    >
      {display}
      {label === 'Good' ? <HeartPulse className="size-3" /> : null}
    </span>
  );
}

function HealthBarSegment({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className: string;
}) {
  if (value <= 0) return null;
  return <span className={className} style={{ width: `${(value / total) * 100}%` }} />;
}

function HealthStat({
  value,
  label,
  tone,
  onClick,
}: {
  value: number;
  label: string;
  tone: string;
  onClick?: () => void;
}) {
  const interactive = value > 0 && onClick;
  const content = (
    <>
      <p className={cn('text-base font-semibold tabular-nums leading-none', tone)}>{value}</p>
      <p className="text-muted-foreground mt-1.5 min-h-[2rem] px-0.5 text-[10px] leading-snug">{label}</p>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-muted/60 flex w-full min-w-0 flex-col items-center rounded-lg px-0.5 py-1 text-center transition"
      >
        {content}
      </button>
    );
  }

  return <div className="flex w-full min-w-0 flex-col items-center text-center">{content}</div>;
}

function CrosLane({
  href,
  icon: Icon,
  iconTone,
  count,
  label,
  status,
  warn,
}: {
  href: string;
  icon: LucideIcon;
  iconTone: string;
  count: number;
  label: string;
  status: string;
  warn?: boolean;
}) {
  return (
    <Link
      href={href}
      className="v2-dashboard__lane hover:border-primary/20 flex min-w-[8.75rem] shrink-0 items-start gap-2.5 p-3 transition lg:min-w-0 lg:block lg:rounded-2xl lg:p-4"
    >
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg lg:size-9 lg:rounded-xl', iconTone)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight tabular-nums lg:mt-3 lg:text-2xl">
          {count}
          <span className="ml-1 text-xs font-medium lg:hidden">{label}</span>
        </p>
        <p className="hidden text-sm font-medium lg:block">{label}</p>
        <p className={cn('text-[11px] lg:mt-0.5 lg:text-xs', warn ? 'text-amber-600' : 'text-emerald-600')}>
          <span className="lg:hidden">{status}</span>
          <span className="hidden lg:inline">{formatTitleCase(status)}</span>
        </p>
      </div>
    </Link>
  );
}
