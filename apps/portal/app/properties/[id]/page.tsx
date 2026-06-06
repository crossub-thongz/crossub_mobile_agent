'use client';

import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Bell, Mail, Phone } from 'lucide-react';

import { PropertyChatFab } from '@/components/agent/property-chat-fab';
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
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

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
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-xs">{property.suburb}</p>
            {property.rentWeekly > 0 && (
              <p className="text-sm font-medium">{formatCurrency(property.rentWeekly)}/wk</p>
            )}
          </div>
          {needActions.length > 0 && (
            <Link
              href={ROUTES.REMINDING}
              className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-semibold text-destructive"
            >
              <Bell className="size-3.5" />
              {needActions.length}
            </Link>
          )}
        </div>

        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                tab === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <div className="space-y-4">
            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Landlord</h2>
              <p className="mt-2 font-medium">{property.homeOwnerName}</p>
              {property.homeOwnerContact.email && (
                <a
                  href={`mailto:${property.homeOwnerContact.email}`}
                  className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs"
                >
                  <Mail className="size-3" />
                  {property.homeOwnerContact.email}
                </a>
              )}
              {property.homeOwnerContact.phone && (
                <a
                  href={`tel:${property.homeOwnerContact.phone.replace(/\s/g, '')}`}
                  className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs"
                >
                  <Phone className="size-3" />
                  {property.homeOwnerContact.phone}
                </a>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Tenant</h2>
              <p className="mt-2 font-medium">{property.tenantName}</p>
              {property.tenantContact.email && (
                <a
                  href={`mailto:${property.tenantContact.email}`}
                  className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs"
                >
                  <Mail className="size-3" />
                  {property.tenantContact.email}
                </a>
              )}
              {property.tenantContact.phone && (
                <a
                  href={`tel:${property.tenantContact.phone.replace(/\s/g, '')}`}
                  className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs"
                >
                  <Phone className="size-3" />
                  {property.tenantContact.phone}
                </a>
              )}
              {property.leaseStart && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Lease {formatDate(property.leaseStart)}
                  {property.leaseEnd ? ` — ${formatDate(property.leaseEnd)}` : ''}
                </p>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Property</h2>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Bedrooms</dt>
                  <dd className="font-medium">{property.bedrooms ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Bathrooms</dt>
                  <dd className="font-medium">{property.bathrooms ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Car spaces</dt>
                  <dd className="font-medium">{property.carSpaces ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Bond</dt>
                  <dd className="font-medium">
                    {property.bondAmount ? formatCurrency(property.bondAmount) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Rent</dt>
                  <dd className="font-medium">
                    {property.rentWeekly > 0
                      ? `${formatCurrency(property.rentWeekly)}/wk`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium capitalize">{property.leaseStatus}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Tasks</h2>
              {needActions.length === 0 &&
              tasks.maintenance.length === 0 &&
              tasks.rentReviews.length === 0 ? (
                <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
                  No active tasks.
                </p>
              ) : (
                <>
                  {needActions.map((a) => (
                    <Link
                      key={a.id}
                      href={a.href}
                      className="block rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
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
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Documents</h2>
              {propertyDocs.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Document types pending confirmation from Leasing.
                </p>
              ) : (
                propertyDocs.map((d) => (
                  <Link
                    key={d.id}
                    href={d.href}
                    className="flex justify-between rounded-lg border px-3 py-3 text-sm"
                  >
                    <span>{d.title}</span>
                    <span className="text-primary text-xs">View</span>
                  </Link>
                ))
              )}
            </section>
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
                <div key={l.id} className="rounded-xl border bg-card p-4 text-sm">
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
                <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Rent paid (YTD)</dt>
                    <dd className="font-semibold">{formatCurrency(acct.rentPaidYtd)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Outstanding</dt>
                    <dd className="font-semibold">{formatCurrency(acct.rentOutstanding)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Balance</dt>
                    <dd className="font-semibold">{formatCurrency(acct.currentBalance)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Arrears</dt>
                    <dd
                      className={
                        acct.arrearsAmount > 0 ? 'font-semibold text-destructive' : 'font-semibold'
                      }
                    >
                      {acct.arrearsAmount > 0
                        ? `${formatCurrency(acct.arrearsAmount)} (${acct.daysInArrears} days)`
                        : 'None'}
                    </dd>
                  </div>
                </dl>
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
