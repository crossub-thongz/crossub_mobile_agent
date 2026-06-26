'use client';

import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Building2,
  FileText,
  History,
  ListTodo,
  Mail,
  Phone,
  User,
  Wallet,
} from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { LeasingTicketCard } from '@/components/agent/leasing-ticket-card';
import { MaintenanceInlineActions } from '@/components/agent/maintenance-inline-actions';
import { PropertyPhotosButton } from '@/components/agent/property-photos-dialog';
import { PropertyTabBar } from '@/components/agent/property-tab-bar';
import { RentReviewSummaryList } from '@/components/agent/rent-review-summary-list';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { TenancyHistorySection } from '@/components/agent/tenancy-history-section';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  inspectionDetail,
  inspectionNew,
  maintenanceDetail,
  propertyLeasePackage,
  ROUTES,
} from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
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

type InspTypeFilter = (typeof INSP_TYPE_FILTERS)[number]['id'];

type Tab = (typeof TABS)[number];

function normalizeTab(raw: string | null): Tab {
  if (raw === 'Rent Review' || raw === 'Tenancy' || raw === 'Communication') return 'Leasing';
  if (TABS.includes(raw as Tab)) return raw as Tab;
  return 'Overview';
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
    getPropertyActions,
  } = useAgentData();
  const property = properties.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>(normalizeTab(searchParams.get('tab')));
  const [overviewView, setOverviewView] = useState<'summary' | 'history'>('summary');
  const [maintView, setMaintView] = useState<'current' | 'history'>('current');
  const [inspView, setInspView] = useState<'current' | 'completed'>('current');
  const [inspType, setInspType] = useState<InspTypeFilter>('all');

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
  const currentTenancy = leasing.filter((l) => l.status === 'current');
  const currentLease = currentTenancy[0];
  const isVacant =
    property.leaseStatus === 'vacant' ||
    property.tenantName === 'Vacant' ||
    currentTenancy.length === 0;
  const currentInspections = tasks.inspections.filter(
    (i) =>
      i.type !== 'OPEN' &&
      !i.status.toLowerCase().includes('complete'),
  );
  const completedInspections = tasks.inspections.filter(
    (i) => i.type !== 'OPEN' && i.status.toLowerCase().includes('complete'),
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
              tasks.rentReviews.length === 0 ? (
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
              <RentReviewSummaryList reviews={tasks.rentReviews} propertyId={id} compact />
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
            {!isVacant && currentLease ? (
              <InfoPanel title="Current leasing agreement" icon={FileText}>
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
                <Link
                  href={propertyLeasePackage(property.id, currentLease.id)}
                  className="text-primary mt-3 inline-block text-xs font-medium"
                >
                  View agreement details →
                </Link>
              </InfoPanel>
            ) : (
              <div className="space-y-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center">
                <p className="text-sm font-semibold">Vacant property</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Schedule an open inspection. CROSSUB confirms the time, then you confirm before
                  publishing ads on your platforms.
                </p>
                <Button asChild size="lg" className="w-full rounded-xl">
                  <Link href={inspectionNew(id)}>Add open inspection</Link>
                </Button>
              </div>
            )}

            {propertyLeasingCases.map((t) => (
              <LeasingTicketCard key={t.id} propertyId={id} selection={t} />
            ))}

            {currentLease && (
              <LeasingTicketCard propertyId={id} record={currentLease} />
            )}

            {propertyLeasingCases.length === 0 && !currentLease && isVacant && (
              <p className="text-muted-foreground text-sm">
                No active leasing tickets. Add an open inspection to begin.
              </p>
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
                <Link key={i.id} href={inspectionDetail(i.id, fromProperty(id, 'Inspection'))} className="block">
                  <div className="rounded-xl border bg-card p-4">
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
                  </div>
                </Link>
              ))
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
                  <InfoRow
                    label="Arrears"
                    value={
                      acct.arrearsAmount > 0
                        ? `${formatCurrency(acct.arrearsAmount)} · ${acct.daysInArrears} days`
                        : 'None'
                    }
                  />
                </div>
                </InfoPanel>
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
                      <Link
                        key={s.id}
                        href={s.href}
                        className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm hover:border-primary/30"
                      >
                        <span className="font-medium">{s.period}</span>
                        <span className="tabular-nums">{formatCurrency(s.amount)}</span>
                      </Link>
                    ))}
                  </section>
                )}
                {acct.arrearsAmount > 0 && acct.collectionActivity.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-sm font-semibold">Collection activity</h2>
                    {acct.collectionActivity.map((c) => (
                      <div key={c.id} className="rounded-xl border bg-card p-3 text-xs">
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
    </AgentShell>
  );
}
