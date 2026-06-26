'use client';

import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Download,
  FileText,
  History,
  ListTodo,
  Mail,
  MessageSquare,
  Phone,
  TrendingDown,
  User,
  Wallet,
} from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
import { LeasingQuickActions } from '@/components/agent/leasing-quick-actions';
import { LeasingTicketCard } from '@/components/agent/leasing-ticket-card';
import { LeasingWorkflowTimeline } from '@/components/leasing-workflow/leasing-workflow-timeline';
import { OpenInspectionLeasingPanel } from '@/components/agent/open-inspection-leasing-panel';
import { MaintenanceInlineActions } from '@/components/agent/maintenance-inline-actions';
import { PropertyPhotosButton } from '@/components/agent/property-photos-dialog';
import { PropertyChatDialog } from '@/components/agent/property-chat-dialog';
import { PropertyTabBar } from '@/components/agent/property-tab-bar';
import { RentReviewDetailDialog } from '@/components/agent/rent-review-detail-dialog';
import { RentReviewSummaryList } from '@/components/agent/rent-review-summary-list';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { TenancyHistorySection } from '@/components/agent/tenancy-history-section';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  inspectionNew,
  maintenanceDetail,
  rentReviewDetail,
  ROUTES,
  vacatingDetail,
} from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import {
  filterTenancyInspections,
  filterTenancyRentReviews,
  getActiveOpenInspection,
  getNextRentReviewCase,
  getNextRentReviewDate,
  isInOpenInspectionPhase,
  isPropertyVacant,
  VACANT_RENT_REVIEW_HINT,
  VACANT_TENANCY_INSPECTIONS_HINT,
} from '@/lib/property-leasing';
import { isRentReviewPendingApproval } from '@/lib/rent-review';
import { useAgentStore } from '@/lib/store';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const TABS = [
  'Overview',
  'Leasing',
  'Maintenance',
  'Inspection',
  'Accounting',
  'Documents',
] as const;

const INSP_TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'INGOING', label: 'Ingoing' },
  { id: 'OUTGOING', label: 'Outgoing' },
  { id: 'ROUTINE', label: 'Routine' },
] as const;

const LEASING_VIEW_FILTERS = [
  { id: 'current', label: 'Current leasing' },
  { id: 'new-leasing', label: 'New leasing' },
  { id: 'rent-review', label: 'Rent review' },
  { id: 'history', label: 'History' },
] as const;

type InspTypeFilter = (typeof INSP_TYPE_FILTERS)[number]['id'];
type LeasingView = (typeof LEASING_VIEW_FILTERS)[number]['id'];

type Tab = (typeof TABS)[number];

function normalizeTab(raw: string | null): Tab {
  if (raw === 'Rent Review' || raw === 'Tenancy' || raw === 'Communication') return 'Leasing';
  if (TABS.includes(raw as Tab)) return raw as Tab;
  return 'Overview';
}

function normalizeLeasingView(raw: string | null): LeasingView {
  if (
    raw === 'current' ||
    raw === 'new-leasing' ||
    raw === 'rent-review' ||
    raw === 'history'
  ) {
    return raw;
  }
  return 'current';
}

export default function PropertyDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const {
    properties,
    maintenanceAll,
    inspections,
    rentReviews,
    documents,
    leasingRecords,
    accounting,
    tenantSelections,
    vacating,
    getPropertyActions,
  } = useAgentData();
  const decisions = useAgentStore((s) => s.rentReviewDecisions);
  const property = properties.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>(normalizeTab(searchParams.get('tab')));
  const [leasingView, setLeasingView] = useState<LeasingView>(
    normalizeLeasingView(searchParams.get('leasing')),
  );
  const [overviewView, setOverviewView] = useState<'summary' | 'history'>('summary');
  const [maintView, setMaintView] = useState<'current' | 'history'>('current');
  const [inspView, setInspView] = useState<'current' | 'completed'>('current');
  const [inspType, setInspType] = useState<InspTypeFilter>('all');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [selectedRentReviewId, setSelectedRentReviewId] = useState<string | null>(null);
  const [leasingChatOpen, setLeasingChatOpen] = useState(false);
  const arrearsSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (searchParams.get('focus') !== 'arrears' || tab !== 'Accounting') return;
    arrearsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams, tab]);

  const needActions = useMemo(
    () => (property ? getPropertyActions(property.id) : []),
    [property, getPropertyActions],
  );

  if (!property) notFound();

  const tasks = {
    maintenance: maintenanceAll.filter(
      (m) => m.propertyId === id || m.propertyAddress.includes(property.address),
    ),
    inspections: inspections.filter((i) => i.propertyId === id),
    rentReviews: rentReviews.filter((r) => r.propertyId === id),
  };
  const propertyDocs = documents.filter((d) =>
    d.propertyAddress.includes(property.address.split(',')[0]),
  );
  const leasing = leasingRecords.filter((l) => l.propertyId === id);
  const acct = accounting.find((a) => a.propertyId === id);
  const propertyLeasingCases = tenantSelections.filter((t) => t.propertyId === id);
  const propertyVacatingCases = vacating.filter((v) => v.propertyId === id);
  const historyLeasing = leasing.filter((l) => l.status !== 'current');
  const currentTenancy = leasing.filter((l) => l.status === 'current');
  const currentLease = currentTenancy[0];
  const isVacant = isPropertyVacant(property, currentTenancy);
  const tenancyRentReviews = filterTenancyRentReviews(tasks.rentReviews, isVacant);
  const tenancyInspections = filterTenancyInspections(tasks.inspections, isVacant);
  const leasingViewFilters = isVacant
    ? LEASING_VIEW_FILTERS.filter((f) => f.id !== 'rent-review')
    : LEASING_VIEW_FILTERS;
  const effectiveLeasingView =
    isVacant && leasingView === 'rent-review' ? 'current' : leasingView;
  const activeOpenInspection = getActiveOpenInspection(tasks.inspections, id);
  const inOpenInspectionPhase = isInOpenInspectionPhase({
    isVacant,
    currentLease,
    activeOpenInspection,
  });
  const nextRentReviewDate = getNextRentReviewDate(property, tenancyRentReviews, {
    isVacant,
  });
  const nextRentReviewCase = getNextRentReviewCase(property, tenancyRentReviews, {
    isVacant,
  });
  const selectedInspection =
    selectedInspectionId != null
      ? tasks.inspections.find((i) => i.id === selectedInspectionId) ?? null
      : null;
  const selectedRentReview =
    selectedRentReviewId != null
      ? tenancyRentReviews.find((r) => r.id === selectedRentReviewId) ?? null
      : null;
  const currentInspections = tenancyInspections.filter(
    (i) => !i.status.toLowerCase().includes('complete'),
  );
  const completedInspections = tenancyInspections.filter((i) =>
    i.status.toLowerCase().includes('complete'),
  );
  const filteredInspections = useMemo(() => {
    const base = inspView === 'current' ? currentInspections : completedInspections;
    if (inspType === 'all') return base;
    return base.filter((i) => i.type === inspType);
  }, [inspView, inspType, currentInspections, completedInspections]);

  const activeMaintenance = tasks.maintenance.filter(
    (m) => !m.status.toLowerCase().includes('complete') && !m.status.toLowerCase().includes('closed'),
  );
  const completedMaintenance = tasks.maintenance.filter(
    (m) => m.status.toLowerCase().includes('complete') || m.status.toLowerCase().includes('closed'),
  );

  return (
    <AgentShell title={property.address} backHref={ROUTES.PROPERTIES} backLabel="Properties">
      <div className="space-y-4 pb-8">
        <div className="rounded-2xl border bg-gradient-to-br from-card to-secondary/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{property.suburb}</p>
              <p className="mt-0.5 text-lg font-semibold leading-tight">{property.address}</p>
              {property.rentWeekly > 0 && (
                <p className="text-primary mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(property.rentWeekly)}
                  <span className="text-muted-foreground text-xs font-normal">/week</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {needActions.length > 0 && (
                <Link
                  href={ROUTES.TASKS}
                  className="flex flex-col items-center gap-0.5 rounded-xl border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-destructive"
                  aria-label="Need action"
                >
                  <ListTodo className="size-4" />
                  <span className="text-[10px] font-bold">{needActions.length}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <PropertyTabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'Overview' && (
          <div className="space-y-4">
            {overviewView === 'history' ? (
              <>
                <button
                  type="button"
                  onClick={() => setOverviewView('summary')}
                  className="text-primary text-sm font-medium"
                >
                  ← Back to overview
                </button>
                <InfoPanel title="Tenancy history" icon={History}>
                  <TenancyHistorySection propertyId={id} records={leasing} />
                </InfoPanel>
              </>
            ) : (
              <>
            <InfoPanel title="Tasks" icon={ListTodo} tone={needActions.length > 0 ? 'warning' : 'default'}>
              <div className="space-y-2">
              {needActions.length === 0 &&
              tasks.maintenance.length === 0 &&
              tenancyRentReviews.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active tasks.</p>
              ) : (
                <>
                  {needActions.map((a) => (
                    <Link
                      key={a.id}
                      href={a.href}
                      className="block rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive"
                    >
                      {a.label}
                    </Link>
                  ))}
                  {tasks.maintenance.map((m) => (
                    <TaskStatusRow
                      key={m.id}
                      item={{
                        id: m.id,
                        propertyAddress: m.propertyAddress,
                        taskLabel: m.title,
                        status: m.status,
                        href: maintenanceDetail(m.id, fromProperty(id, 'Maintenance')),
                        module: 'Maintenance',
                        requiresApproval: m.requiresApproval,
                      }}
                    />
                  ))}
                </>
              )}
              </div>
            </InfoPanel>

            <InfoPanel title="Landlord" icon={Building2}>
              <InfoRow label="Name" value={property.homeOwnerName} />
              {property.homeOwnerContact.email && (
                <InfoRow label="Email">
                  <a
                    href={`mailto:${property.homeOwnerContact.email}`}
                    className="flex items-center gap-1.5 text-primary"
                  >
                    <Mail className="size-3.5" />
                    {property.homeOwnerContact.email}
                  </a>
                </InfoRow>
              )}
              {property.homeOwnerContact.phone && (
                <InfoRow label="Mobile">
                  <a
                    href={`tel:${property.homeOwnerContact.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-1.5"
                  >
                    <Phone className="size-3.5" />
                    {property.homeOwnerContact.phone}
                  </a>
                </InfoRow>
              )}
            </InfoPanel>

            <InfoPanel title="Tenant" icon={User}>
              <InfoRow label="Name" value={property.tenantName} />
              {property.tenantContact.email && (
                <InfoRow label="Email">
                  <a
                    href={`mailto:${property.tenantContact.email}`}
                    className="flex items-center gap-1.5 text-primary"
                  >
                    <Mail className="size-3.5" />
                    {property.tenantContact.email}
                  </a>
                </InfoRow>
              )}
              {property.tenantContact.phone && (
                <InfoRow label="Mobile">
                  <a
                    href={`tel:${property.tenantContact.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-1.5"
                  >
                    <Phone className="size-3.5" />
                    {property.tenantContact.phone}
                  </a>
                </InfoRow>
              )}
              {property.leaseStart && (
                <InfoRow
                  label="Lease period"
                  value={`${formatDate(property.leaseStart)}${property.leaseEnd ? ` — ${formatDate(property.leaseEnd)}` : ''}`}
                />
              )}
            </InfoPanel>

            <InfoPanel title="Property details" icon={Building2}>
              <div className="grid grid-cols-2 gap-x-4">
                <InfoRow label="Bedrooms" value={property.bedrooms ?? '—'} />
                <InfoRow label="Bathrooms" value={property.bathrooms ?? '—'} />
                <InfoRow label="Car spaces" value={property.carSpaces ?? '—'} />
                <InfoRow
                  label="Bond"
                  value={property.bondAmount ? formatCurrency(property.bondAmount) : '—'}
                />
                <InfoRow
                  label="Current rent"
                  value={
                    property.rentWeekly > 0
                      ? `${formatCurrency(property.rentWeekly)}/wk`
                      : '—'
                  }
                />
                <InfoRow label="Status" value={property.leaseStatus} />
              </div>
              <div className="mt-4">
                <PropertyPhotosButton propertyAddress={property.address} />
              </div>
            </InfoPanel>

            <InfoPanel title="Rent review" icon={FileText}>
              {isVacant ? (
                <p className="text-muted-foreground text-sm">{VACANT_RENT_REVIEW_HINT}</p>
              ) : (
                <RentReviewSummaryList reviews={tenancyRentReviews} propertyId={id} compact />
              )}
            </InfoPanel>

            <InfoPanel title="History" icon={History}>
              <TenancyHistorySection
                propertyId={id}
                records={leasing}
                compact
                onViewAll={() => setOverviewView('history')}
              />
            </InfoPanel>
              </>
            )}
          </div>
        )}

        {tab === 'Leasing' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <FilterChips
                  options={[...leasingViewFilters]}
                  value={effectiveLeasingView}
                  onChange={(v) => setLeasingView(v as LeasingView)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mb-1 h-7 shrink-0 gap-1 px-2 text-[11px]"
                onClick={() => setLeasingChatOpen(true)}
              >
                <MessageSquare className="size-3" />
                Messages
              </Button>
            </div>

            <LeasingQuickActions propertyId={id} leaseId={currentLease?.id} />

            {effectiveLeasingView === 'current' && (
              <>
                {inOpenInspectionPhase && activeOpenInspection ? (
                  <OpenInspectionLeasingPanel
                    inspection={activeOpenInspection}
                    propertyId={id}
                  />
                ) : !isVacant && currentLease ? (
                  <>
                    <LeasingWorkflowTimeline
                      propertyId={id}
                      propertyAddress={property.address}
                      rentWeekly={currentLease.rentWeekly}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <InfoPanel title="Current leasing agreement" icon={FileText} className="min-w-0">
                        <InfoRow label="Tenant" value={currentLease.approvedTenant} />
                        <InfoRow
                          label="Lease period"
                          value={`${formatDate(currentLease.leaseStart)} — ${formatDate(currentLease.leaseEnd)}`}
                        />
                        <InfoRow
                          label="Rent"
                          value={`${formatCurrency(currentLease.rentWeekly)}/wk`}
                        />
                        <InfoRow label="Status" value={currentLease.status} />
                        {nextRentReviewDate && (
                          <InfoRow label="Next rent review">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{formatDate(nextRentReviewDate)}</span>
                              {nextRentReviewCase && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRentReviewId(nextRentReviewCase.id)}
                                >
                                  View details
                                </Button>
                              )}
                            </div>
                          </InfoRow>
                        )}
                      </InfoPanel>
                      <div className="min-w-0">
                        <LeasingTicketCard
                          propertyId={id}
                          record={currentLease}
                          omitOpenInspection
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
                    No current tenancy on this property.
                  </p>
                )}
              </>
            )}

            {effectiveLeasingView === 'new-leasing' && (
              <>
                {isVacant && !activeOpenInspection && (
                  <div className="space-y-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center">
                    <p className="text-sm font-semibold">Vacant property</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Schedule an open inspection. CROSSUB confirms the time, then you confirm
                      before publishing ads on your platforms.
                    </p>
                    <Button asChild size="lg" className="w-full rounded-xl">
                      <Link href={inspectionNew(id)}>Add open inspection</Link>
                    </Button>
                  </div>
                )}

                {propertyVacatingCases.map((v) => (
                  <Link
                    key={v.id}
                    href={vacatingDetail(v.id, fromProperty(id, 'Leasing'))}
                    className="block rounded-xl border bg-card p-4 transition hover:border-primary/25"
                  >
                    <p className="text-primary text-[10px] font-semibold uppercase">Termination</p>
                    <p className="mt-1 text-sm font-semibold">Vacating · {formatDate(v.vacateDate)}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{v.reason}</p>
                    <p className="text-primary mt-2 text-xs font-medium">{v.bondStatus}</p>
                  </Link>
                ))}

                {propertyLeasingCases.map((t) => (
                  <LeasingTicketCard key={t.id} propertyId={id} selection={t} />
                ))}

                {propertyLeasingCases.length === 0 &&
                  propertyVacatingCases.length === 0 &&
                  !isVacant && (
                    <p className="text-muted-foreground text-sm">
                      No active new leasing, renewal, or termination cases.
                    </p>
                  )}
              </>
            )}

            {effectiveLeasingView === 'rent-review' && (
              <>
                {nextRentReviewDate && (
                  <div className="rounded-xl border bg-card px-4 py-3">
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                      Next rent review
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatDate(nextRentReviewDate)}
                      </p>
                      {nextRentReviewCase && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRentReviewId(nextRentReviewCase.id)}
                        >
                          View details
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {tenancyRentReviews.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No rent review cases for this property.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tenancyRentReviews.map((r) => (
                      <div key={r.id} className="space-y-2">
                        <TaskStatusRow
                          asLink={false}
                          item={{
                            id: r.id,
                            propertyAddress: r.propertyAddress,
                            taskLabel: `Rent review · due ${formatDate(r.reviewDue)}`,
                            status: decisions[r.id]
                              ? decisions[r.id]?.action === 'confirmed'
                                ? 'Confirmed'
                                : 'Custom amount submitted'
                              : r.status,
                            href: rentReviewDetail(r.id, fromProperty(id, 'Leasing')),
                            module: 'Rent review',
                            tone: isRentReviewPendingApproval(r, decisions[r.id])
                              ? 'warning'
                              : r.tenantResponse === 'counter'
                                ? 'neutral'
                                : 'ok',
                            requiresApproval: isRentReviewPendingApproval(r, decisions[r.id]),
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setSelectedRentReviewId(r.id)}
                        >
                          View details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {effectiveLeasingView === 'history' && (
              <InfoPanel title="Tenancy history" icon={History}>
                <TenancyHistorySection propertyId={id} records={historyLeasing} />
              </InfoPanel>
            )}
          </div>
        )}

        {tab === 'Maintenance' && (
          <div className="space-y-4">
            <FilterChips
              options={[
                { id: 'current', label: 'Current' },
                { id: 'history', label: 'History' },
              ]}
              value={maintView}
              onChange={(v) => setMaintView(v as 'current' | 'history')}
            />
            {maintView === 'current' ? (
              activeMaintenance.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active maintenance.</p>
              ) : (
                activeMaintenance.map((m) => (
                  <div key={m.id} className="rounded-xl border bg-card p-4">
                    <Link href={maintenanceDetail(m.id, fromProperty(id, 'Maintenance'))} className="block">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-primary text-xs">{m.status}</p>
                      {m.contractorName && (
                        <p className="text-muted-foreground text-xs">{m.contractorName}</p>
                      )}
                      {m.quoteAmount != null && (
                        <p className="text-muted-foreground text-xs">
                          Est. {formatCurrency(m.quoteAmount)}
                        </p>
                      )}
                    </Link>
                    <MaintenanceInlineActions item={m} />
                  </div>
                ))
              )
            ) : completedMaintenance.length === 0 ? (
              <p className="text-muted-foreground text-sm">No completed maintenance cases.</p>
            ) : (
              completedMaintenance.map((m) => (
                <Link key={m.id} href={maintenanceDetail(m.id, fromProperty(id, 'Maintenance'))} className="block">
                  <div className="rounded-xl border bg-card p-4 opacity-90">
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-muted-foreground text-xs">{m.status}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === 'Inspection' && (
          <div className="space-y-4">
            {isVacant ? (
              <div className="space-y-3">
                <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm leading-relaxed">
                  {VACANT_TENANCY_INSPECTIONS_HINT}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setTab('Leasing')}
                >
                  Go to Leasing
                </Button>
              </div>
            ) : (
              <>
            <FilterChips
              options={[
                { id: 'current', label: 'Current' },
                { id: 'completed', label: 'Completed' },
              ]}
              value={inspView}
              onChange={(v) => setInspView(v as 'current' | 'completed')}
            />
            <FilterChips
              options={[...INSP_TYPE_FILTERS]}
              value={inspType}
              onChange={(v) => setInspType(v as InspTypeFilter)}
            />
            {filteredInspections.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
                No {inspView} inspections. Open inspections are managed under Leasing.
              </p>
            ) : (
              filteredInspections.map((i) => (
                <div key={i.id} className="rounded-xl border bg-card p-4">
                  <p className="text-xs font-semibold text-primary">{i.type}</p>
                  <p className="text-sm font-medium">
                    {i.scheduledAt ? formatDate(i.scheduledAt) : 'TBC'} · {i.inspector}
                  </p>
                  <p className="text-primary text-xs">{i.status}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    Report: {i.reportStatus}
                  </p>
                  {i.timeline.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <Timeline entries={i.timeline.slice(0, 3)} />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setSelectedInspectionId(i.id)}
                  >
                    View details
                  </Button>
                </div>
              ))
            )}
              </>
            )}
          </div>
        )}

        {tab === 'Accounting' && (
          <div className="space-y-4">
            {!acct ? (
              <p className="text-muted-foreground text-sm">
                No payment records for this property yet.
              </p>
            ) : (
              <>
                <InfoPanel title="Rent ledger" icon={Wallet}>
                <div className="grid grid-cols-2 gap-x-4">
                  <InfoRow label="Rent paid (YTD)" value={formatCurrency(acct.rentPaidYtd)} />
                  <InfoRow label="Outstanding" value={formatCurrency(acct.rentOutstanding)} />
                  <InfoRow label="Balance" value={formatCurrency(acct.currentBalance)} />
                </div>
                </InfoPanel>

                <section ref={arrearsSectionRef} id="rent-arrears">
                  <InfoPanel
                    title="Rent arrears"
                    icon={TrendingDown}
                    className={
                      acct.arrearsAmount > 0 ? 'border-destructive/30 bg-destructive/5' : undefined
                    }
                  >
                    {acct.arrearsAmount > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-x-4">
                          <InfoRow
                            label="Amount owing"
                            value={formatCurrency(acct.arrearsAmount)}
                          />
                          <InfoRow
                            label="Days in arrears"
                            value={`${acct.daysInArrears} days`}
                          />
                          <InfoRow label="Tenant" value={acct.tenantName} />
                          <InfoRow
                            label="Outstanding rent"
                            value={formatCurrency(acct.rentOutstanding)}
                          />
                        </div>
                        {acct.collectionActivity.length > 0 && (
                          <div className="space-y-2 border-t pt-3">
                            <p className="text-xs font-semibold">Collection activity</p>
                            {acct.collectionActivity.map((c) => (
                              <div key={c.id} className="rounded-xl border bg-card/60 p-3 text-xs">
                                <p className="font-medium capitalize">{c.type}</p>
                                <p className="mt-1">{c.summary}</p>
                                {c.detail && (
                                  <p className="text-muted-foreground mt-1">{c.detail}</p>
                                )}
                                <p className="text-muted-foreground mt-1 text-[10px]">
                                  {formatDateTime(c.at)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No rent arrears — tenant is up to date on rent.
                      </p>
                    )}
                  </InfoPanel>
                </section>
                {(acct.bills?.length ?? 0) > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-sm font-semibold">Bills</h2>
                    {acct.bills!.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{b.label}</p>
                          <p className="text-muted-foreground text-xs">Due {formatDate(b.dueDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">{formatCurrency(b.amount)}</p>
                          <p
                            className={
                              b.status === 'outstanding'
                                ? 'text-destructive text-[10px] font-medium'
                                : 'text-muted-foreground text-[10px]'
                            }
                          >
                            {b.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
                {(acct.statements?.length ?? 0) > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-sm font-semibold">Statements</h2>
                    {acct.statements!.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{s.period}</p>
                          <p className="text-muted-foreground text-xs tabular-nums">
                            {formatCurrency(s.amount)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link href={s.href} className="text-primary text-xs font-semibold">
                            View
                          </Link>
                          <a
                            href={s.downloadUrl ?? s.href}
                            download={`statement-${s.period.replace(/\s+/g, '-').toLowerCase()}.pdf`}
                            className="text-primary inline-flex items-center gap-1 text-xs font-semibold"
                          >
                            <Download className="size-3" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'Documents' && (
          <InfoPanel title="Document repository" icon={FileText}>
            {propertyDocs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Lease agreements, inspection reports, bond records, and tribunal documents will
                appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {propertyDocs.map((d) => (
                  <Link
                    key={d.id}
                    href={d.href}
                    className="flex items-center justify-between rounded-xl border bg-secondary/20 px-3 py-3 text-sm"
                  >
                    <span className="font-medium">{d.title}</span>
                    <span className="text-primary text-xs font-semibold">View</span>
                  </Link>
                ))}
              </div>
            )}
          </InfoPanel>
        )}
      </div>

      <InspectionDetailDialog
        open={selectedInspectionId !== null}
        onClose={() => setSelectedInspectionId(null)}
        inspection={selectedInspection}
        navContext={fromProperty(id, 'Inspection')}
      />
      <RentReviewDetailDialog
        open={selectedRentReviewId !== null}
        onClose={() => setSelectedRentReviewId(null)}
        review={selectedRentReview}
        navContext={fromProperty(id, 'Leasing')}
      />
      <PropertyChatDialog
        open={leasingChatOpen}
        onClose={() => setLeasingChatOpen(false)}
        propertyId={id}
        propertyAddress={property.address}
        category="Leasing"
        title="Leasing messages"
      />
    </AgentShell>
  );
}
