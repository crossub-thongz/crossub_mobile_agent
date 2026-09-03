'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Gavel } from 'lucide-react';

import { ModuleCommunications } from '@/components/agent/module-communications';
import { TaskPageActions } from '@/components/agent/tasks/task-page-actions';
import {
  TaskWorkflowRailSlot,
  TaskWorkflowRailSlotProvider,
} from '@/components/agent/tasks/task-workflow-rail-slot';
import { TribunalAwaitingAccountManagerPanel } from '@/components/agent/tribunal-awaiting-account-manager';
import { TribunalRentChasingDetail } from '@/components/agent/tribunal-rent-chasing-detail';
import { PortalBackLink } from '@/components/layout/portal-back-link';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { fetchAgentTribunalRentChasingDetail } from '@/lib/crossub-api/agent-workflow-client';
import type { AgentTribunalRentChasingDetail } from '@/lib/crossub-api/agent-workflow-client';
import { relatedPropertyJobHref } from '@/lib/property-job-href';
import { buildPropertyOverviewJobRows } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import {
  buildTribunalActivityEntries,
  buildTribunalDetailRows,
  buildTribunalMatterSummary,
  buildTribunalUpcomingCards,
  resolveTribunalStatusBanner,
  tribunalDocumentCount,
  tribunalTaskReference,
  type TribunalTaskTab,
} from '@/lib/tribunal-task-detail';
import type { TribunalCase } from '@/lib/types';
import {
  cn,
  formatCurrency,
  formatDate,
  formatPropertyFullAddress,
  formatTime,
} from '@/lib/utils';

import './tribunal-task-detail.css';

const TABS: { id: TribunalTaskTab; label: string }[] = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'details', label: 'Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'activity', label: 'Activity' },
  { id: 'orders', label: 'Orders' },
  { id: 'notes', label: 'Notes' },
];

function ActivityTimeline({
  entries,
}: {
  entries: ReturnType<typeof buildTribunalActivityEntries>;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No activity recorded for this task yet.</p>
    );
  }

  return (
    <div className="tribunal-task__activity-card relative rounded-2xl border v2-frosted-surface px-4">
      <span className="tribunal-task__activity-line bg-border absolute" aria-hidden />
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
            <span className="bg-sky-600 ring-card relative z-10 mt-1.5 size-2.5 rounded-full ring-[3px]" />
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

function TribunalGeneralCaseWorkflow() {
  return <TribunalAwaitingAccountManagerPanel kind="tribunal" />;
}

export function TribunalTaskDetailView({
  tribunalCase,
  rentChasing,
}: {
  tribunalCase: TribunalCase;
  rentChasing: boolean;
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

  const [activeTab, setActiveTab] = useState<TribunalTaskTab>('workflow');
  const showWorkflowTab = useCallback(() => setActiveTab('workflow'), []);
  const [rentChasingDetail, setRentChasingDetail] = useState<AgentTribunalRentChasingDetail | null>(
    null,
  );

  const propertyId = tribunalCase.propertyId;
  const property = properties.find((row) => row.id === propertyId) ?? null;
  const currentLease = leasingRecords.find(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );

  const loadRentChasingDetail = useCallback(async () => {
    if (!rentChasing) return;
    try {
      const next = await fetchAgentTribunalRentChasingDetail(tribunalCase.id);
      setRentChasingDetail(next);
    } catch {
      setRentChasingDetail(null);
    }
  }, [rentChasing, tribunalCase.id]);

  useEffect(() => {
    void loadRentChasingDetail();
  }, [loadRentChasingDetail]);

  const banner = useMemo(
    () => resolveTribunalStatusBanner(tribunalCase, rentChasingDetail),
    [tribunalCase, rentChasingDetail],
  );
  const detailRows = useMemo(
    () => buildTribunalDetailRows(tribunalCase, property, rentChasingDetail),
    [tribunalCase, property, rentChasingDetail],
  );
  const matterSummary = useMemo(
    () => buildTribunalMatterSummary(tribunalCase, rentChasingDetail),
    [tribunalCase, rentChasingDetail],
  );
  const activityEntries = useMemo(
    () => buildTribunalActivityEntries(tribunalCase, rentChasingDetail),
    [tribunalCase, rentChasingDetail],
  );
  const upcomingCards = useMemo(
    () => buildTribunalUpcomingCards(tribunalCase, rentChasingDetail),
    [tribunalCase, rentChasingDetail],
  );
  const documentCount = tribunalDocumentCount(tribunalCase, rentChasingDetail);

  const address = property
    ? formatPropertyFullAddress(property)
    : tribunalCase.propertyAddress;
  const taskRef = tribunalCase.caseNumber?.trim() || tribunalTaskReference(tribunalCase.id);
  const createdLabel = tribunalCase.createdAt ? formatDate(tribunalCase.createdAt) : '—';
  const matterTitle = tribunalCase.matter?.trim() || 'Tribunal matter';
  const tenantName =
    rentChasingDetail?.tenantName?.trim() || tribunalCase.tenantName || '—';
  const weeklyRent = rentChasingDetail?.currentRent ?? property?.rentWeekly;

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
    return rows.filter((row) => !(row.kind === 'tribunal' && row.id === tribunalCase.id)).slice(0, 4);
  }, [
    accounting,
    currentLease,
    inspections,
    leasingCycles,
    maintenanceAll,
    propertyId,
    rentReviews,
    tenantSelections,
    tribunalCase.id,
    tribunalCases,
    vacating,
  ]);

  const tabsWithCounts = TABS.map((tab) =>
    tab.id === 'documents' && documentCount > 0
      ? { ...tab, label: `Documents (${documentCount})` }
      : tab,
  );

  return (
    <TaskWorkflowRailSlotProvider onStepActivate={showWorkflowTab}>
    <div className="tribunal-task px-4 py-5 lg:px-8 lg:py-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-sky-500/12 text-sky-700 flex size-11 shrink-0 items-center justify-center rounded-2xl">
              <Gavel className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">
                Tribunal application – {matterTitle}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">{address}</p>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>Task ID {taskRef}</span>
                <span>Created {createdLabel}</span>
                <span>Task type Tribunal</span>
              </div>
            </div>
          </div>
          <TaskPageActions propertyId={tribunalCase.propertyId} reference={taskRef} />
        </div>
      </header>

      <section className="tribunal-task__status-card rounded-2xl border border-sky-500/20 p-5">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Current status
        </p>
        <h2 className="mt-1 text-lg font-semibold text-sky-950 dark:text-sky-100">
          {banner.title}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">{banner.subtitle}</p>
      </section>

          <TaskWorkflowRailSlot />

          <div className="border-b">
            <div className="flex gap-1 overflow-x-auto">
              {tabsWithCounts.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
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

          <div className={activeTab === 'workflow' ? undefined : 'hidden'}>
            {rentChasing ? (
              <TribunalRentChasingDetail caseId={tribunalCase.id} />
            ) : (
              <TribunalGeneralCaseWorkflow />
            )}
            <div className="mt-4">
              <ModuleCommunications
                propertyId={tribunalCase.propertyId}
                categories={['Tribunal']}
                title="Tribunal communications"
              />
            </div>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-5">
              <section className="rounded-2xl border v2-frosted-surface p-5">
                <h3 className="text-sm font-semibold">Tribunal case details</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {detailRows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-muted-foreground text-xs">{row.label}</dt>
                      <dd className="mt-1 text-sm font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-2xl border v2-frosted-surface p-5">
                <h3 className="text-sm font-semibold">Matter summary</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {matterSummary.map((row) => (
                    <div key={row.label}>
                      <dt className="text-muted-foreground text-xs">{row.label}</dt>
                      <dd className="mt-1 text-sm font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {banner.crosSummary.length > 0 ? (
                <section className="rounded-2xl border border-sky-500/15 v2-frosted-surface p-5">
                  <h3 className="text-sm font-semibold">CROS recommendation</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {banner.crosSummary[0]}
                  </p>
                </section>
              ) : null}

              {upcomingCards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcomingCards.map((card) => (
                    <section
                      key={card.title}
                      className="rounded-2xl border v2-frosted-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold">{card.title}</h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {card.status}
                        </span>
                      </div>
                    </section>
                  ))}
                </div>
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

          {activeTab === 'documents' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Documents</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {(tribunalCase.evidence ?? []).map((doc) => (
                  <li key={doc} className="rounded-lg border bg-secondary/30 px-3 py-2">
                    {doc}
                  </li>
                ))}
                {rentChasingDetail?.hearingNoticeUrl ? (
                  <li className="rounded-lg border bg-secondary/30 px-3 py-2">
                    <a
                      href={rentChasingDetail.hearingNoticeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-medium hover:underline"
                    >
                      {rentChasingDetail.hearingNoticeName ?? 'Hearing notice'}
                    </a>
                  </li>
                ) : null}
                {rentChasingDetail?.membersOrderUrl ? (
                  <li className="rounded-lg border bg-secondary/30 px-3 py-2">
                    <a
                      href={rentChasingDetail.membersOrderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-medium hover:underline"
                    >
                      {rentChasingDetail.membersOrderName ?? "Member's order"}
                    </a>
                  </li>
                ) : null}
                {documentCount === 0 ? (
                  <li className="text-muted-foreground">No documents uploaded yet.</li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {activeTab === 'activity' ? <ActivityTimeline entries={activityEntries} /> : null}

          {activeTab === 'orders' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Orders</h3>
              {tribunalCase.orders ? (
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {tribunalCase.orders}
                </p>
              ) : rentChasingDetail?.membersOrderUrl ? (
                <a
                  href={rentChasingDetail.membersOrderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary mt-3 inline-block text-sm font-medium hover:underline"
                >
                  {rentChasingDetail.membersOrderName ?? "View member's order"}
                </a>
              ) : (
                <p className="text-muted-foreground mt-3 text-sm">No orders recorded yet.</p>
              )}
            </section>
          ) : null}

          {activeTab === 'notes' ? (
            <section className="rounded-2xl border v2-frosted-surface p-5">
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                {rentChasingDetail?.agentNotes?.trim() ||
                  'Agent notes are available in the Workflow tab.'}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto">
          <section className="rounded-2xl border v2-frosted-surface p-4">
            <h3 className="text-sm font-semibold">Property & tenancy</h3>
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
                {tenantName !== '—' ? (
                  <p className="text-muted-foreground mt-2 text-xs">{tenantName}</p>
                ) : null}
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Lease period</dt>
                    <dd className="text-right font-medium">
                      {property?.leaseStart && property?.leaseEnd
                        ? `${formatDate(property.leaseStart)} – ${formatDate(property.leaseEnd)}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="font-medium">
                      {weeklyRent != null ? `${formatCurrency(weeklyRent)} / week` : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent status</dt>
                    <dd className="font-medium text-emerald-700">
                      {property?.rentPaidUntil
                        ? `Paid up to ${formatDate(property.rentPaidUntil)}`
                        : rentChasingDetail?.rentPaidTo
                          ? `Paid up to ${formatDate(rentChasingDetail.rentPaidTo)}`
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
              <span className="bg-sky-100 text-sky-700 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {initials(tenantName !== '—' ? tenantName : 'T')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{tenantName}</p>
                <span className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Current tenant
                </span>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="text-right font-medium">
                      {rentChasingDetail?.tenantPhone?.trim() ||
                        property?.tenantContact?.phone?.trim() ||
                        '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="text-right font-medium break-all">
                      {rentChasingDetail?.tenantEmail?.trim() ||
                        property?.tenantContact?.email?.trim() ||
                        '—'}
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
            <PortalBackLink className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline" />
          </section>
        </aside>
      </div>
    </div>
    </TaskWorkflowRailSlotProvider>
  );
}
