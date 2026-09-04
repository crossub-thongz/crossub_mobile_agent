'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { ChevronRight, ClipboardList, DoorOpen, Home, Sparkles } from 'lucide-react';

import { InspectionDetailView } from '@/components/inspections/inspection-detail-view';
import { InspectionTaskDocuments } from '@/components/inspections/inspection-task-documents';
import { TaskPageActions } from '@/components/agent/tasks/task-page-actions';
import { TaskJobLoading, TaskJobUnavailable } from '@/components/agent/tasks/task-job-status';
import {
  TaskWorkflowRailSlot,
  TaskWorkflowRailSlotProvider,
} from '@/components/agent/tasks/task-workflow-rail-slot';
import { PortalBackLink } from '@/components/layout/portal-back-link';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { relatedPropertyJobHref } from '@/lib/property-job-href';
import { INSPECTION_TYPE_LABEL, INSPECTION_TYPE_SHORT } from '@/lib/inspections/presentation';
import {
  buildInspectionActivityEntries,
  buildInspectionDetailRows,
  inspectionTaskReference,
  resolveInspectionStatusBanner,
  type InspectionTaskTab,
} from '@/lib/inspection-task-detail';
import { buildPropertyOverviewJobRows } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { usePrimaryTenantName } from '@/lib/use-primary-tenant-name';
import { useResolvedInspection } from '@/lib/use-resolved-inspection';
import {
  cn,
  formatCurrency,
  formatDate,
  formatPropertyFullAddress,
  formatTime,
} from '@/lib/utils';

import { useWorkflowTourTabFocus } from '@/hooks/use-workflow-tour-tab-focus';

const TABS: { id: InspectionTaskTab; label: string }[] = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'details', label: 'Details' },
  { id: 'activity', label: 'Activity' },
  { id: 'documents', label: 'Documents' },
  { id: 'notes', label: 'Notes' },
];

function ActivityTimeline({
  entries,
}: {
  entries: ReturnType<typeof buildInspectionActivityEntries>;
}) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity recorded for this task yet.</p>;
  }

  return (
    <div className="inspection-task__activity-card relative rounded-2xl border v2-frosted-surface px-4">
      <span className="inspection-task__activity-line bg-border absolute" aria-hidden />
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
            <span className="relative z-10 mt-1.5 size-2.5 rounded-full bg-sky-600 ring-[3px] ring-card" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{entry.title}</p>
            {entry.detail ? (
              <p className="text-muted-foreground mt-1 text-xs">{entry.detail}</p>
            ) : null}
            <p className="text-muted-foreground mt-1 text-xs">{formatDate(entry.at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InspectionTaskDetailView({ inspectionId }: { inspectionId: string }) {
  const {
    inspections,
    properties,
    leasingRecords,
    leasingCycles,
    tenantSelections,
    maintenanceAll,
    rentReviews,
    vacating,
    tribunalCases,
    accounting,
  } = useAgentData();

  const [activeTab, setActiveTab] = useState<InspectionTaskTab>('workflow');
  useWorkflowTourTabFocus(setActiveTab, 'workflow');
  const showWorkflowTab = useCallback(() => setActiveTab('workflow'), []);
  const { inspection, resolveState } = useResolvedInspection(inspectionId);

  const propertyId = inspection?.propertyId;
  const property = properties.find((row) => row.id === propertyId) ?? null;
  const currentLease = leasingRecords.find(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );
  const tenantName = usePrimaryTenantName(property);

  const banner = useMemo(
    () => (inspection ? resolveInspectionStatusBanner(inspection) : null),
    [inspection],
  );
  const detailRows = useMemo(
    () => (inspection ? buildInspectionDetailRows(inspection) : []),
    [inspection],
  );
  const activityEntries = useMemo(
    () => (inspection ? buildInspectionActivityEntries(inspection) : []),
    [inspection],
  );

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
    return rows
      .filter((row) => !(row.kind === 'inspection' && row.id === inspection?.id))
      .slice(0, 4);
  }, [
    accounting,
    currentLease,
    inspection?.id,
    inspections,
    leasingCycles,
    maintenanceAll,
    propertyId,
    rentReviews,
    tenantSelections,
    tribunalCases,
    vacating,
  ]);

  if (resolveState === 'missing' || (resolveState !== 'pending' && !inspection)) {
    return (
      <TaskJobUnavailable
        title="Inspection job not found"
        description="This inspection may still be saving. Open it from Tasks in a moment."
      />
    );
  }

  if (!inspection || !banner) {
    return <TaskJobLoading label="Loading inspection…" />;
  }

  const address = property ? formatPropertyFullAddress(property) : inspection.propertyAddress;
  const taskRef = inspectionTaskReference(inspection);
  const createdLabel = inspection.createdAt ? formatDate(inspection.createdAt) : '—';
  const TypeIcon =
    inspection.type === 'OPEN' ? DoorOpen : inspection.type === 'ROUTINE' ? ClipboardList : Home;

  return (
    <TaskWorkflowRailSlotProvider onStepActivate={showWorkflowTab}>
    <div className="inspection-task px-4 py-5 lg:px-8 lg:py-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-700">
              <TypeIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  {INSPECTION_TYPE_LABEL[inspection.type]}
                </h1>
                <span
                  data-tour="workflow-case-badge"
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    banner.needsAction && 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                    !banner.needsAction &&
                      banner.statusLabel === 'Completed' &&
                      'bg-muted text-muted-foreground',
                    !banner.needsAction &&
                      banner.statusLabel !== 'Completed' &&
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                  )}
                >
                  {banner.needsAction
                    ? 'Need your action'
                    : banner.statusLabel === 'Completed'
                      ? banner.statusLabel
                      : 'CROS handling'}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{address}</p>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>Task type {INSPECTION_TYPE_SHORT[inspection.type]}</span>
                <span>Created {createdLabel}</span>
                <span>Reference {taskRef}</span>
              </div>
            </div>
          </div>
          <TaskPageActions propertyId={propertyId} reference={taskRef} />
        </div>
      </header>

      <section
        className={cn(
          'rounded-2xl border p-5',
          banner.needsAction
            ? 'inspection-task__status-card--action border-rose-500/20'
            : 'inspection-task__status-card border-sky-500/20',
        )}
        data-tour="workflow-status"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Current status
            </p>
            <h2
              className={cn(
                'mt-1 text-lg font-semibold',
                banner.needsAction ? 'text-rose-950 dark:text-rose-100' : 'text-sky-950 dark:text-sky-100',
              )}
            >
              {banner.title}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">{banner.subtitle}</p>
          </div>
          <div
            className={cn(
              'rounded-xl border v2-frosted-surface p-4',
              banner.needsAction ? 'border-rose-500/15' : 'border-sky-500/15',
            )}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={cn('size-4', banner.needsAction ? 'text-rose-600' : 'text-sky-600')} />
              <p className="text-sm font-semibold">CROS recommendation</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-sky-950/80 dark:text-sky-100/80">
              {banner.crosSummary}
            </p>
          </div>
        </div>
      </section>

      <TaskWorkflowRailSlot />

          <div className="border-b" data-tour="workflow-tabs">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-tour={`workflow-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'border-b-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition',
                    activeTab === tab.id
                      ? 'border-sky-600 text-sky-700'
                      : 'text-muted-foreground hover:text-foreground border-transparent',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={activeTab === 'workflow' ? undefined : 'hidden'} data-tour="workflow-action-panel">
            <InspectionDetailView inspectionId={inspection.id} />
          </div>

          {activeTab === 'details' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Task details</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {detailRows.map((row) => (
                  <div key={row.label}>
                    <dt className="text-muted-foreground text-xs">{row.label}</dt>
                    <dd className="mt-1 text-sm font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {activeTab === 'activity' ? <ActivityTimeline entries={activityEntries} /> : null}

          {activeTab === 'documents' ? <InspectionTaskDocuments inspection={inspection} /> : null}

          {activeTab === 'notes' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="text-muted-foreground mt-3 text-sm">
                {inspection.reportDeclineReason?.trim() ||
                  inspection.cancelReason?.trim() ||
                  'No notes recorded for this inspection yet.'}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto">
          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="text-sm font-semibold">Property</h3>
            <div className="mt-3 overflow-hidden rounded-xl border v2-frosted-surface">
              {property?.imageUrl ? (
                <div className="relative aspect-[16/10] w-full">
                  <Image src={property.imageUrl} alt={address} fill className="object-cover" unoptimized />
                </div>
              ) : null}
              <div className="p-3">
                <p className="text-sm font-semibold">{address}</p>
                <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {property?.leaseStatus === 'vacant' ? 'Vacant' : 'Occupied'}
                </span>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tenant</dt>
                    <dd className="font-medium">{tenantName}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Lease</dt>
                    <dd className="text-right font-medium">
                      {property?.leaseStart && property?.leaseEnd
                        ? `${formatDate(property.leaseStart)} – ${formatDate(property.leaseEnd)}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="font-medium">
                      {property && property.rentWeekly > 0
                        ? `${formatCurrency(property.rentWeekly)} / week`
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
                        <p className="text-sm font-semibold">{task.jobType}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{task.status}</p>
                      </div>
                      <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    </Link>
                  </li>
                ))
              )}
            </ul>
            <PortalBackLink className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline" />
          </section>
        </aside>
      </div>
    </div>
    </TaskWorkflowRailSlotProvider>
  );
}
