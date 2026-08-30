'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { ChevronRight, FileText } from 'lucide-react';

import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { TaskPageActions } from '@/components/agent/tasks/task-page-actions';
import {
  TaskWorkflowRailSlot,
  TaskWorkflowRailSlotProvider,
} from '@/components/agent/tasks/task-workflow-rail-slot';
import { EndLeasingAgentWorkflowPanel } from '@/components/end-leasing/end-leasing-agent-workflow-panel';
import { SettlementDeductionDialog } from '@/components/end-leasing/settlement-deduction-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { inspectionDetail, propertyDetail, ROUTES } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { relatedPropertyJobHref } from '@/lib/property-job-href';
import {
  buildEndLeasingActivityEntries,
  buildEndLeasingLeaseDetailRows,
  buildEndLeasingRelatedTasks,
  buildEndLeasingWhatsNextCards,
  buildEndLeasingWorkflowModel,
  endLeasingTaskReference,
  resolveEndLeasingStatusBanner,
  type EndLeasingTaskTab,
} from '@/lib/end-leasing-task-detail';
import { buildPropertyOverviewJobRows } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { endLeasingVacateDate } from '@/lib/end-leasing/agent-workflow-model';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { resolvePropertyDisplayAddress } from '@/lib/property-address';
import {
  cn,
  formatCurrency,
  formatDate,
  formatPropertyFullAddress,
  formatTime,
} from '@/lib/utils';

import './end-leasing-task-detail.css';

const TABS: { id: EndLeasingTaskTab; label: string }[] = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'details', label: 'Details' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'activity', label: 'Activity' },
  { id: 'documents', label: 'Documents' },
  { id: 'notes', label: 'Notes' },
];

function ActivityTimeline({
  entries,
}: {
  entries: ReturnType<typeof buildEndLeasingActivityEntries>;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No activity recorded for this task yet.</p>
    );
  }

  return (
    <div className="end-leasing-task__activity-card relative rounded-2xl border v2-frosted-surface px-4">
      <span className="end-leasing-task__activity-line bg-border absolute" aria-hidden />
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
            <span className="bg-orange-600 ring-card relative z-10 mt-1.5 size-2.5 rounded-full ring-[3px]" />
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

export function EndLeasingTaskDetailView({
  caseData,
}: {
  caseData: TerminationCaseDetail;
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

  const [activeTab, setActiveTab] = useState<EndLeasingTaskTab>('workflow');
  const showWorkflowTab = useCallback(() => setActiveTab('workflow'), []);

  const propertyId = caseData.propertyId ?? '';
  const property = properties.find((row) => row.id === propertyId) ?? null;
  const currentLease = leasingRecords.find(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );

  const workflow = useMemo(() => buildEndLeasingWorkflowModel(caseData), [caseData]);
  const banner = useMemo(
    () => resolveEndLeasingStatusBanner(caseData, workflow),
    [caseData, workflow],
  );
  const leaseRows = useMemo(() => buildEndLeasingLeaseDetailRows(caseData), [caseData]);
  const whatsNext = useMemo(
    () => buildEndLeasingWhatsNextCards(caseData, workflow),
    [caseData, workflow],
  );
  const activityEntries = useMemo(
    () => buildEndLeasingActivityEntries(caseData),
    [caseData],
  );

  const displayAddress = resolvePropertyDisplayAddress(
    properties,
    propertyId,
    formatPropertyFullAddress({
      address: caseData.property.address,
      suburb: caseData.property.suburb,
    }),
  );
  const tenantName = caseData.tenant.name?.trim() || property?.tenantName?.trim() || '';
  const vacateDate = endLeasingVacateDate(caseData);

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
    return buildEndLeasingRelatedTasks(rows, caseData.id);
  }, [
    accounting,
    caseData.id,
    currentLease,
    inspections,
    leasingCycles,
    maintenanceAll,
    propertyId,
    rentReviews,
    tenantSelections,
    tribunalCases,
    vacating,
  ]);

  const inspectionCount =
    (caseData.inspection.inspectionId ? 1 : 0) +
    (caseData.inspection.ingoingInspectionId ? 1 : 0);
  const taskRef = endLeasingTaskReference(caseData.id);
  const createdLabel = caseData.createdAt ? formatDate(caseData.createdAt) : '—';

  return (
    <TaskWorkflowRailSlotProvider onStepActivate={showWorkflowTab}>
    <div className="end-leasing-task px-4 py-5 lg:px-8 lg:py-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-700">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">
                End of lease – {caseData.property.address}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">{displayAddress}</p>
              {tenantName || vacateDate ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {tenantName}
                  {tenantName && vacateDate ? ' · ' : ''}
                  {vacateDate ? `Vacate ${formatDate(vacateDate)}` : ''}
                </p>
              ) : null}
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>Task ID {taskRef}</span>
                <span>Created {createdLabel}</span>
                <span>Task type End of leasing</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:max-w-xs">
                <div>
                  <p className="text-muted-foreground">Bond held</p>
                  <p className="font-medium tabular-nums">{formatCurrency(caseData.bondHeld)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Refund</p>
                  <p className="font-medium tabular-nums">{formatCurrency(caseData.refundAmount)}</p>
                </div>
              </div>
            </div>
          </div>
          <TaskPageActions propertyId={propertyId || null} reference={taskRef} />
        </div>
      </header>

      {banner ? (
        <section className="end-leasing-task__status-card rounded-2xl border border-orange-500/20 p-5">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Current status
          </p>
          <h2 className="mt-1 text-lg font-semibold text-orange-950 dark:text-orange-100">
            {banner.title}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">{banner.subtitle}</p>
        </section>
      ) : null}

          <TaskWorkflowRailSlot />

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
                      ? 'border-orange-600 text-orange-700'
                      : 'text-muted-foreground hover:text-foreground border-transparent',
                  )}
                >
                  {tab.label}
                  {tab.id === 'inspections' && inspectionCount > 0
                    ? ` (${inspectionCount})`
                    : ''}
                </button>
              ))}
            </div>
          </div>

          <div className={activeTab === 'workflow' ? undefined : 'hidden'}>
            <EndLeasingAgentWorkflowPanel caseData={caseData} />
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-5">
              <section className="rounded-2xl border v2-frosted-surface p-5">
                <h3 className="text-sm font-semibold">Lease &amp; notice details</h3>
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
                <h3 className="text-sm font-semibold">Upcoming</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {whatsNext.map((card) => (
                    <article
                      key={card.id}
                      className={cn(
                        'rounded-2xl border v2-frosted-surface p-4',
                        card.status === 'in_progress' && 'border-orange-500/40 ring-1 ring-orange-500/20',
                        card.status === 'upcoming' && 'border-orange-500/25',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{card.title}</p>
                          {card.detail ? (
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                              {card.detail}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            card.status === 'in_progress' && 'bg-orange-100 text-orange-700',
                            card.status === 'upcoming' && 'bg-orange-50 text-orange-700',
                            card.status === 'pending' && 'bg-muted text-muted-foreground',
                            card.status === 'complete' && 'bg-emerald-100 text-emerald-700',
                          )}
                        >
                          {card.status === 'in_progress'
                            ? 'In progress'
                            : card.status === 'upcoming'
                              ? 'Upcoming'
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
                <ActivityTimeline entries={activityEntries.slice(0, 4)} />
              </section>
            </div>
          ) : null}

          {activeTab === 'inspections' ? (
            <section className="space-y-3">
              {caseData.inspection.inspectionId ? (
                <article className="rounded-2xl border v2-frosted-surface p-4">
                  <p className="text-sm font-semibold">Outgoing inspection</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {caseData.inspection.inspectionDate
                      ? formatDate(caseData.inspection.inspectionDate)
                      : 'Date TBC'}
                    {caseData.inspection.inspectorName
                      ? ` · ${caseData.inspection.inspectorName}`
                      : ''}
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">{caseData.inspection.status}</p>
                  <Link
                    href={inspectionDetail(
                      caseData.inspection.inspectionId,
                      propertyId ? fromProperty(propertyId, 'Tasks') : undefined,
                    )}
                    className="text-primary mt-3 inline-block text-xs font-semibold hover:underline"
                  >
                    Open inspection
                  </Link>
                </article>
              ) : null}
              {caseData.inspection.ingoingInspectionId ? (
                <article className="rounded-2xl border v2-frosted-surface p-4">
                  <p className="text-sm font-semibold">Ingoing inspection</p>
                  <Link
                    href={inspectionDetail(
                      caseData.inspection.ingoingInspectionId,
                      propertyId ? fromProperty(propertyId, 'Tasks') : undefined,
                    )}
                    className="text-primary mt-2 inline-block text-xs font-semibold hover:underline"
                  >
                    Open ingoing report
                  </Link>
                </article>
              ) : null}
              {!caseData.inspection.inspectionId && !caseData.inspection.ingoingInspectionId ? (
                <p className="text-muted-foreground text-sm">No inspections linked yet.</p>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'activity' ? <ActivityTimeline entries={activityEntries} /> : null}

          {activeTab === 'documents' ? (
            <section className="space-y-3">
              {caseData.documents.length > 0 ? (
                caseData.documents.map((doc) => (
                  <article key={doc.id} className="rounded-2xl border v2-frosted-surface p-4">
                    <p className="text-sm font-semibold">{doc.name}</p>
                    {doc.uploadedAt ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Uploaded {formatDate(doc.uploadedAt)}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
              )}
            </section>
          ) : null}

          {activeTab === 'notes' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Case notes</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {caseData.terminationReason?.trim() ||
                  caseData.cancellationReason?.trim() ||
                  'No notes recorded for this end-leasing case yet.'}
              </p>
            </section>
          ) : null}

          {propertyId ? (
            <div className={activeTab === 'workflow' ? 'hidden' : undefined}>
              <CaseContactActions propertyId={propertyId} caseLabel="End leasing" />
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto">
          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="text-sm font-semibold">Property</h3>
            <div className="mt-3 overflow-hidden rounded-xl border v2-frosted-surface">
              {property?.imageUrl ? (
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={property.imageUrl}
                    alt={displayAddress}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="p-3">
                <p className="text-sm font-semibold">{displayAddress}</p>
                <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {property?.leaseStatus === 'vacant' ? 'Vacant' : 'Occupied'}
                </span>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tenant</dt>
                    <dd className="font-medium">{caseData.tenant.name || property?.tenantName || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Lease period</dt>
                    <dd className="text-right font-medium">
                      {property?.leaseStart && property?.leaseEnd
                        ? `${formatDate(property.leaseStart)} – ${formatDate(property.leaseEnd)}`
                        : caseData.leaseStartDate && caseData.leaseEndDate
                          ? `${formatDate(caseData.leaseStartDate)} – ${formatDate(caseData.leaseEndDate)}`
                          : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="font-medium">
                      {property && property.rentWeekly > 0
                        ? `${formatCurrency(property.rentWeekly)}/week`
                        : '—'}
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
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                {initials(caseData.tenant.name || 'T')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{caseData.tenant.name}</p>
                <span className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Current tenant
                </span>
                <p className="text-muted-foreground mt-2 text-xs">{caseData.tenant.phone || '—'}</p>
                <p className="text-muted-foreground text-xs">{caseData.tenant.email || '—'}</p>
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

      <SettlementDeductionDialog caseData={caseData} />
    </div>
    </TaskWorkflowRailSlotProvider>
  );
}
