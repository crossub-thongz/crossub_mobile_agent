'use client';

import { useMemo, useState } from 'react';
import { Archive } from 'lucide-react';

import { TenancyHistorySection } from '@/components/agent/tenancy-history-section';
import {
  parseArchivedLandlords,
  parseTenancyArchiveSnapshots,
} from '@/lib/property-archive';
import type { LeasingRecord, Property } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';

type HistorySubTab = 'tenant' | 'landlord';

function SubTabBar({
  active,
  onChange,
}: {
  active: HistorySubTab;
  onChange: (tab: HistorySubTab) => void;
}) {
  const tabs: { id: HistorySubTab; label: string }[] = [
    { id: 'tenant', label: 'Tenant' },
    { id: 'landlord', label: 'Landlord' },
  ];

  return (
    <div className="flex gap-2 border-b pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            active === tab.id
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ArchivedLandlordList({
  property,
  archived,
}: {
  property: Property;
  archived: ReturnType<typeof parseArchivedLandlords>;
}) {
  const gstLabel = (gst?: string) =>
    gst === 'include' ? 'Include GST' : gst === 'exclude' ? 'Exclude GST' : null;

  return (
    <div className="space-y-3">
      <section className="rounded-xl border bg-card p-3">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Current landlord
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-[10px] uppercase">Name</p>
            <p className="text-sm font-semibold">{property.homeOwnerName || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] uppercase">Email</p>
            <p className="text-sm">{property.homeOwnerContact.email || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] uppercase">Number</p>
            <p className="text-sm tabular-nums">{property.homeOwnerContact.phone || '—'}</p>
          </div>
        </div>
        {property.managementRatePercent != null ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Management rate: {property.managementRatePercent}%
            {gstLabel(property.managementRateGst)
              ? ` · ${gstLabel(property.managementRateGst)}`
              : ''}
          </p>
        ) : null}
      </section>

      {archived.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            <Archive className="size-3.5" />
            Archived landlords
          </p>
          {archived.map((landlord, index) => (
            <div
              key={`${landlord.archivedAt}-${index}`}
              className="rounded-xl border border-dashed bg-muted/10 p-3"
            >
              <p className="text-muted-foreground text-[10px]">
                Archived {landlord.archivedAt ? formatDateTime(landlord.archivedAt) : '—'}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase">Name</p>
                  <p className="text-sm font-semibold">{landlord.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase">Email</p>
                  <p className="text-sm">{landlord.email || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase">Number</p>
                  <p className="text-sm tabular-nums">{landlord.phone || '—'}</p>
                </div>
              </div>
              {landlord.managementRatePercent != null ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  Management rate: {landlord.managementRatePercent}%
                  {gstLabel(landlord.managementRateGst)
                    ? ` · ${gstLabel(landlord.managementRateGst)}`
                    : ''}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No previous landlords archived yet.</p>
      )}
    </div>
  );
}

function ArchivedTenancySnapshots({
  snapshots,
}: {
  snapshots: ReturnType<typeof parseTenancyArchiveSnapshots>;
}) {
  if (snapshots.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <Archive className="size-3.5" />
        Archived tenancy snapshots
      </p>
      {snapshots.map((snapshot, index) => (
        <div
          key={`${snapshot.archivedAt}-${index}`}
          className="rounded-xl border border-dashed bg-muted/10 p-3 text-sm"
        >
          <p className="text-muted-foreground text-[10px]">
            Archived {snapshot.archivedAt ? formatDateTime(snapshot.archivedAt) : '—'}
            {snapshot.source === 'vacate_date' ? ' · Vacate date reached' : ''}
          </p>
          <p className="mt-1 font-semibold">{snapshot.tenantName || 'Tenant'}</p>
          <div className="text-muted-foreground mt-2 grid gap-1 text-xs sm:grid-cols-2">
            {snapshot.leaseStartDate ? (
              <span>Lease start: {formatDate(snapshot.leaseStartDate)}</span>
            ) : null}
            {snapshot.leaseEndDate ? (
              <span>Lease end: {formatDate(snapshot.leaseEndDate)}</span>
            ) : null}
            {snapshot.vacateDate ? <span>Vacate: {formatDate(snapshot.vacateDate)}</span> : null}
            {snapshot.rentPaidUntil ? (
              <span>Rent paid to: {formatDate(snapshot.rentPaidUntil)}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PropertyHistoryTab({
  property,
  propertyId,
  leasing,
}: {
  property: Property;
  propertyId: string;
  leasing: LeasingRecord[];
}) {
  const [subTab, setSubTab] = useState<HistorySubTab>('tenant');

  const archivedLandlords = useMemo(
    () => parseArchivedLandlords(property.registryDraft),
    [property.registryDraft],
  );
  const tenancySnapshots = useMemo(
    () => parseTenancyArchiveSnapshots(property.registryDraft),
    [property.registryDraft],
  );

  return (
    <div className="space-y-4">
      <SubTabBar active={subTab} onChange={setSubTab} />

      {subTab === 'tenant' ? (
        <div className="space-y-4">
          <ArchivedTenancySnapshots snapshots={tenancySnapshots} />
          <section className="rounded-xl border bg-card p-3">
            <h3 className="text-sm font-semibold">Tenancy history</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Past and current tenancies — open a record for maintenance, inspections, rent
              reviews, and communications for that lease.
            </p>
            <div className="mt-3">
              <TenancyHistorySection propertyId={propertyId} records={leasing} />
            </div>
          </section>
        </div>
      ) : (
        <ArchivedLandlordList property={property} archived={archivedLandlords} />
      )}
    </div>
  );
}
