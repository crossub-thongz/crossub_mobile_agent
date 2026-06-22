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
  Plus,
  User,
  Wallet,
} from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { MaintenanceInlineActions } from '@/components/agent/maintenance-inline-actions';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { PropertyHistorySection } from '@/components/agent/property-history-section';
import { PropertyTabBar } from '@/components/agent/property-tab-bar';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  inspectionDetail,
  inspectionNew,
  maintenanceDetail,
  messageDetail,
  messagesNew,
  propertyLeasePackage,
  rentReviewDetail,
  ROUTES,
  tenantSelectionDetail,
} from '@/constants/routes';
import { leaseHistoryLabel } from '@/lib/lease-label';
import { buildPropertyHistory } from '@/lib/property-history';
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
  { id: 'OPEN', label: 'Open' },
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
    messages,
    tenantSelections,
    getPropertyActions,
  } = useAgentData();
  const property = properties.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>(normalizeTab(searchParams.get('tab')));
  const [overviewView, setOverviewView] = useState<'summary' | 'history'>('summary');
  const [tenancyView, setTenancyView] = useState<'current' | 'previous'>('current');
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
  const propertyMessages = messages.filter((m) => m.propertyId === id);
  const propertyLeasingCases = tenantSelections.filter((t) => t.propertyId === id);
  const currentTenancy = leasing.filter((l) => l.status === 'current');
  const previousTenancy = leasing.filter((l) => l.status !== 'current');
  const currentInspections = tasks.inspections.filter(
    (i) => !i.status.toLowerCase().includes('complete'),
  );
  const completedInspections = tasks.inspections.filter((i) =>
    i.status.toLowerCase().includes('complete'),
  );
  const filteredInspections = useMemo(() => {
    const base = inspView === 'current' ? currentInspections : completedInspections;
    if (inspType === 'all') return base;
    return base.filter((i) => i.type === inspType);
  }, [inspView, inspType, currentInspections, completedInspections]);

  const historyEntries = useMemo(
    () =>
      buildPropertyHistory({
        propertyId: id,
        leasing,
        maintenance: tasks.maintenance,
        inspections: tasks.inspections,
        rentReviews: tasks.rentReviews,
        tenantSelections: propertyLeasingCases,
        messages: propertyMessages,
        documents: propertyDocs,
        propertyAddressPrefix: property.address.split(',')[0],
        leasePackageHref: (leaseId) => propertyLeasePackage(property.id, leaseId),
        maintenanceHref: maintenanceDetail,
        inspectionHref: inspectionDetail,
        rentReviewHref: rentReviewDetail,
        tenantSelectionHref: tenantSelectionDetail,
        messageHref: messageDetail,
      }),
    [
      id,
      leasing,
      tasks.maintenance,
      tasks.inspections,
      tasks.rentReviews,
      propertyLeasingCases,
      propertyMessages,
      propertyDocs,
      property.address,
      property.id,
    ],
  );
  const activeMaintenance = tasks.maintenance.filter(
    (m) => !m.status.toLowerCase().includes('complete') && !m.status.toLowerCase().includes('closed'),
  );
  const completedMaintenance = tasks.maintenance.filter(
    (m) => m.status.toLowerCase().includes('complete') || m.status.toLowerCase().includes('closed'),
  );

  return (
    <AgentShell title={property.address} backHref={ROUTES.PROPERTIES}>
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
                <InfoPanel title="History" icon={History}>
                  <PropertyHistorySection entries={historyEntries} />
                </InfoPanel>
              </>
            ) : (
              <>
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
            </InfoPanel>

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
                        href: maintenanceDetail(m.id),
                        module: 'Maintenance',
                        requiresApproval: m.requiresApproval,
                      }}
                    />
                  ))}
                </>
              )}
              </div>
            </InfoPanel>

            <InfoPanel title="Current lease" icon={FileText}>
              <InfoRow
                label="Period"
                value={
                  property.leaseStart
                    ? `${formatDate(property.leaseStart)}${property.leaseEnd ? ` — ${formatDate(property.leaseEnd)}` : ''}`
                    : '—'
                }
              />
              <InfoRow
                label="Rent"
                value={
                  property.rentWeekly > 0
                    ? `${formatCurrency(property.rentWeekly)}/wk`
                    : '—'
                }
              />
            </InfoPanel>

            <InfoPanel title="History" icon={History}>
              <p className="text-muted-foreground mb-3 text-xs">
                All historical records and activities for this property.
              </p>
              <PropertyHistorySection
                entries={historyEntries}
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
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Tenancy records</h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Each lease is named by period and tenant. Tap a record to view the full leasing
                package.
              </p>
              <FilterChips
                options={[
                  { id: 'current', label: 'Current' },
                  { id: 'previous', label: 'Previous' },
                ]}
                value={tenancyView}
                onChange={(v) => setTenancyView(v as 'current' | 'previous')}
              />
              {(tenancyView === 'current' ? currentTenancy : previousTenancy).length === 0 ? (
                <p className="text-muted-foreground text-sm">No {tenancyView} tenancy records.</p>
              ) : (
                (tenancyView === 'current' ? currentTenancy : previousTenancy).map((l) => (
                  <Link
                    key={l.id}
                    href={propertyLeasePackage(property.id, l.id)}
                    className="block rounded-2xl border bg-card p-4 text-sm transition hover:border-primary/30"
                  >
                    <p className="font-semibold">{leaseHistoryLabel(l)}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDate(l.leaseStart)} — {formatDate(l.leaseEnd)} ·{' '}
                      {formatCurrency(l.rentWeekly)}/wk
                    </p>
                    <p className="text-primary mt-2 text-xs font-medium">View leasing package →</p>
                  </Link>
                ))
              )}
            </section>

            <ModuleCommunications
              propertyId={id}
              categories={['Leasing']}
              title="Leasing emails & messages"
            />

            <Link
              href={messagesNew()}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium text-primary"
            >
              <Plus className="size-4" />
              Create new case
            </Link>

            {propertyLeasingCases.map((t) => (
              <Link key={t.id} href={tenantSelectionDetail(t.id)} className="block rounded-xl border bg-card p-4">
                <p className="text-xs font-semibold text-primary">New leasing</p>
                <p className="text-sm font-medium">{t.applicantName}</p>
                <p className="text-muted-foreground text-xs">{t.status}</p>
              </Link>
            ))}

            {tasks.rentReviews.map((r) => (
              <Link key={r.id} href={rentReviewDetail(r.id)} className="block rounded-xl border bg-card p-4">
                <p className="text-xs font-semibold text-primary">Rent review</p>
                <p className="text-sm font-medium">Due {formatDate(r.reviewDue)}</p>
                <p className="text-muted-foreground text-xs">{r.status}</p>
              </Link>
            ))}

            {leasing.length === 0 && tasks.rentReviews.length === 0 && propertyLeasingCases.length === 0 ? (
              <p className="text-muted-foreground text-sm">No leasing cases for this property.</p>
            ) : (
              leasing.map((l) => (
                <Link
                  key={l.id}
                  href={propertyLeasePackage(property.id, l.id)}
                  className="block rounded-2xl border bg-card p-4 text-sm shadow-sm transition hover:border-primary/30"
                >
                  <p className="font-semibold">{leaseHistoryLabel(l)}</p>
                  <p className="text-muted-foreground text-[10px] capitalize">{l.status} tenancy</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDate(l.leaseStart)} — {formatDate(l.leaseEnd)} ·{' '}
                    {formatCurrency(l.rentWeekly)}/wk
                  </p>
                  <p className="mt-2">Tenant: {l.approvedTenant}</p>
                  {l.openInspectionDate && (
                    <dl className="mt-3 space-y-1 border-t pt-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Open inspection</dt>
                        <dd>
                          {formatDate(l.openInspectionDate)} · {l.openOfficer} ·{' '}
                          {l.attendeeCount} attendees · {l.applicationCount} applications
                        </dd>
                      </div>
                      {l.moveInDate && (
                        <div>
                          <dt className="text-muted-foreground">Move in</dt>
                          <dd>{formatDate(l.moveInDate)}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <p className="text-primary mt-3 text-xs font-medium">Leasing package →</p>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === 'Maintenance' && (
          <div className="space-y-4">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Current</h2>
              {activeMaintenance.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active maintenance.</p>
              ) : (
                activeMaintenance.map((m) => (
                  <div key={m.id} className="rounded-xl border bg-card p-4">
                    <Link href={maintenanceDetail(m.id)} className="block">
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
              )}
            </section>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Completed</h2>
              {completedMaintenance.length === 0 ? (
                <p className="text-muted-foreground text-sm">No completed jobs yet.</p>
              ) : (
                completedMaintenance.map((m) => (
                  <Link key={m.id} href={maintenanceDetail(m.id)} className="block">
                    <div className="rounded-xl border bg-card p-4 opacity-90">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-muted-foreground text-xs">{m.status}</p>
                    </div>
                  </Link>
                ))
              )}
            </section>
            <ModuleCommunications
              propertyId={id}
              categories={['Maintenance']}
              title="Maintenance emails & messages"
            />
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
              <div className="space-y-3 rounded-xl border border-dashed p-4 text-center">
                <p className="text-muted-foreground text-sm">No {inspView} inspections.</p>
                {inspView === 'current' && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={inspectionNew(id)}>Add open inspection</Link>
                  </Button>
                )}
              </div>
            ) : (
              filteredInspections.map((i) => (
                <Link key={i.id} href={inspectionDetail(i.id)} className="block">
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
            <ModuleCommunications
              propertyId={id}
              categories={['Inspection']}
              title="Inspection emails & messages"
            />
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
            <ModuleCommunications
              propertyId={id}
              categories={['Accounting']}
              title="Accounting emails & messages"
            />
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
