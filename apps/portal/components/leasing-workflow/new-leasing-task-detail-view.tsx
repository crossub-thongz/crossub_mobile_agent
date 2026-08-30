'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Home,
  Link2,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { TaskPageActions } from '@/components/agent/tasks/task-page-actions';
import { TaskJobLoading, TaskJobUnavailable } from '@/components/agent/tasks/task-job-status';
import {
  TaskWorkflowRailSlot,
  TaskWorkflowRailSlotProvider,
} from '@/components/agent/tasks/task-workflow-rail-slot';
import { LeasingWorkflowTimeline } from '@/components/leasing-workflow/leasing-workflow-timeline';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { PROPERTY_JOB_KIND_ICON } from '@/constants/property-jobs';
import {
  inspectionDetail,
  propertyDetail,
  ROUTES,
  tenantSelectionDetail,
} from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { relatedPropertyJobHref } from '@/lib/property-job-href';
import { resolveOnboardingTenant } from '@/lib/leasing/onboarding-display';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import {
  buildNewLeasingActivityEntries,
  buildNewLeasingDocumentGroups,
  buildNewLeasingLeaseDetailRows,
  buildNewLeasingRelatedTasks,
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
import { isCompletedLeasingCycle } from '@/lib/property-leasing-history';
import { workflowRentWeekly } from '@/lib/property-leasing-job';
import { useResolvedLeasingCycle } from '@/lib/use-resolved-leasing-cycle';
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
  { id: 'workflow', label: 'Workflow' },
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

function relatedTaskBadge(row: PropertyJobRow): { label: string; tone: 'neutral' | 'warn' } {
  const status = row.status.toLowerCase();
  if (
    status.includes('upcoming') ||
    status.includes('scheduled') ||
    status.includes('due') ||
    row.kind === 'rent_review'
  ) {
    return { label: 'Upcoming', tone: 'warn' };
  }
  return { label: 'In progress', tone: 'neutral' };
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
    <div className="new-leasing-task__activity-card relative rounded-2xl border v2-frosted-surface px-4">
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
  const router = useRouter();
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
    refresh,
    loading,
  } = useAgentData();
  const ensureDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const detail = useLeasingWorkflowStore((s) => s.getDetail);
  const { cycle, resolveState } = useResolvedLeasingCycle(cycleId);

  const [activeTab, setActiveTab] = useState<NewLeasingTaskTab>('workflow');
  const showWorkflowTab = useCallback(() => setActiveTab('workflow'), []);

  const propertyId = cycle?.propertyId ?? '';
  const property = properties.find((row) => row.id === propertyId) ?? null;
  const currentLease = leasingRecords.find(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );
  const rentWeekly = workflowRentWeekly({
    propertyRentWeekly: property?.rentWeekly ?? 0,
    tenantSelections,
    currentLease,
  });

  useEffect(() => {
    if (!property || !cycle) return;
    ensureDetail(propertyId, formatPropertyFullAddress(property), rentWeekly);
  }, [cycle, ensureDetail, property, propertyId, rentWeekly]);

  const leasingDetail = propertyId ? detail(propertyId) : null;

  const banner = useMemo(() => {
    if (!leasingDetail) return null;
    if (cycle && isCompletedLeasingCycle(cycle)) {
      return resolveNewLeasingStatusBanner({ ...leasingDetail, cycleActive: false });
    }
    return resolveNewLeasingStatusBanner(leasingDetail);
  }, [cycle, leasingDetail]);
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
  const applications = leasingDetail?.applicationsDetail ?? [];
  const applicantCount = applications.length;
  const documentGroups = useMemo(
    () => (leasingDetail ? buildNewLeasingDocumentGroups(leasingDetail) : []),
    [leasingDetail],
  );

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
    if (loading || resolveState === 'pending') {
      return <TaskJobLoading label="Loading leasing task…" />;
    }
    return (
      <TaskJobUnavailable
        title="Leasing job not found"
        description={
          apiConnected
            ? 'This leasing case could not be found. Open it from Tasks in a moment.'
            : 'Connect to the API to load leasing task details.'
        }
      />
    );
  }

  const address = formatPropertyFullAddress(property);
  const taskRef = newLeasingTaskReference(cycleId);
  const createdLabel = cycle.createdAt ? formatDate(cycle.createdAt) : '—';

  return (
    <TaskWorkflowRailSlotProvider onStepActivate={showWorkflowTab}>
    <div className="new-leasing-task px-4 py-5 lg:px-8 lg:py-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="bg-violet-500/12 text-violet-700 flex size-11 shrink-0 items-center justify-center rounded-2xl">
                  <Home className="size-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight">
                    New lease – {property.suburb ? `${property.address}` : property.address}
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm">{address}</p>
                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>Task ID {taskRef}</span>
                    <span>Created {createdLabel}</span>
                    <span>Task type Leasing</span>
                  </div>
                </div>
              </div>
              <TaskPageActions propertyId={propertyId} reference={taskRef} />
            </div>
          </header>

          {banner ? (
            <section className="new-leasing-task__status-card rounded-2xl border border-violet-500/20 p-5">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Current status
              </p>
              <h2 className="mt-1 text-lg font-semibold text-violet-950 dark:text-violet-100">
                {banner.title}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">{banner.subtitle}</p>
            </section>
          ) : null}

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
                    {tab.id === 'applicants' && applicantCount > 0 ? ` (${applicantCount})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className={activeTab === 'workflow' ? undefined : 'hidden'}>
              <section className="min-w-0">
                <LeasingWorkflowTimeline
                  propertyId={propertyId}
                  leasingCycleId={cycleId}
                  propertyAddress={address}
                  rentWeekly={rentWeekly}
                  hideSectionLabel
                  unifiedRail
                  onCaseClosed={() => {
                    void refresh().then(() => {
                      router.push(ROUTES.TASKS);
                    });
                  }}
                  onOpenInspectionCreated={(inspectionId) => {
                    router.push(inspectionDetail(inspectionId, fromProperty(propertyId, 'Tasks')));
                  }}
                />
              </section>
            </div>

            {activeTab === 'details' ? (
              <div className="space-y-5">
                <section className="rounded-2xl border v2-frosted-surface p-5">
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
                          'rounded-2xl border v2-frosted-surface p-4',
                          card.status === 'in_progress' &&
                            'border-violet-500/40 ring-1 ring-violet-500/20',
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
                {applications.length ? (
                  applications.map((application) => (
                    <article key={application.id} className="rounded-2xl border v2-frosted-surface p-4">
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
              <section className="space-y-6">
                {documentGroups.length > 0 ? (
                  documentGroups.map((group) => (
                    <div key={group.tab} className="space-y-3">
                      <h3 className="text-sm font-semibold">{group.tab}</h3>
                      {group.people.map((person) => (
                        <div key={person.id} className="space-y-2">
                          <p className="text-muted-foreground text-xs font-medium">
                            From {person.from}
                          </p>
                          {person.documents.map((doc) => (
                            <article
                              key={doc.id}
                              className="rounded-2xl border v2-frosted-surface p-4"
                            >
                              <p className="text-sm font-semibold">{doc.fileName}</p>
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
                          ))}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
                )}
              </section>
            ) : null}

            {activeTab === 'notes' ? (
              <section className="rounded-2xl border v2-frosted-surface p-5">
                <h3 className="text-sm font-semibold">Letting notes</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {leasingDetail?.rental.lettingNotes?.trim() ||
                    'No notes recorded for this letting yet.'}
                </p>
              </section>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto">
          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Home className="text-muted-foreground size-4" />
              Property &amp; tenancy
            </h3>
            <div className="mt-3 overflow-hidden rounded-xl border v2-frosted-surface">
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
                <p className="text-sm font-semibold leading-snug">{address}</p>
                <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {property.leaseStatus === 'vacant' ? 'Vacant' : 'Occupied'}
                </span>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Current tenant</dt>
                    <dd className="font-medium">
                      {property.tenantName || currentLease?.approvedTenant || '—'}
                    </dd>
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
                      {property.rentWeekly > 0
                        ? `${formatCurrency(property.rentWeekly)} / week`
                        : '—'}
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
                  className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  View property
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {tenant ? (
            <section className="rounded-2xl border v2-frosted-surface p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <User className="text-muted-foreground size-4" />
                Applicant
              </h3>
              <div className="mt-3 flex items-start gap-3">
                <span className="bg-violet-100 text-violet-700 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {initials(tenant.applicant)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{tenant.applicant}</p>
                  <span className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Pre-approved
                  </span>
                  <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0" />
                      <span className="truncate">{tenant.phone || '—'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{tenant.email || '—'}</span>
                    </p>
                  </div>
                </div>
              </div>
              {tenant.id ? (
                <Link
                  href={tenantSelectionDetail(tenant.id, fromProperty(propertyId, 'Tasks'))}
                  className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  View applicant profile
                  <ChevronRight className="size-3.5" />
                </Link>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="text-muted-foreground size-4" />
              Related tasks
            </h3>
            <ul className="mt-3 space-y-2">
              {relatedTasks.length === 0 ? (
                <li className="text-muted-foreground text-sm">No other active tasks.</li>
              ) : (
                relatedTasks.map((task) => {
                  const Icon = PROPERTY_JOB_KIND_ICON[task.kind];
                  const badge = relatedTaskBadge(task);
                  return (
                    <li key={task.id}>
                      <Link
                        href={relatedPropertyJobHref(task, propertyId)}
                        className="hover:bg-muted/40 v2-frosted-surface flex items-start gap-2.5 rounded-xl border p-3 transition"
                      >
                        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{task.jobType}</span>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                badge.tone === 'warn'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {badge.label}
                            </span>
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-xs">
                            {task.status}
                            {task.date && task.date !== '—' ? ` · ${task.date}` : ''}
                          </span>
                        </span>
                        <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
            <Link
              href={`${ROUTES.TASKS}?property=${encodeURIComponent(propertyId)}`}
              className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              View all tasks
              <ChevronRight className="size-3.5" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
    </TaskWorkflowRailSlotProvider>
  );
}
