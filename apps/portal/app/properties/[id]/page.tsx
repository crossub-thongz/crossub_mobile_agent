'use client';

import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  BellRing,
  Building2,
  FileText,
  ListTodo,
  Mail,
  Phone,
  User,
  Wallet,
} from 'lucide-react';

import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { PropertyChatFab } from '@/components/agent/property-chat-fab';
import { PropertyTabBar } from '@/components/agent/property-tab-bar';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  ROUTES,
} from '@/constants/routes';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const TABS = [
  'Overview',
  'Leasing',
  'Rent Review',
  'Maintenance',
  'Inspection',
  'Accounting',
] as const;

type Tab = (typeof TABS)[number];

export default function PropertyDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialTab = (searchParams.get('tab') as Tab) || 'Overview';
  const {
    properties,
    maintenanceAll,
    inspections,
    rentReviews,
    documents,
    leasingRecords,
    accounting,
    getPropertyActions,
  } = useAgentData();
  const property = properties.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>(
    TABS.includes(initialTab as Tab) ? (initialTab as Tab) : 'Overview',
  );

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
  const routineInspections = tasks.inspections.filter((i) => i.type === 'ROUTINE');
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
            {needActions.length > 0 && (
              <Link
                href={ROUTES.REMINDING}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive transition hover:bg-destructive/15"
                aria-label="Reminding"
              >
                <BellRing className="size-4" />
                <span className="text-[10px] font-bold">{needActions.length}</span>
              </Link>
            )}
          </div>
        </div>

        <PropertyTabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'Overview' && (
          <div className="space-y-4">
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

            <InfoPanel title="Documents" icon={FileText}>
              {propertyDocs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Document types pending confirmation from Leasing.
                </p>
              ) : (
                <div className="space-y-2">
                  {propertyDocs.map((d) => (
                    <Link
                      key={d.id}
                      href={d.href}
                      className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/20 px-3 py-3 text-sm transition hover:border-primary/30"
                    >
                      <span className="font-medium">{d.title}</span>
                      <span className="text-primary text-xs font-semibold">View</span>
                    </Link>
                  ))}
                </div>
              )}
            </InfoPanel>
          </div>
        )}

        {tab === 'Leasing' && (
          <div className="space-y-3">
            {leasing.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Leasing history will appear here once connected to crossub_web.
              </p>
            ) : (
              leasing.map((l) => (
                <div key={l.id} className="rounded-2xl border bg-card p-4 text-sm shadow-sm">
                  <p className="font-semibold capitalize">{l.status} tenancy</p>
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
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'Rent Review' && (
          <div className="space-y-2">
            {tasks.rentReviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">No rent review records.</p>
            ) : (
              tasks.rentReviews.map((r) => (
                <Link
                  key={r.id}
                  href={rentReviewDetail(r.id)}
                  className="block rounded-xl border bg-card p-4"
                >
                  <p className="text-sm font-semibold">Review due {formatDate(r.reviewDue)}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatCurrency(r.currentRent)} → {formatCurrency(r.suggestedRent)} proposed
                  </p>
                  <p className="text-primary mt-2 text-xs font-medium">{r.status}</p>
                  {r.tenantResponse && (
                    <p className="text-muted-foreground text-xs capitalize">
                      Tenant: {r.tenantResponse}
                      {r.counterOffer ? ` — counter ${formatCurrency(r.counterOffer)}` : ''}
                    </p>
                  )}
                  {r.timeline.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <Timeline entries={r.timeline.slice(0, 4)} />
                    </div>
                  )}
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
                  <Link key={m.id} href={maintenanceDetail(m.id)} className="block">
                    <div className="rounded-xl border bg-card p-4">
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
                    </div>
                  </Link>
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
          </div>
        )}

        {tab === 'Inspection' && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">Routine inspection records</p>
            {routineInspections.length === 0 ? (
              <p className="text-muted-foreground text-sm">No routine inspections.</p>
            ) : (
              routineInspections.map((i) => (
                <Link key={i.id} href={inspectionDetail(i.id)} className="block">
                  <div className="rounded-xl border bg-card p-4">
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
      </div>
      <PropertyChatFab propertyId={property.id} />
    </AgentShell>
  );
}
