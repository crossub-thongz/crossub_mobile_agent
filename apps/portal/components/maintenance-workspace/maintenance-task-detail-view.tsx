'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Sparkles,
  Star,
  Wrench,
} from 'lucide-react';

import { WorkspaceChatPanel } from '@/components/maintenance-workspace/workspace-chat-panel';
import { MaintenanceAgentWorkflowPanel } from '@/components/maintenance/maintenance-agent-workflow-panel';
import { MaintenanceGetQuotePanel } from '@/components/maintenance/maintenance-get-quote-panel';
import { MaintenanceTaskDocuments } from '@/components/maintenance/maintenance-task-documents';
import { TaskPageActions } from '@/components/agent/tasks/task-page-actions';
import {
  TaskWorkflowRailSlot,
  TaskWorkflowRailSlotProvider,
} from '@/components/agent/tasks/task-workflow-rail-slot';
import { PortalBackLink } from '@/components/layout/portal-back-link';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, vacatingDetail } from '@/constants/routes';
import { fromTasks } from '@/lib/detail-navigation';
import { relatedPropertyJobHref } from '@/lib/property-job-href';
import {
  buildMaintenanceActivityEntries,
  buildMaintenanceJobDetailRows,
  buildMaintenanceQuoteCards,
  buildMaintenanceWorkflowContext,
  maintenanceTaskReference,
  maintenanceDocumentCount,
  quotationCount,
  resolveMaintenanceStatusBanner,
  type MaintenanceTaskTab,
} from '@/lib/maintenance-task-detail';
import { buildPropertyOverviewJobRows } from '@/lib/property-job-rows';
import { isEndLeasingSpawnedMaintenance } from '@/lib/property-maintenance-history';
import { requiresContractorFlow } from '@/lib/maintenance/agent-workflow-model';
import {
  isTenantRejectedMaintenance,
  TENANT_REJECTED_BADGE_CLASS,
  TENANT_REJECTED_LABEL,
  tenantRejectionTitle,
} from '@/lib/maintenance/tenant-rejected';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import type {
  ApiMaintenanceAttachment,
  ApiMaintenanceRequest,
  ApiMaintenanceState,
  ApiQuotation,
} from '@/lib/crossub-api/types';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import type { MaintenanceRequest, Property } from '@/lib/types';
import {
  cn,
  formatCurrency,
  formatDate,
  formatPropertyFullAddress,
  formatTime,
} from '@/lib/utils';

import './maintenance-task-detail.css';

const TABS: { id: MaintenanceTaskTab; label: string }[] = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'details', label: 'Details' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'activity', label: 'Activity' },
  { id: 'documents', label: 'Documents' },
  { id: 'notes', label: 'Notes' },
  { id: 'messages', label: 'Messages' },
];

function ActivityTimeline({
  entries,
}: {
  entries: ReturnType<typeof buildMaintenanceActivityEntries>;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No activity recorded for this task yet.</p>
    );
  }

  return (
    <div className="maintenance-task__activity-card relative rounded-2xl border v2-frosted-surface px-4">
      <span className="maintenance-task__activity-line bg-border absolute" aria-hidden />
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
            <span className="bg-rose-600 ring-card relative z-10 mt-1.5 size-2.5 rounded-full ring-[3px]" />
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

export function MaintenanceTaskDetailView({
  item,
  property,
  workspaceCase,
  quoteAmount,
  contractorName,
  quoteExpiry,
  recommendation,
  syncing,
  assignedToName,
  attachments = [],
  apiConnected = true,
  onCaseUpdated,
  contractors = [],
  quotations = [],
  workflowRequest = null,
  maintenanceReminders = [],
}: {
  item: MaintenanceRequest;
  property?: Property | null;
  workspaceCase: MaintenanceWorkspaceCase;
  quoteAmount?: number;
  contractorName?: string;
  quoteExpiry?: string;
  recommendation?: string;
  syncing?: boolean;
  assignedToName?: string | null;
  attachments?: ApiMaintenanceAttachment[];
  apiConnected?: boolean;
  onCaseUpdated?: () => Promise<void>;
  contractors?: Array<{ id: string; name: string }>;
  quotations?: ApiQuotation[];
  workflowRequest?: ApiMaintenanceRequest | null;
  maintenanceReminders?: ApiMaintenanceState['maintenanceReminders'];
}) {
  const router = useRouter();
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

  const [activeTab, setActiveTab] = useState<MaintenanceTaskTab>('workflow');
  const pageRef = useRef<HTMLDivElement | null>(null);
  const showWorkflowTab = useCallback(() => setActiveTab('workflow'), []);

  useEffect(() => {
    let node: HTMLElement | null = pageRef.current;
    while (node) {
      if (node.tagName === 'MAIN') {
        node.scrollTop = 0;
        break;
      }
      node = node.parentElement;
    }
    document.scrollingElement && (document.scrollingElement.scrollTop = 0);
  }, [activeTab, item.id]);

  const propertyId = item.propertyId;
  const parentEndLeasing = useMemo(() => {
    if (!isEndLeasingSpawnedMaintenance(item)) return null;
    const forProperty = vacating.filter((row) => row.propertyId === propertyId);
    if (forProperty.length === 0) return null;
    const open = forProperty.filter((row) => {
      const status = (row.apiStatus ?? '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    });
    const pool = open.length > 0 ? open : forProperty;
    return (
      [...pool].sort(
        (a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''),
      )[0] ?? null
    );
  }, [item, propertyId, vacating]);

  useEffect(() => {
    if (!parentEndLeasing) return;
    router.replace(vacatingDetail(parentEndLeasing.id, fromTasks()));
  }, [parentEndLeasing, router]);

  const resolvedProperty =
    property ?? properties.find((row) => row.id === propertyId) ?? null;
  const evidenceAttachmentCount = useMemo(
    () =>
      attachments.filter(
        (a) => a.maintenanceRequestId === item.id && a.kind === 'initial_evidence',
      ).length,
    [attachments, item.id],
  );
  const workflowCtx = useMemo(
    () => buildMaintenanceWorkflowContext(item, workspaceCase, evidenceAttachmentCount),
    [evidenceAttachmentCount, item, workspaceCase],
  );
  const contractorFlow = requiresContractorFlow(workflowCtx);
  const tenantRejected = isTenantRejectedMaintenance(item);
  const visibleTabs = useMemo(
    () => TABS.filter((tab) => tab.id !== 'quotes' || contractorFlow),
    [contractorFlow],
  );

  useEffect(() => {
    if (!contractorFlow && activeTab === 'quotes') setActiveTab('workflow');
  }, [activeTab, contractorFlow]);

  const currentLease = leasingRecords.find(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );

  const banner = useMemo(
    () =>
      resolveMaintenanceStatusBanner({
        workspaceCase,
        item,
        quoteAmount,
        contractorName,
        recommendation,
      }),
    [contractorName, item, quoteAmount, recommendation, workspaceCase],
  );
  const jobRows = useMemo(
    () =>
      buildMaintenanceJobDetailRows({
        workspaceCase,
        item,
        property: resolvedProperty,
      }),
    [item, resolvedProperty, workspaceCase],
  );
  const quoteCards = useMemo(
    () => buildMaintenanceQuoteCards(workspaceCase, contractorName, quoteAmount),
    [contractorName, quoteAmount, workspaceCase],
  );
  const activityEntries = useMemo(
    () => buildMaintenanceActivityEntries(workspaceCase),
    [workspaceCase],
  );

  const address =
    resolvedProperty != null
      ? formatPropertyFullAddress(resolvedProperty)
      : item.propertyAddress;
  const taskRef = maintenanceTaskReference(workspaceCase, item);
  const createdLabel = workspaceCase.createdAt
    ? formatDate(workspaceCase.createdAt)
    : item.createdAt
      ? formatDate(item.createdAt)
      : '—';
  const quotesCount = quotationCount(workspaceCase);
  const documentsCount = maintenanceDocumentCount(attachments, item.id);

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
    return rows.filter((row) => !(row.kind === 'maintenance' && row.id === item.id)).slice(0, 4);
  }, [
    accounting,
    currentLease,
    inspections,
    item.id,
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
    <div ref={pageRef} className="maintenance-task px-4 py-5 lg:px-8 lg:py-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-700">
              <Wrench className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  {item.title || workspaceCase.issueType}
                </h1>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    tenantRejected
                      ? TENANT_REJECTED_BADGE_CLASS
                      : workspaceCase.status === 'completed' || workspaceCase.status === 'closed'
                        ? 'bg-muted text-muted-foreground'
                        : banner.needsAction
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                  )}
                  title={tenantRejected ? tenantRejectionTitle(item) : undefined}
                >
                  {tenantRejected
                    ? TENANT_REJECTED_LABEL
                    : workspaceCase.status === 'completed' || workspaceCase.status === 'closed'
                      ? 'Completed'
                      : banner.needsAction
                        ? 'Need your action'
                        : 'CROS handling'}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{address}</p>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>Task type Maintenance</span>
                <span>Reported {createdLabel}</span>
                <span>Reference {taskRef}</span>
              </div>
            </div>
          </div>
          <TaskPageActions propertyId={item.propertyId} reference={taskRef} />
        </div>
      </header>

      <section className="maintenance-task__status-card rounded-2xl border border-rose-500/20 p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Current status
            </p>
            <h2 className="mt-1 text-lg font-semibold text-rose-950 dark:text-rose-100">
              {banner.title}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">{banner.subtitle}</p>
          </div>
          <div className="rounded-xl border border-rose-500/15 v2-frosted-surface p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-rose-600" />
              <p className="text-sm font-semibold">CROS recommendation</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-rose-950/80 dark:text-rose-100/80">
              {banner.crosSummary[0] ||
                'CROSSUB is handling this job and will notify you if a decision is needed.'}
            </p>
          </div>
        </div>
      </section>

      <TaskWorkflowRailSlot />

          <div className="border-b">
            <div className="flex gap-1 overflow-x-auto">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'border-b-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition',
                    activeTab === tab.id
                      ? 'border-rose-600 text-rose-700'
                      : 'text-muted-foreground hover:text-foreground border-transparent',
                  )}
                >
                  {tab.label}
                  {tab.id === 'quotes' && quotesCount > 0 ? ` (${quotesCount})` : ''}
                  {tab.id === 'documents' && documentsCount > 0 ? ` (${documentsCount})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className={activeTab === 'workflow' ? undefined : 'hidden'}>
            <MaintenanceAgentWorkflowPanel
              ctx={workflowCtx}
              item={item}
              property={resolvedProperty ?? undefined}
              attachments={attachments}
              contractors={contractors}
              onCaseUpdated={onCaseUpdated}
              apiConnected={apiConnected}
              syncing={syncing}
              maintenanceReminders={maintenanceReminders}
              workflowRequest={workflowRequest}
              quotations={quotations}
            />
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-5">
              <section className="rounded-2xl border v2-frosted-surface p-5">
                <h3 className="text-sm font-semibold">Job details</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {jobRows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-muted-foreground text-xs">{row.label}</dt>
                      <dd className="mt-1 text-sm font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {contractorFlow && quoteCards.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold">Quotes received</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {quoteCards.map((quote) => (
                      <article
                        key={quote.id}
                        className={cn(
                          'rounded-2xl border v2-frosted-surface p-4',
                          quote.selected && 'border-rose-500/40 ring-1 ring-rose-500/20',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{quote.contractorName}</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">
                              {quote.amount != null ? formatCurrency(quote.amount) : '—'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {quote.recommended ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                <Star className="size-3" />
                                Recommended
                              </span>
                            ) : null}
                            {quote.selected ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Selected
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
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

          {activeTab === 'quotes' && contractorFlow ? (
            <MaintenanceGetQuotePanel
              ctx={workflowCtx}
              property={resolvedProperty ?? undefined}
              contractors={contractors}
              onCaseUpdated={onCaseUpdated}
              apiConnected={apiConnected}
              maintenanceReminders={maintenanceReminders}
              workflowRequest={workflowRequest}
              quotations={quotations}
            />
          ) : null}

          {activeTab === 'activity' ? <ActivityTimeline entries={activityEntries} /> : null}

          {activeTab === 'documents' ? (
            <MaintenanceTaskDocuments requestId={item.id} attachments={attachments} />
          ) : null}

          {activeTab === 'notes' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Case notes</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                {recommendation?.trim() || workspaceCase.description || 'No notes recorded yet.'}
              </p>
            </section>
          ) : null}

          {activeTab === 'messages' ? (
            <section className="flex min-h-[28rem] max-h-[min(70dvh,44rem)] flex-col overflow-hidden rounded-2xl border v2-frosted-surface p-2">
              <WorkspaceChatPanel
                workspaceCase={workspaceCase}
                agentName={workspaceCase.agent?.name ?? assignedToName ?? 'Agent'}
                reference={taskRef}
              />
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto">
          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="text-sm font-semibold">Property &amp; tenancy</h3>
            <div className="mt-3 overflow-hidden rounded-xl border v2-frosted-surface">
              {resolvedProperty?.imageUrl ? (
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={resolvedProperty.imageUrl}
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
                  {resolvedProperty?.leaseStatus === 'vacant' ? 'Vacant' : 'Occupied'}
                </span>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tenant</dt>
                    <dd className="font-medium">
                      {workspaceCase.tenant?.name || resolvedProperty?.tenantName || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Lease period</dt>
                    <dd className="text-right font-medium">
                      {resolvedProperty?.leaseStart && resolvedProperty?.leaseEnd
                        ? `${formatDate(resolvedProperty.leaseStart)} – ${formatDate(resolvedProperty.leaseEnd)}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="font-medium">
                      {resolvedProperty && resolvedProperty.rentWeekly > 0
                        ? `${formatCurrency(resolvedProperty.rentWeekly)}/week`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent status</dt>
                    <dd className="font-medium text-emerald-700">
                      {resolvedProperty?.rentPaidUntil
                        ? `Paid up to ${formatDate(resolvedProperty.rentPaidUntil)}`
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

          {contractorFlow && contractorName ? (
            <section className="rounded-2xl border v2-frosted-surface p-4">
              <h3 className="text-sm font-semibold">Contractor</h3>
              <div className="mt-3">
                <p className="text-sm font-semibold">{contractorName}</p>
                {quoteAmount != null ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Latest quote {formatCurrency(quoteAmount)}
                    {quoteExpiry ? ` · expires ${formatDate(quoteExpiry)}` : ''}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="text-sm font-semibold">Related tasks</h3>
            <ul className="mt-3 space-y-3">
              {relatedTasks.length === 0 ? (
                <li className="text-muted-foreground text-sm">No other active tasks.</li>
              ) : (
                relatedTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={propertyId ? relatedPropertyJobHref(task, propertyId) : '#'}
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
            <PortalBackLink className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline" />
          </section>
        </aside>
      </div>
    </div>
    </TaskWorkflowRailSlotProvider>
  );
}
