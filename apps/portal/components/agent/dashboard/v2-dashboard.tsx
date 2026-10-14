'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  Home,
  Mic,
  Users,
  Wrench,
} from 'lucide-react';

import { InspectionOnlyPlanBanner } from '@/components/agent/inspection-only-plan-banner';
import { CrosAssistantLogo } from '@/components/brand/cros-assistant-logo';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  ROUTES,
  vacatingDetail,
} from '@/constants/routes';
import {
  buildDashboardBoard,
  DASHBOARD_EVENT_PREVIEW,
  DASHBOARD_HORIZONS,
  type DashboardEvent,
  type DashboardEventBadge,
  type DashboardHorizon,
} from '@/lib/dashboard-board';
import { formatDashboardMoney, greetingForNow } from '@/lib/dashboard-home';
import {
  buildPortfolioTaskList,
  filterTaskListV2RowsForAgencies,
  taskDueMeta,
} from '@/lib/task-list-v2';
import { useAgentStore } from '@/lib/store';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { cn } from '@/lib/utils';

import './v2-dashboard.css';

const BADGE_CLASS: Record<DashboardEventBadge, string> = {
  action: 'bg-rose-500/12 text-rose-700',
  awaiting: 'bg-amber-500/15 text-amber-800',
  scheduled: 'bg-emerald-500/12 text-emerald-700',
  'coming-up': 'bg-sky-500/12 text-sky-800',
};

export function V2Dashboard() {
  const { user } = useAuth();
  const {
    properties,
    agencies,
    needActionItems,
    hasFullManagementAccess,
    inspections,
    rentReviews,
    maintenanceAll,
    vacating,
    accounting,
    tenantSelections,
    leasingRecords,
    leasingCycles,
    tribunalCases,
    getPropertyActions,
  } = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);
  const openGii = useShellDockStore((s) => s.openGii);
  const expandGii = useShellDockStore((s) => s.expandGii);
  const activePanel = useShellDockStore((s) => s.activePanel);
  const giiExpanded = useShellDockStore((s) => s.giiExpanded);
  const [ask, setAsk] = useState('');
  const [horizon, setHorizon] = useState<DashboardHorizon>(14);

  const firstName = user?.firstName?.trim() || 'there';
  const greeting = greetingForNow();

  const visiblePortfolio = useMemo(() => {
    const ids = new Set(properties.map((property) => property.id));
    const owned = <T extends { propertyId: string }>(rows: T[]) =>
      rows.filter((row) => ids.has(row.propertyId));
    const management = hasFullManagementAccess;
    return {
      inspections: owned(inspections),
      tribunalCases: owned(tribunalCases),
      rentReviews: management ? owned(rentReviews) : [],
      maintenance: management ? owned(maintenanceAll) : [],
      vacating: management ? owned(vacating) : [],
      accounting: management ? owned(accounting) : [],
      tenantSelections: management ? owned(tenantSelections) : [],
      leasingRecords: management ? owned(leasingRecords) : [],
      leasingCycles: management ? owned(leasingCycles) : [],
      rentReviewDecisions: management ? rentReviewDecisions : {},
      needActionItems: owned(needActionItems).filter(
        (item) => management || item.category === 'Inspection' || item.category === 'Tribunal',
      ),
    };
  }, [
    accounting,
    hasFullManagementAccess,
    inspections,
    leasingCycles,
    leasingRecords,
    maintenanceAll,
    needActionItems,
    properties,
    rentReviewDecisions,
    rentReviews,
    tenantSelections,
    tribunalCases,
    vacating,
  ]);

  const board = useMemo(
    () =>
      buildDashboardBoard({
        properties,
        rentReviews: visiblePortfolio.rentReviews,
        inspections: visiblePortfolio.inspections,
        maintenance: visiblePortfolio.maintenance,
        vacating: visiblePortfolio.vacating,
        accounting: visiblePortfolio.accounting,
        needActionItems: visiblePortfolio.needActionItems,
        rentReviewHref: (id) => rentReviewDetail(id),
        inspectionHref: (id) => inspectionDetail(id),
        vacatingHref: (id) => vacatingDetail(id),
        maintenanceHref: (id) => maintenanceDetail(id),
        horizonDays: horizon,
        fullService: hasFullManagementAccess,
        leasingInProgress: visiblePortfolio.tenantSelections.filter((row) => {
          const status = row.status.toLowerCase();
          return !status.includes('complete') && !status.includes('closed') && !status.includes('cancel');
        }).length,
      }),
    [hasFullManagementAccess, horizon, properties, visiblePortfolio],
  );

  const actionCounts = useMemo(() => {
    const rows = filterTaskListV2RowsForAgencies(
      buildPortfolioTaskList({
        properties,
        leasingRecords: visiblePortfolio.leasingRecords,
        maintenanceAll: visiblePortfolio.maintenance,
        inspections: visiblePortfolio.inspections,
        rentReviews: visiblePortfolio.rentReviews,
        rentReviewDecisions: visiblePortfolio.rentReviewDecisions,
        leasingCycles: visiblePortfolio.leasingCycles,
        tenantSelections: visiblePortfolio.tenantSelections,
        vacating: visiblePortfolio.vacating,
        tribunalCases: visiblePortfolio.tribunalCases,
        accounting: visiblePortfolio.accounting,
        getPropertyActions: (propertyId) => {
          const actions = getPropertyActions(propertyId);
          if (hasFullManagementAccess) return actions;
          return actions.filter(
            (item) => item.category === 'Inspection' || item.category === 'Tribunal',
          );
        },
      }),
      agencies,
    ).filter((row) => row.bucket === 'need_action');
    const rentReviewsNeedingAction = rows.filter((row) => row.category === 'rent_review');
    const leaseRenewals = rows.filter((row) => row.category === 'leasing');
    const other = rows.filter((row) => row.category !== 'rent_review' && row.category !== 'leasing');
    const overdue = (group: typeof rows) => group.filter((row) => taskDueMeta(row).tone === 'overdue').length;
    const dueSoon = (group: typeof rows) => group.filter((row) => taskDueMeta(row).tone === 'soon').length;
    return {
      total: rows.length,
      rentReviews: { count: rentReviewsNeedingAction.length, overdue: overdue(rentReviewsNeedingAction) },
      leaseRenewals: { count: leaseRenewals.length, dueSoon: dueSoon(leaseRenewals) },
      other: { count: other.length, urgent: other.filter((row) => row.task.needAction?.priority === 'urgent').length },
    };
  }, [agencies, getPropertyActions, hasFullManagementAccess, properties, visiblePortfolio]);

  const occupied = properties.filter(
    (property) =>
      property.leaseStatus === 'active' ||
      property.leaseStatus === 'periodic' ||
      property.leaseStatus === 'vacating',
  ).length;
  const vacant = properties.filter((property) => property.leaseStatus === 'vacant').length;

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
    if (activePanel !== 'gii') openGii();
  };

  const showMobileAskBar = !(activePanel === 'gii' && giiExpanded);
  const summary = board.summary;

  return (
    <div className="v2-dashboard normal-case space-y-4 pb-8 lg:space-y-5 lg:pb-2">
      <InspectionOnlyPlanBanner />

      <header className="pt-1 lg:pt-2">
        <h1 className="v2-dashboard__greeting text-xl font-semibold tracking-tight sm:text-2xl">
          {greeting}, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here&apos;s what&apos;s happening with your portfolio today.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.5fr)]">
        <article className="v2-dashboard__card p-4 sm:p-5">
          <Link
            href={ROUTES.PROPERTIES}
            className="text-muted-foreground hover:text-foreground mb-4 flex items-center justify-between text-sm font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <Building2 className="size-4" />
              Portfolio Overview
            </span>
            <ChevronRight className="size-4" />
          </Link>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {properties.length}{' '}
            <span className="text-muted-foreground text-base font-medium">Properties</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {occupied} Occupied
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-400" />
              {vacant} Vacant
            </span>
          </div>
        </article>

        <article className="v2-dashboard__card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <Bell className="text-muted-foreground size-4" />
              Needs Your Attention
            </p>
            {actionCounts.total > 0 ? (
              <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                {actionCounts.total} pending
              </span>
            ) : (
              <span className="text-muted-foreground text-xs font-medium">All clear</span>
            )}
          </div>
          <div
            className={cn(
              'grid gap-3',
              hasFullManagementAccess ? 'sm:grid-cols-3' : 'sm:grid-cols-1',
            )}
          >
            {hasFullManagementAccess ? (
              <>
            <AttentionStat
              href={`${ROUTES.TASKS}?status=need_action&filter=Accounting`}
              icon={FileText}
              iconClass="bg-rose-500/12 text-rose-600"
              count={actionCounts.rentReviews.count}
              label="Rent Reviews"
              hint={
                actionCounts.rentReviews.overdue > 0
                  ? `${actionCounts.rentReviews.overdue} overdue`
                  : 'None overdue'
              }
              hintClass={
                actionCounts.rentReviews.overdue > 0 ? 'text-rose-600' : 'text-muted-foreground'
              }
            />
            <AttentionStat
              href={`${ROUTES.TASKS}?status=need_action&filter=Leasing`}
              icon={Home}
              iconClass="bg-violet-500/12 text-violet-700"
              count={actionCounts.leaseRenewals.count}
              label="Lease Renewals"
              hint={
                actionCounts.leaseRenewals.dueSoon > 0
                  ? `${actionCounts.leaseRenewals.dueSoon} due soon`
                  : 'None due soon'
              }
              hintClass={
                actionCounts.leaseRenewals.dueSoon > 0 ? 'text-amber-700' : 'text-muted-foreground'
              }
            />
              </>
            ) : null}
            <AttentionStat
              href={`${ROUTES.TASKS}?status=need_action`}
              icon={Users}
              iconClass="bg-sky-500/12 text-sky-700"
              count={actionCounts.other.count}
              label="Other Decisions"
              hint={
                actionCounts.other.urgent > 0
                  ? `${actionCounts.other.urgent} urgent`
                  : 'None urgent'
              }
              hintClass={
                actionCounts.other.urgent > 0 ? 'text-rose-600' : 'text-muted-foreground'
              }
            />
          </div>
        </article>
      </div>

      <section className="v2-dashboard__card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="text-muted-foreground size-4" />
              Upcoming Events
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">Summarised by {CROS_ASSISTANT_NAME}</p>
          </div>
          <div className="bg-muted/40 inline-flex rounded-full border p-0.5" aria-label="Event window">
            {DASHBOARD_HORIZONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setHorizon(days)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold',
                  horizon === days ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
                aria-pressed={horizon === days}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <CrosAssistantLogo size="sm" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              {CROS_ASSISTANT_NAME} Summary: You have {summary.total} upcoming event
              {summary.total === 1 ? '' : 's'} in the next {horizon} days.
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {hasFullManagementAccess
                ? fullServiceSummary(summary)
                : selfManageSummary(summary)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <EventColumn
            title="Needs your decision"
            icon={AlertTriangle}
            tone="text-rose-600"
            countClass="bg-rose-500/12 text-rose-700"
            events={board.lanes.decision}
            empty={`No decisions due in the next ${horizon} days.`}
          />
          <EventColumn
            title="Already arranged"
            icon={CheckCircle2}
            tone="text-emerald-600"
            countClass="bg-emerald-500/12 text-emerald-700"
            events={board.lanes.arranged}
            empty={`Nothing arranged in the next ${horizon} days.`}
          />
          <EventColumn
            title="Coming up"
            icon={Clock3}
            tone="text-sky-700"
            countClass="bg-sky-500/12 text-sky-800"
            events={board.lanes.upcoming}
            empty={`Nothing else coming up in the next ${horizon} days.`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <Link href={`${ROUTES.TASKS}?timing=${horizon}`} className="text-primary text-xs font-semibold hover:underline">
            View all upcoming events
          </Link>
          <button
            type="button"
            onClick={() =>
              openGii({
                initialPrompt: `Why do these upcoming events matter? I have ${summary.total} in the next ${horizon} days: ${summary.needAction} need a decision, ${summary.awaiting} are waiting on a response, ${summary.arranged} are already arranged, and ${summary.awareness} are for awareness.`,
              })
            }
            className="text-primary text-xs font-semibold hover:underline"
          >
            Ask {CROS_ASSISTANT_NAME} why these matter
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="v2-dashboard__card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4 text-rose-500" />
              Portfolio Watchlist
            </h2>
            <Link href={ROUTES.PROPERTIES} className="text-primary text-xs font-semibold hover:underline">
              View watchlist
            </Link>
          </div>
          <ul className="divide-y">
            <WatchRow
              href={ROUTES.PROPERTIES}
              icon={Home}
              iconClass="bg-rose-500/12 text-rose-600"
              title="Vacant Properties"
              count={board.watchlist.vacantOver30}
              detail={
                board.watchlist.vacantOver30 === 1
                  ? '1 property vacant for more than 30 days'
                  : `${board.watchlist.vacantOver30} properties vacant for more than 30 days`
              }
            />
            {hasFullManagementAccess ? (
              <WatchRow
                href={ROUTES.ACCOUNTING}
                icon={CircleDollarSign}
                iconClass="bg-amber-500/15 text-amber-700"
                title="Rent Arrears"
                count={board.watchlist.arrearsCount}
                detail={
                  board.watchlist.arrearsCount > 0
                    ? `${board.watchlist.arrearsCount} ${
                        board.watchlist.arrearsCount === 1 ? 'property' : 'properties'
                      } in arrears (total ${formatDashboardMoney(board.watchlist.arrearsAmount)})`
                    : 'No rent arrears on file'
                }
              />
            ) : null}
            <WatchRow
              href={`${ROUTES.TASKS}?filter=Maintenance`}
              icon={Wrench}
              iconClass="bg-violet-500/12 text-violet-700"
              title="Delayed Maintenance"
              count={board.watchlist.delayedMaintenance}
              detail={
                board.watchlist.delayedMaintenance > 0
                  ? `${board.watchlist.delayedMaintenance} jobs overdue (oldest ${board.watchlist.oldestMaintenanceDays} days)`
                  : 'No jobs overdue past 14 days'
              }
            />
          </ul>
        </section>

        <section className="v2-dashboard__card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="text-primary size-4" />
              {CROS_ASSISTANT_NAME} Activity
            </h2>
            <Link href={ROUTES.TASKS} className="text-primary text-xs font-semibold hover:underline">
              View all activity
            </Link>
          </div>
          <ul className="divide-y">
            {hasFullManagementAccess ? (
              <ActivityRow
                href={`${ROUTES.TASKS}?filter=Maintenance`}
                icon={Wrench}
                iconClass="bg-emerald-500/12 text-emerald-700"
                count={board.activity.maintenance.count}
                label="Maintenance"
                detail={[
                  `${board.activity.maintenance.onTrack} on track`,
                  board.activity.maintenance.awaiting > 0
                    ? `${board.activity.maintenance.awaiting} awaiting response`
                    : null,
                  board.activity.maintenance.overdue > 0
                    ? `${board.activity.maintenance.overdue} overdue`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ) : null}
            <ActivityRow
              href={`${ROUTES.TASKS}?filter=Inspection&subtype=Routine&timing=${horizon}`}
              icon={ClipboardList}
              iconClass="bg-sky-500/12 text-sky-700"
              count={board.activity.inspections.count}
              label="Inspections"
              detail={`${board.activity.inspections.onTrack} on track${
                board.activity.inspections.pendingFeedback > 0
                  ? ` · ${board.activity.inspections.pendingFeedback} pending feedback`
                  : ''
              }`}
            />
            {hasFullManagementAccess ? (
              <ActivityRow
                href={`${ROUTES.TASKS}?filter=Leasing`}
                icon={Home}
                iconClass="bg-amber-500/15 text-amber-800"
                count={board.activity.leasing.count}
                label="Leasing"
                detail={`${board.activity.leasing.inProgress} in progress · ${board.activity.leasing.upcoming} upcoming`}
              />
            ) : null}
          </ul>
        </section>
      </div>

      {showMobileAskBar ? (
        <form
          onSubmit={submitAsk}
          className="v2-frosted-surface fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-full border px-2 py-1.5 lg:hidden"
        >
          <CrosAssistantLogo size="sm" />
          <input
            value={ask}
            onChange={(event) => setAsk(event.target.value)}
            onFocus={focusAskBar}
            placeholder={`Ask ${CROS_ASSISTANT_NAME} anything…`}
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
    </div>
  );
}

function countPhrase(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function fullServiceSummary(summary: {
  needAction: number;
  arranged: number;
  awaiting: number;
  awareness: number;
}): string {
  const parts = [
    `${countPhrase(summary.needAction, 'needs', 'need')} your approval`,
    summary.awaiting > 0
      ? `${countPhrase(summary.awaiting, 'is', 'are')} waiting on a tenant`
      : null,
    `${countPhrase(summary.arranged, 'is', 'are')} already arranged by ${CROS_ASSISTANT_NAME}`,
    `${countPhrase(summary.awareness, 'is', 'are')} for awareness`,
  ].filter(Boolean);
  return `${parts.join(', ')}.`;
}

function selfManageSummary(summary: { needAction: number; toSchedule: number; awareness: number }): string {
  const action = `${countPhrase(summary.needAction, 'needs', 'need')} your action`;
  const otherAwareness = Math.max(0, summary.awareness - summary.toSchedule);
  const parts = [action];
  if (summary.toSchedule > 0) parts.push(`${summary.toSchedule} should be scheduled soon`);
  if (otherAwareness > 0) {
    parts.push(`${countPhrase(otherAwareness, 'is', 'are')} for awareness`);
  }
  if (parts.length === 1) return `${action}.`;
  if (parts.length === 2) return `${parts[0]}, and ${parts[1]}.`;
  return `${parts[0]}, ${parts[1]}, and ${parts[2]}.`;
}

function AttentionStat({
  href,
  icon: Icon,
  iconClass,
  count,
  label,
  hint,
  hintClass,
}: {
  href: string;
  icon: LucideIcon;
  iconClass: string;
  count: number;
  label: string;
  hint: string;
  hintClass: string;
}) {
  return (
    <Link href={href} className="hover:bg-muted/40 rounded-2xl border bg-background/50 p-3 transition">
      <div className="flex items-start justify-between gap-2">
        <span className={cn('flex size-9 items-center justify-center rounded-xl', iconClass)}>
          <Icon className="size-4" />
        </span>
        <span className="text-2xl font-semibold tabular-nums leading-none">{count}</span>
      </div>
      <p className="mt-3 text-sm font-medium">{label}</p>
      <p className={cn('mt-0.5 text-xs font-medium', hintClass)}>{hint}</p>
    </Link>
  );
}

function EventColumn({
  title,
  icon: Icon,
  tone,
  countClass,
  events,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  tone: string;
  countClass: string;
  events: DashboardEvent[];
  empty: string;
}) {
  const preview = events.slice(0, DASHBOARD_EVENT_PREVIEW);
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border bg-background/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', tone)}>
          <Icon className="size-4" />
          {title}
        </p>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums', countClass)}>
          {events.length}
        </span>
      </div>
      {preview.length === 0 ? (
        <p className="text-muted-foreground px-1 py-6 text-center text-xs">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {preview.map((event) => (
            <li key={event.id}>
              <EventRow event={event} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({ event }: { event: DashboardEvent }) {
  return (
    <div className="rounded-xl border bg-background/70 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{event.title}</p>
          <p className="text-muted-foreground truncate text-xs">{event.address}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            BADGE_CLASS[event.badge],
          )}
        >
          {event.badgeLabel}
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs">{event.detail}</p>
          {event.why ? (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{event.why}</p>
          ) : null}
        </div>
        <Link
          href={event.href}
          className="text-primary inline-flex shrink-0 items-center text-xs font-semibold hover:underline"
        >
          {event.actionLabel}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function WatchRow({
  href,
  icon: Icon,
  iconClass,
  title,
  count,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  iconClass: string;
  title: string;
  count: number;
  detail: string;
}) {
  return (
    <li>
      <Link href={href} className="hover:bg-muted/30 flex items-center gap-3 rounded-xl px-1 py-3">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', iconClass)}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold">
            {title}
            <span className="text-muted-foreground font-medium tabular-nums">{count}</span>
          </span>
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">{detail}</span>
        </span>
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </li>
  );
}

function ActivityRow({
  href,
  icon: Icon,
  iconClass,
  count,
  label,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  iconClass: string;
  count: number;
  label: string;
  detail: string;
}) {
  return (
    <li>
      <Link href={href} className="hover:bg-muted/30 flex items-center gap-3 rounded-xl px-1 py-3">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', iconClass)}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums leading-none">{count}</span>
            <span className="text-sm font-semibold">{label}</span>
          </span>
          <span className="text-muted-foreground mt-1 block truncate text-xs">{detail}</span>
        </span>
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </li>
  );
}
