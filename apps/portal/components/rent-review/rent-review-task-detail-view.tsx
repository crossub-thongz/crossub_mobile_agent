'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { ChevronRight, DollarSign } from 'lucide-react';

import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { RentEquivalentsHint } from '@/components/rent-equivalents-hint';
import { TaskPageActions } from '@/components/agent/tasks/task-page-actions';
import {
  TaskWorkflowRailSlot,
  TaskWorkflowRailSlotProvider,
} from '@/components/agent/tasks/task-workflow-rail-slot';
import { RentReviewAgentWorkflowPanel } from '@/components/rent-review/rent-review-agent-workflow-panel';
import { RentReviewTaskDocuments } from '@/components/rent-review/rent-review-task-documents';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import { CASE_ASSIGNED_TO_LABEL, resolveCaseAssignedToFromProperty } from '@/lib/case-assigned-to';
import { relatedPropertyJobHref } from '@/lib/property-job-href';
import {
  buildRentReviewActivityEntries,
  buildRentReviewDetailRows,
  rentReviewTaskReference,
  resolveRentReviewStatusBanner,
  tenantResponseSummary,
  type RentReviewTaskTab,
} from '@/lib/rent-review-task-detail';
import { buildPropertyOverviewJobRows } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import {
  cn,
  formatCurrency,
  formatDate,
  formatPropertyFullAddress,
  formatTime,
} from '@/lib/utils';

import './rent-review-task-detail.css';

const TABS: { id: RentReviewTaskTab; label: string }[] = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'details', label: 'Details' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'tenant_response', label: 'Tenant response' },
  { id: 'activity', label: 'Activity' },
  { id: 'documents', label: 'Documents' },
  { id: 'notes', label: 'Notes' },
];

function ActivityTimeline({
  entries,
}: {
  entries: ReturnType<typeof buildRentReviewActivityEntries>;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No activity recorded for this task yet.</p>
    );
  }

  return (
    <div className="rent-review-task__activity-card relative rounded-2xl border v2-frosted-surface px-4">
      <span className="rent-review-task__activity-line bg-border absolute" aria-hidden />
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className={cn(
            'relative flex gap-4 py-4',
            index < entries.length - 1 && 'border-b border-border/50',
          )}
        >
          <div className="w-16 shrink-0 pt-0.5 text-right text-sm font-medium tabular-nums">
            {formatTime(entry.at)}
          </div>
          <div className="relative flex w-4 shrink-0 justify-center">
            <span className="bg-violet-600 ring-card relative z-10 mt-1.5 size-2.5 rounded-full ring-[3px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{entry.title}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {formatDate(entry.at)} · by {entry.actor}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function RentReviewTaskDetailView({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const {
    properties,
    leasingRecords,
    leasingCycles,
    tenantSelections,
    maintenanceAll,
    inspections,
    rentReviews,
    vacating,
    tribunalCases,
    accounting,
  } = useAgentData();

  const [activeTab, setActiveTab] = useState<RentReviewTaskTab>('workflow');
  const showWorkflowTab = useCallback(() => setActiveTab('workflow'), []);

  const propertyId = detail.propertyId ?? '';
  const property = properties.find((row) => row.id === propertyId) ?? null;
  const currentLease = leasingRecords.find(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );

  const banner = useMemo(() => resolveRentReviewStatusBanner(detail), [detail]);
  const detailRows = useMemo(
    () => buildRentReviewDetailRows(detail, property),
    [detail, property],
  );
  const activityEntries = useMemo(
    () => buildRentReviewActivityEntries(detail),
    [detail],
  );
  const tenantResponse = useMemo(() => tenantResponseSummary(detail), [detail]);

  const address = property
    ? formatPropertyFullAddress(property)
    : detail.propertyAddress;
  const taskRef = rentReviewTaskReference(detail.id);
  const createdLabel = detail.createdAt ? formatDate(detail.createdAt) : '—';
  const proposed = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly;

  const relatedTasks = useMemo(() => {
    if (!propertyId) return [];
    const leasingCases = buildPropertyLeasingWorkflowCases({
      propertyId,
      leasingCycles: leasingCycles.filter((row) => row.propertyId === propertyId),
      tenantSelections: tenantSelections.filter((row) => row.propertyId === propertyId),
      vacatingCases: vacating.filter((row) => row.propertyId === propertyId),
      rentReviews: rentReviews.filter((row) => row.propertyId === propertyId),
      rentReviewDecisions: {},
      currentLease,
    });
    const rows = buildPropertyOverviewJobRows({
      maintenance: maintenanceAll.filter((row) => row.propertyId === propertyId),
      inspections: inspections.filter((row) => row.propertyId === propertyId),
      rentReviews: rentReviews.filter((row) => row.propertyId === propertyId),
      rentReviewDecisions: {},
      leasingCases,
      tribunalCases: tribunalCases.filter((row) => row.propertyId === propertyId),
      vacatingCases: vacating.filter((row) => row.propertyId === propertyId),
      accounting: accounting.find((row) => row.propertyId === propertyId) ?? null,
    });
    return rows.filter((row) => !(row.kind === 'rent_review' && row.id === detail.id)).slice(0, 4);
  }, [
    accounting,
    currentLease,
    detail.id,
    inspections,
    leasingCycles,
    maintenanceAll,
    propertyId,
    rentReviews,
    tenantSelections,
    tribunalCases,
    vacating,
  ]);

  return (
    <TaskWorkflowRailSlotProvider onStepActivate={showWorkflowTab}>
    <div className="rent-review-task px-4 py-5 lg:px-8 lg:py-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-violet-500/12 text-violet-700 flex size-11 shrink-0 items-center justify-center rounded-2xl">
              <DollarSign className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">
                Rent review – {property?.address ?? detail.propertyAddress.split(',')[0]}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">{address}</p>
              {detail.tenantName ? (
                <p className="text-muted-foreground mt-1 text-xs">{detail.tenantName}</p>
              ) : null}
              <p className="text-muted-foreground mt-1 text-xs">
                {CASE_ASSIGNED_TO_LABEL}{' '}
                <span className="text-foreground font-medium">
                  {resolveCaseAssignedToFromProperty(property?.propertyManager)}
                </span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:max-w-xs">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    Current rent
                    <RentEquivalentsHint weekly={detail.currentWeeklyRent} />
                  </p>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(detail.currentWeeklyRent)}/wk
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Review due</p>
                  <p className="font-medium">
                    {detail.rentReviewDate ? formatDate(detail.rentReviewDate) : '—'}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>Task ID {taskRef}</span>
                <span>Created {createdLabel}</span>
                <span>Task type Rent review</span>
              </div>
            </div>
          </div>
          <TaskPageActions propertyId={propertyId || null} reference={taskRef} />
        </div>
      </header>

      <section className="rent-review-task__status-card rounded-2xl border border-violet-500/20 p-5">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Current status
        </p>
        <h2 className="mt-1 text-lg font-semibold text-violet-950 dark:text-violet-100">
          {banner.title}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">{banner.subtitle}</p>
      </section>

      <TaskWorkflowRailSlot />

      <div className="space-y-5">
          <div className="border-b">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'border-b-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition',
                    activeTab === tab.id
                      ? 'border-violet-600 text-violet-700'
                      : 'text-muted-foreground hover:text-foreground border-transparent',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={activeTab === 'workflow' ? undefined : 'hidden'}>
            <div className="space-y-4">
              {propertyId ? (
                <CaseContactActions propertyId={propertyId} caseLabel="Rent review" />
              ) : null}
              <RentReviewAgentWorkflowPanel detail={detail} onUpdated={onUpdated} />
            </div>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-5">
              <section className="rounded-2xl border v2-frosted-surface p-5">
                <h3 className="text-sm font-semibold">Rent review details</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {detailRows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-muted-foreground text-xs">{row.label}</dt>
                      <dd className="mt-1 text-sm font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {tenantResponse ? (
                <section className="rounded-2xl border v2-frosted-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Tenant response</h3>
                      <p className="mt-2 text-sm font-semibold text-violet-700">
                        {tenantResponse.status}
                      </p>
                      {tenantResponse.at ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatDate(tenantResponse.at)}
                        </p>
                      ) : null}
                      {tenantResponse.reason ? (
                        <p className="text-muted-foreground mt-2 text-sm">
                          {tenantResponse.reason}
                        </p>
                      ) : null}
                      {tenantResponse.comments ? (
                        <p className="text-muted-foreground mt-1 text-sm">
                          {tenantResponse.comments}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tenant_response')}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      View full response
                    </button>
                  </div>
                </section>
              ) : null}

              {detail.ai.rationale ? (
                <section className="rounded-2xl border bg-muted/20 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">CROS recommendation</h3>
                      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        {detail.ai.rationale}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('workflow')}
                      className="shrink-0 rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    >
                      Prepare new proposal
                    </button>
                  </div>
                </section>
              ) : null}

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Activity timeline</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className="text-primary text-xs font-semibold hover:underline"
                  >
                    View all activity
                  </button>
                </div>
                <ActivityTimeline entries={activityEntries.slice(0, 4)} />
              </section>
            </div>
          ) : null}

          {activeTab === 'proposal' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Proposal</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Current rent</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {formatCurrency(detail.currentWeeklyRent)} / week
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Proposed rent</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {proposed != null ? `${formatCurrency(proposed)} / week` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Effective date</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {detail.effectiveDate ? formatDate(detail.effectiveDate) : '—'}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {activeTab === 'tenant_response' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              {tenantResponse ? (
                <>
                  <h3 className="text-sm font-semibold">Tenant response</h3>
                  <p className="mt-2 text-sm font-semibold text-violet-700">
                    {tenantResponse.status}
                  </p>
                  {tenantResponse.reason ? (
                    <p className="text-muted-foreground mt-3 text-sm">{tenantResponse.reason}</p>
                  ) : null}
                  {tenantResponse.comments ? (
                    <p className="text-muted-foreground mt-2 text-sm">{tenantResponse.comments}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No tenant response recorded yet.</p>
              )}
            </section>
          ) : null}

          {activeTab === 'activity' ? <ActivityTimeline entries={activityEntries} /> : null}

          {activeTab === 'documents' ? <RentReviewTaskDocuments detail={detail} /> : null}

          {activeTab === 'notes' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                {detail.negotiationNote?.trim() ||
                  detail.decisionReason?.trim() ||
                  'No notes recorded for this rent review yet.'}
              </p>
            </section>
          ) : null}

        </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto">
          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="text-sm font-semibold">Property</h3>
            <div className="mt-3 overflow-hidden rounded-xl border v2-frosted-surface">
              {property?.imageUrl ? (
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={property.imageUrl}
                    alt={address}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="p-3">
                <p className="text-sm font-semibold">{address}</p>
                <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {property?.leaseStatus === 'vacant' ? 'Vacant' : 'Occupied'}
                </span>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Property type</dt>
                    <dd className="font-medium">{property?.propertyType || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Bedrooms / Bathrooms</dt>
                    <dd className="font-medium">
                      {property?.bedrooms ?? '—'} / {property?.bathrooms ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Car spaces</dt>
                    <dd className="font-medium">{property?.carSpaces ?? '—'}</dd>
                  </div>
                </dl>
                {propertyId ? (
                  <Link
                    href={propertyDetail(propertyId)}
                    className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    View property
                    <ChevronRight className="size-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="text-sm font-semibold">Tenant</h3>
            <div className="mt-3 flex items-start gap-3">
              <span className="bg-violet-100 text-violet-700 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {initials(detail.tenantName || 'T')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{detail.tenantName}</p>
                <span className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Current tenant
                </span>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Lease period</dt>
                    <dd className="text-right font-medium">
                      {property?.leaseStart && property?.leaseEnd
                        ? `${formatDate(property.leaseStart)} – ${formatDate(property.leaseEnd)}`
                        : detail.leaseEndDate
                          ? `Ends ${formatDate(detail.leaseEndDate)}`
                          : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="font-medium">
                      {formatCurrency(detail.currentWeeklyRent)} / week
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent status</dt>
                    <dd className="font-medium text-emerald-700">
                      {property?.rentPaidUntil
                        ? `Paid up to ${formatDate(property.rentPaidUntil)}`
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="text-sm font-semibold">Related tasks</h3>
            <ul className="mt-3 space-y-3">
              {relatedTasks.length === 0 ? (
                <li className="text-muted-foreground text-sm">No other active tasks.</li>
              ) : (
                relatedTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={relatedPropertyJobHref(task, propertyId)}
                      className="hover:bg-muted/40 v2-frosted-surface flex items-start justify-between gap-3 rounded-xl border p-3 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{task.name}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{task.status}</p>
                      </div>
                      <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    </Link>
                  </li>
                ))
              )}
            </ul>
            {propertyId ? (
              <Link
                href={`${ROUTES.TASKS}?property=${encodeURIComponent(propertyId)}`}
                className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              >
                View all tasks
                <ChevronRight className="size-3.5" />
              </Link>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
    </TaskWorkflowRailSlotProvider>
  );
}
