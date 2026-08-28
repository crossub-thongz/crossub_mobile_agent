'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Home,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';

import { LeasingContractDialog } from '@/components/leasing-workflow/leasing-contract-dialog';
import { LeasingLifecycleTabs } from '@/components/leasing-workflow/leasing-lifecycle-tabs';
import { LeasingWorkflowTimeline } from '@/components/leasing-workflow/leasing-workflow-timeline';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  inspectionDetail,
  leasingDetail,
  maintenanceDetail,
  propertyDetail,
  rentReviewDetail,
  tenantSelectionDetail,
  vacatingDetail,
} from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { LEASING_LIFECYCLE_STEP } from '@/lib/leasing/constants';
import { resolveOnboardingTenant } from '@/lib/leasing/onboarding-display';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import {
  buildNewLeasingActivityEntries,
  buildNewLeasingLeaseDetailRows,
  buildNewLeasingRelatedTasks,
  buildNewLeasingTaskStages,
  buildNewLeasingWhatsNextCards,
  newLeasingTaskReference,
  resolveNewLeasingStatusBanner,
  type NewLeasingTaskTab,
} from '@/lib/new-leasing-task-detail';
import {
  buildPropertyOverviewJobRows,
  type PropertyJobRow,
} from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { workflowRentWeekly } from '@/lib/property-leasing-job';
import { useLeasingCycleLiveSync } from '@/lib/use-leasing-cycle-live-sync';
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPropertyFullAddress,
  formatTime,
} from '@/lib/utils';

import './new-leasing-task-detail.css';

const TABS: { id: NewLeasingTaskTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'activity', label: 'Activity' },
  { id: 'documents', label: 'Documents' },
  { id: 'notes', label: 'Notes' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function relatedTaskHref(row: PropertyJobRow, propertyId: string): string {
  const nav = fromProperty(propertyId, 'Tasks');
  switch (row.kind) {
    case 'maintenance':
      return maintenanceDetail(row.id, nav);
    case 'inspection':
      return inspectionDetail(row.id, nav);
    case 'rent_review':
      return rentReviewDetail(row.id, nav);
    case 'end_leasing':
      return vacatingDetail(row.id, nav);
    case 'leasing':
      return leasingDetail(row.id, nav);
    default:
      return propertyDetail(propertyId);
  }
}

function TaskProgressRail({
  stages,
}: {
  stages: ReturnType<typeof buildNewLeasingTaskStages>;
}) {
  return (
    <div className="new-leasing-task__progress overflow-x-auto pb-1">
      <div className="flex min-w-[52rem] items-start gap-0 px-1">
        {stages.map((stage, index) => (
          <div key={stage.label} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {index > 0 ? (
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    stage.state === 'pending' && stages[index - 1]?.state === 'pending'
                      ? 'bg-border'
                      : 'bg-emerald-500',
                  )}
                />
              ) : (
                <span className="flex-1" />
              )}
              <span
                className={cn(
                  'relative flex size-7 shrink-0 items-center justify-center rounded-full border-2',
                  stage.state === 'complete' && 'border-emerald-500 bg-emerald-500 text-white',
                  stage.state === 'current' && 'border-violet-600 bg-white',
                  stage.state === 'pending' && 'border-border bg-white',
                )}
              >
                {stage.state === 'complete' ? (
                  <Check className="size-3.5" />
                ) : stage.state === 'current' ? (
                  <span className="size-2.5 rounded-full bg-violet-600" />
                ) : null}
              </span>
              {index < stages.length - 1 ? (
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    stage.state === 'complete' ? 'bg-emerald-500' : 'bg-border',
                  )}
                />
              ) : (
                <span className="flex-1" />
              )}
            </div>
            <p
              className={cn(
                'mt-2 px-1 text-center text-[11px] font-medium leading-tight',
                stage.state === 'current' ? 'text-violet-700' : 'text-muted-foreground',
              )}
            >
              {stage.label}
            </p>
            {stage.state === 'current' ? (
              <span className="mt-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                Current
              </span>
            ) : stage.dateLabel ? (
              <span className="text-muted-foreground mt-1 text-[10px]">{stage.dateLabel}</span>
            ) : stage.state === 'pending' ? (
              <span className="text-muted-foreground mt-1 text-[10px]">Pending</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTimeline({
  entries,
}: {
  entries: ReturnType<typeof buildNewLeasingActivityEntries>;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No activity recorded for this task yet.</p>
    );
  }

  return (
    <div className="new-leasing-task__activity-card relative rounded-2xl border bg-card px-4">
      <span className="new-leasing-task__activity-line bg-border absolute" aria-hidden />
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

export function NewLeasingTaskDetailView({ cycleId }: { cycleId: string }) {
  const {
    properties,
    leasingCycles,
    leasingRecords,
    tenantSelections,
    maintenanceAll,
    inspections,
    rentReviews,
    vacating,
    tribunalCases,
    accounting,
    apiConnected,
  } = useAgentData();
  const setContractDialogOpen = useLeasingWorkflowStore((s) => s.setContractDialogOpen);
  const setActiveStep = useLeasingWorkflowStore((s) => s.setActiveStep);
  const ensureDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const detail = useLeasingWorkflowStore((s) => s.getDetail);

  const [activeTab, setActiveTab] = useState<NewLeasingTaskTab>('details');
  const workflowRef = useRef<HTMLDivElement | null>(null);

  const cycle = useMemo(
    () => leasingCycles.find((row) => row.id === cycleId) ?? null,
    [leasingCycles, cycleId],
  );
  const propertyId = cycle?.propertyId ?? '';
  const property = properties.find((row) => row.id === propertyId) ?? null;
  const currentLease = leasingRecords.find(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );
  const rentWeekly = workflowRentWeekly({
    propertyRentWeekly: property?.rentWeekly,
    tenantSelections,
    currentLease,
  });

  useLeasingCycleLiveSync(propertyId, cycleId, apiConnected);

  useEffect(() => {
    if (!property || !cycle) return;
    ensureDetail(propertyId, formatPropertyFullAddress(property), rentWeekly);
  }, [cycle, ensureDetail, property, propertyId, rentWeekly]);

  const leasingDetail = propertyId ? detail(propertyId) : null;

  const stages = useMemo(
    () => (leasingDetail ? buildNewLeasingTaskStages(leasingDetail) : []),
    [leasingDetail],
  );
  const banner = useMemo(
    () => (leasingDetail ? resolveNewLeasingStatusBanner(leasingDetail) : null),
    [leasingDetail],
  );
  const leaseRows = useMemo(
    () => (property && leasingDetail ? buildNewLeasingLeaseDetailRows(property, leasingDetail) : []),
    [leasingDetail, property],
  );
  const whatsNext = useMemo(
    () => (leasingDetail ? buildNewLeasingWhatsNextCards(leasingDetail) : []),
    [leasingDetail],
  );
  const activityEntries = useMemo(
    () => (leasingDetail ? buildNewLeasingActivityEntries(leasingDetail) : []),
    [leasingDetail],
  );
  const tenant = leasingDetail ? resolveOnboardingTenant(leasingDetail) : null;
  const applicantCount = leasingDetail?.applications.length ?? 0;

  const relatedTasks = useMemo(() => {
    if (!property) return [];
    const leasingCases = buildPropertyLeasingWorkflowCases({
      propertyId,
      leasingCycles,
      tenantSelections,
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
    return buildNewLeasingRelatedTasks(rows, cycleId);
  }, [
    accounting,
    currentLease,
    cycleId,
    inspections,
    leasingCycles,
    maintenanceAll,
    property,
    propertyId,
    rentReviews,
    tenantSelections,
    tribunalCases,
    vacating,
  ]);

  if (!cycle || !property) {
    return (
      <div className="rounded-2xl border bg-card px-4 py-10 text-center">
        <p className="text-sm font-medium">Loading leasing task…</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {apiConnected
            ? 'This leasing case could not be found.'
            : 'Connect to the API to load leasing task details.'}
        </p>
      </div>
    );
  }

  const address = formatPropertyFullAddress(property);
  const taskRef = newLeasingTaskReference(cycleId);
  const createdLabel = cycle.createdAt ? formatDate(cycle.createdAt) : '—';

  const scrollToWorkflow = () => {
    setActiveStep(propertyId, LEASING_LIFECYCLE_STEP.ONBOARDING);
    workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="new-leasing-task space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-violet-500/12 text-violet-700 flex size-11 shrink-0 items-center justify-center rounded-2xl">
              <Home className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  New lease – {property.suburb ? `${property.address}` : property.address}
                </h1>
                {banner?.needsAction ? (
                  <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    Need your action
                  </span>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{address}</p>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>Task ID {taskRef}</span>
                <span>Created {createdLabel}</span>
                <span>Task type Leasing</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border bg-card px-3 py-2 text-sm font-semibold"
            >
              Actions
            </button>
            <button
              type="button"
              className="text-muted-foreground rounded-xl border p-2"
              aria-label="More options"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {banner ? (
        <section className="new-leasing-task__status-card rounded-2xl border border-violet-500/20 bg-violet-50 p-5 dark:bg-violet-950/20">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Current status
              </p>
              <h2 className="mt-1 text-lg font-semibold text-violet-950 dark:text-violet-100">
                {banner.title}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">{banner.subtitle}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setContractDialogOpen(true)}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Review lease
                </button>
                <button
                  type="button"
                  onClick={scrollToWorkflow}
                  className="rounded-xl border border-violet-600 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:bg-transparent"
                >
                  Send lease to tenant
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-violet-500/15 bg-white/70 p-4 dark:bg-card/60">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-600" />
                <p className="text-sm font-semibold">CROS summary</p>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-violet-950/80 dark:text-violet-100/80">
                {banner.crosSummary.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {stages.length > 0 ? (
        <section className="rounded-2xl border bg-card p-4">
          <TaskProgressRail stages={stages} />
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
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
                  {tab.id === 'applicants' && applicantCount > 0 ? ` (${applicantCount})` : ''}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-5">
              <section className="rounded-2xl border bg-card p-5">
                <h3 className="text-sm font-semibold">Lease details</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {leaseRows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-muted-foreground text-xs">{row.label}</dt>
                      <dd className="mt-1 text-sm font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold">What&apos;s next</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {whatsNext.map((card) => (
                    <article
                      key={card.title}
                      className={cn(
                        'rounded-2xl border bg-card p-4',
                        card.status === 'in_progress' && 'border-violet-500/40 ring-1 ring-violet-500/20',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{card.title}</p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            card.status === 'in_progress' && 'bg-violet-100 text-violet-700',
                            card.status === 'pending' && 'bg-muted text-muted-foreground',
                            card.status === 'complete' && 'bg-emerald-100 text-emerald-700',
                          )}
                        >
                          {card.status === 'in_progress'
                            ? 'In progress'
                            : card.status === 'complete'
                              ? 'Complete'
                              : 'Pending'}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

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
                <ActivityTimeline entries={activityEntries} />
              </section>
            </div>
          ) : null}

          {activeTab === 'applicants' ? (
            <section className="space-y-3">
              {leasingDetail?.applications.length ? (
                leasingDetail.applications.map((application) => (
                  <article key={application.id} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{application.applicant}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Submitted {formatDateTime(application.submittedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {application.agentDecision}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No applicants yet.</p>
              )}
            </section>
          ) : null}

          {activeTab === 'activity' ? <ActivityTimeline entries={activityEntries} /> : null}

          {activeTab === 'documents' ? (
            <section className="space-y-3">
              {leasingDetail?.applications.flatMap((application) =>
                (application.documents ?? []).map((doc) => (
                  <article key={`${application.id}-${doc.fileName}`} className="rounded-2xl border bg-card p-4">
                    <p className="text-sm font-semibold">{doc.fileName}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{application.applicant}</p>
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary mt-2 inline-block text-xs font-semibold hover:underline"
                      >
                        View document
                      </a>
                    ) : null}
                  </article>
                )),
              )}
              {!leasingDetail?.applications.some((app) => (app.documents ?? []).length > 0) ? (
                <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'notes' ? (
            <section className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold">Letting notes</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {leasingDetail?.rental.lettingNotes?.trim() || 'No notes recorded for this letting yet.'}
              </p>
            </section>
          ) : null}

          <section ref={workflowRef} className="rounded-2xl border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold">Workflow</h3>
            {leasingDetail ? (
              <LeasingLifecycleTabs
                detail={leasingDetail}
                leasingCycleId={cycleId}
              />
            ) : (
              <LeasingWorkflowTimeline
                propertyId={propertyId}
                leasingCycleId={cycleId}
                propertyAddress={address}
                rentWeekly={rentWeekly}
                hideSectionLabel
              />
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Property &amp; tenancy</h3>
            <div className="mt-3 overflow-hidden rounded-xl border bg-muted/30">
              {property.imageUrl ? (
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
                  {property.leaseStatus === 'vacant' ? 'Vacant' : 'Occupied'}
                </span>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Current tenant</dt>
                    <dd className="font-medium">{property.tenantName || currentLease?.approvedTenant || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Lease period</dt>
                    <dd className="text-right font-medium">
                      {property.leaseStart && property.leaseEnd
                        ? `${formatDate(property.leaseStart)} – ${formatDate(property.leaseEnd)}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="font-medium">
                      {property.rentWeekly > 0 ? `${formatCurrency(property.rentWeekly)}/week` : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent status</dt>
                    <dd className="font-medium text-emerald-700">
                      {property.rentPaidUntil
                        ? `Paid up to ${formatDate(property.rentPaidUntil)}`
                        : '—'}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={propertyDetail(propertyId)}
                  className="text-primary mt-3 inline-flex text-xs font-semibold hover:underline"
                >
                  View property
                </Link>
              </div>
            </div>
          </section>

          {tenant ? (
            <section className="rounded-2xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Applicant</h3>
              <div className="mt-3 flex items-start gap-3">
                <span className="bg-violet-100 text-violet-700 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {initials(tenant.applicant)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{tenant.applicant}</p>
                  <span className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Pre-approved
                  </span>
                  <p className="text-muted-foreground mt-2 text-xs">{tenant.phone || '—'}</p>
                  <p className="text-muted-foreground text-xs">{tenant.email || '—'}</p>
                </div>
              </div>
              {tenant.id ? (
                <Link
                  href={tenantSelectionDetail(tenant.id)}
                  className="text-primary mt-3 inline-flex text-xs font-semibold hover:underline"
                >
                  View applicant profile
                </Link>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Related tasks</h3>
            <ul className="mt-3 space-y-3">
              {relatedTasks.length === 0 ? (
                <li className="text-muted-foreground text-sm">No other active tasks.</li>
              ) : (
                relatedTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={relatedTaskHref(task, propertyId)}
                      className="hover:bg-muted/40 flex items-start justify-between gap-3 rounded-xl border p-3 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{task.jobType}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{task.status}</p>
                      </div>
                      <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </aside>
      </div>

      {leasingDetail ? (
        <LeasingContractDialog
          detail={leasingDetail}
          cycleId={cycleId}
          apiConnected={apiConnected}
        />
      ) : null}
    </div>
  );
}
