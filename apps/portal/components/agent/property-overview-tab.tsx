'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  History,
  ListTodo,
  Plus,
} from 'lucide-react';

import { PropertyBuildingContactsDialog } from '@/components/agent/property-building-contacts-dialog';
import { PropertyLandlordEditDialog } from '@/components/agent/property-landlord-edit-dialog';
// import { PropertyPhotosButton } from '@/components/agent/property-photos-dialog';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { TenancyHistorySection } from '@/components/agent/tenancy-history-section';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { maintenanceDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { isPropertyVacant } from '@/lib/property-leasing';
import {
  resolveCurrentRent,
  resolveLeaseDates,
  resolvePendingRentChange,
} from '@/lib/property-overview';
import type { PropertyContactBlock } from '@/lib/property-registry-api';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import type {
  AgentDocument,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyNeedAction,
} from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

function ContactTile({
  title,
  name,
  email,
  phone,
  meta,
  variant = 'filled',
  updatedHint,
  onEdit,
  onAdd,
}: {
  title: string;
  name?: string;
  email?: string;
  phone?: string;
  meta?: string;
  variant?: 'filled' | 'add';
  updatedHint?: string | null;
  onEdit?: () => void;
  onAdd?: () => void;
}) {
  if (variant === 'add' && onAdd) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border/80 bg-muted/5 px-2 py-2 text-center"
      >
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          {title}
        </p>
        <span className="text-primary inline-flex items-center gap-0.5 text-[11px] font-medium">
          <Plus className="size-3" />
          Add
        </span>
      </button>
    );
  }

  const detail = [phone, email].filter(Boolean).join(' · ');

  return (
    <div
      className="min-h-[4.25rem] rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2"
      title={updatedHint ?? undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          {title}
        </p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-primary shrink-0 text-[10px] font-medium"
          >
            Edit
          </button>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-xs font-medium">{name?.trim() || '—'}</p>
      {meta ? <p className="text-muted-foreground mt-0.5 truncate text-[10px]">{meta}</p> : null}
      <p className="text-muted-foreground mt-0.5 truncate text-[10px]">{detail || (meta ? '' : '—')}</p>
    </div>
  );
}

function StatCell({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-2 py-1.5">
      <p className="text-muted-foreground text-[9px] font-medium uppercase tracking-wide">
        {label}
      </p>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="text-primary mt-0.5 text-left text-xs font-semibold"
        >
          {value}
        </button>
      ) : (
        <p className="mt-0.5 text-xs font-semibold tabular-nums">{value}</p>
      )}
    </div>
  );
}

function hasContact(block?: PropertyContactBlock | null): boolean {
  return Boolean(block?.name?.trim() || block?.email?.trim() || block?.mobile?.trim());
}

function formatStrataMeta(
  buildingName?: string | null,
  strataPlanNumber?: string | null,
): string {
  const parts: string[] = [];
  if (buildingName?.trim()) parts.push(buildingName.trim());
  if (strataPlanNumber?.trim()) parts.push(`SP ${strataPlanNumber.trim()}`);
  return parts.join(' · ');
}

export function PropertyOverviewTab({
  property,
  propertyId,
  needActions,
  maintenance,
  inspections: _inspections,
  propertyDocs: _propertyDocs,
  leasing,
  currentLease,
  rentReviewDecisions,
  tenancyRentReviews,
  leasingCycles,
  tenantSelections,
  onViewHistory,
  onRefresh,
  onViewBondLodgement: _onViewBondLodgement,
}: {
  property: Property;
  propertyId: string;
  needActions: PropertyNeedAction[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasing: LeasingRecord[];
  currentLease?: LeasingRecord;
  rentReviewDecisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>;
  tenancyRentReviews: import('@/lib/types').RentReviewCase[];
  leasingCycles?: LeasingCycle[];
  tenantSelections?: import('@/lib/types').TenantSelectionCase[];
  onViewHistory: () => void;
  onRefresh?: () => void;
  onViewBondLodgement?: () => void;
}) {
  const { apiConnected } = useAgentData();
  const activeCycle = leasingCycles?.[0];
  const sync = usePropertyOverviewSync(
    property,
    apiConnected,
    activeCycle,
    tenantSelections,
    currentLease,
  );

  const [landlordDialogOpen, setLandlordDialogOpen] = useState(false);
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);

  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const currentRent = resolveCurrentRent(property, currentLease);
  const financialRent = sync.financial?.currentRentWeekly;
  const registryRent = sync.record?.rentWeekly ?? property.rentWeekly;
  const displayRent =
    financialRent != null && financialRent > 0
      ? financialRent
      : registryRent != null && registryRent > 0
        ? registryRent
        : currentRent;
  const { start: leaseStart, end: leaseEnd } = resolveLeaseDates(property, currentLease);
  const pendingRent = resolvePendingRentChange(property, tenancyRentReviews, rentReviewDecisions, {
    isVacant,
    currentRent: displayRent,
  });

  const overview = sync.overview;
  const buildingManager = overview?.buildingManager;
  const strataContact = overview?.strataContact;

  const landlord = useMemo(
    () => ({
      name: sync.record?.landlordName ?? property.homeOwnerName,
      email: sync.record?.landlordEmail ?? property.homeOwnerContact.email ?? '',
      phone: sync.record?.landlordPhone ?? property.homeOwnerContact.phone ?? '',
    }),
    [sync.record, property],
  );

  const tenant = useMemo(() => {
    if (sync.tenantContact?.name) {
      return {
        name: sync.tenantContact.name,
        email: sync.tenantContact.email || property.tenantContact.email,
        phone: sync.tenantContact.phone || property.tenantContact.phone,
        hint: sync.tenantContact.hint ?? null,
      };
    }
    return {
      name: isVacant ? 'Vacant' : sync.record?.tenantName ?? property.tenantName,
      email: sync.record?.tenantEmail ?? property.tenantContact.email,
      phone: sync.record?.tenantPhone ?? property.tenantContact.phone,
      hint: null as string | null,
    };
  }, [sync.tenantContact, sync.record, property, isVacant]);

  const landlordUpdatedHint =
    sync.record?.updatedAt && apiConnected
      ? `Updated ${formatDateTime(sync.record.updatedAt)}`
      : null;

  const keyDates = [
    {
      label: 'Lease start',
      value:
        overview?.leaseStartDate ??
        sync.record?.leaseStartDate?.slice(0, 10) ??
        leaseStart,
    },
    {
      label: 'Lease end',
      value:
        overview?.leaseEndDate ??
        sync.record?.leaseEndDate?.slice(0, 10) ??
        property.leaseEnd,
    },
    {
      label: 'Next rent review',
      value:
        overview?.nextRentReviewDate ??
        sync.record?.nextRentReviewAt?.slice(0, 10) ??
        property.nextRentReview,
    },
    {
      label: 'Vacate date',
      value: overview?.vacateDate ?? sync.record?.vacateDate?.slice(0, 10),
    },
    {
      label: 'Next routine inspection',
      value:
        overview?.nextRoutineInspectionDate ??
        sync.record?.nextInspectionAt?.slice(0, 10),
    },
  ];

  const registry = useMemo(() => {
    const record = sync.record;
    const gst =
      overview?.managementRateGst ??
      (record?.managementRateGst === 'include' || record?.managementRateGst === 'exclude'
        ? record.managementRateGst
        : property.managementRateGst);
    return {
      landlordInsuranceExpiry:
        overview?.landlordInsuranceExpiry ??
        record?.landlordInsuranceExpiry?.slice(0, 10) ??
        property.landlordInsuranceExpiry,
      administrationFee:
        overview?.administrationFee ?? record?.administrationFee ?? property.administrationFee,
      documentationFee:
        overview?.documentationFee ?? record?.documentationFee ?? property.documentationFee,
      lettingFee: overview?.lettingFee ?? record?.lettingFee ?? property.lettingFee,
      managementRatePercent:
        overview?.managementRatePercent ??
        record?.managementRatePercent ??
        property.managementRatePercent,
      managementRateGst: gst,
      latitude: overview?.latitude ?? record?.latitude ?? property.latitude,
      longitude: overview?.longitude ?? record?.longitude ?? property.longitude,
    };
  }, [overview, property, sync.record]);

  const strataMeta = formatStrataMeta(
    overview?.buildingName ?? sync.record?.buildingName ?? property.buildingName,
    overview?.strataPlanNumber ?? sync.record?.strataPlanNumber ?? property.strataPlanNumber,
  );
  const showStrataTile = hasContact(strataContact) || Boolean(strataMeta);

  const managementGstLabel =
    registry.managementRateGst === 'include'
      ? 'Include GST'
      : registry.managementRateGst === 'exclude'
        ? 'Exclude GST'
        : '—';

  const handleSaved = () => {
    onRefresh?.();
  };

  return (
    <div className="space-y-3">
      {needActions.length > 0 || maintenance.length > 0 ? (
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <ListTodo className="text-primary size-3.5" />
            <h3 className="text-xs font-semibold">Tasks</h3>
          </div>
          <div className="space-y-1.5">
            {needActions.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className="block rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] font-semibold text-destructive"
              >
                {a.label}
              </Link>
            ))}
            {maintenance.map((m) => (
              <TaskStatusRow
                key={m.id}
                item={{
                  id: m.id,
                  propertyAddress: m.propertyAddress,
                  taskLabel: m.title,
                  status: m.status,
                  href: maintenanceDetail(m.id, fromProperty(propertyId, 'Maintenance')),
                  module: 'Maintenance',
                  requiresApproval: m.requiresApproval,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Property registry / rent / reports strip lives in the profile header card. */}
      {/* Property photos — temporarily hidden
      <div className="mt-2.5">
        <PropertyPhotosButton propertyAddress={`${property.address}, ${property.suburb}`} />
      </div>
      */}

      <section className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 text-xs font-semibold">Contacts</h3>
        <div className="grid grid-cols-2 gap-1.5">
          <ContactTile
            title="Landlord"
            name={landlord.name}
            email={landlord.email}
            phone={landlord.phone}
            updatedHint={landlordUpdatedHint}
            onEdit={apiConnected ? () => setLandlordDialogOpen(true) : undefined}
          />
          <ContactTile
            title="Tenant"
            name={tenant.name}
            email={tenant.email}
            phone={tenant.phone}
            updatedHint={tenant.hint}
          />
          {hasContact(buildingManager) ? (
            <ContactTile
              title="Building manager"
              name={buildingManager?.name}
              email={buildingManager?.email}
              phone={buildingManager?.mobile}
              onEdit={apiConnected ? () => setBuildingDialogOpen(true) : undefined}
            />
          ) : (
            <ContactTile
              title="Building manager"
              variant="add"
              onAdd={apiConnected ? () => setBuildingDialogOpen(true) : undefined}
            />
          )}
          {showStrataTile ? (
            <ContactTile
              title="Strata"
              name={strataContact?.name}
              email={strataContact?.email}
              phone={strataContact?.mobile}
              meta={strataMeta || undefined}
              onEdit={apiConnected ? () => setBuildingDialogOpen(true) : undefined}
            />
          ) : (
            <ContactTile
              title="Strata"
              variant="add"
              onAdd={apiConnected ? () => setBuildingDialogOpen(true) : undefined}
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 text-xs font-semibold">Management details</h3>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <StatCell
            label="Insurance expiry"
            value={
              registry.landlordInsuranceExpiry
                ? formatDate(registry.landlordInsuranceExpiry)
                : '—'
            }
          />
          <StatCell
            label="Administration fee"
            value={
              registry.administrationFee != null
                ? formatCurrency(registry.administrationFee)
                : '—'
            }
          />
          <StatCell
            label="Documentation fee"
            value={
              registry.documentationFee != null
                ? formatCurrency(registry.documentationFee)
                : '—'
            }
          />
          <StatCell
            label="Letting fee"
            value={registry.lettingFee != null ? formatCurrency(registry.lettingFee) : '—'}
          />
          <StatCell
            label="Management rate"
            value={
              registry.managementRatePercent != null
                ? `${registry.managementRatePercent}%`
                : '—'
            }
          />
          <StatCell label="Management GST" value={managementGstLabel} />
          <StatCell
            label="Coordinates"
            value={
              registry.latitude != null && registry.longitude != null
                ? `${registry.latitude.toFixed(5)}, ${registry.longitude.toFixed(5)}`
                : '—'
            }
          />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-3">
        <h3 className="text-xs font-semibold">Key dates</h3>
        <p className="text-muted-foreground mb-2 text-[10px]">
          From property registry and synced leasing workflows.
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {keyDates.map((item) => (
            <StatCell
              key={item.label}
              label={item.label}
              value={item.value ? formatDate(item.value) : '—'}
            />
          ))}
        </div>
      </section>

      {!isVacant ? (
        <section className="rounded-xl border bg-card p-3">
          <h3 className="mb-2 text-xs font-semibold">Tenancy</h3>
          <div className="grid grid-cols-2 gap-1.5">
            <StatCell
              label="Lease start"
              value={leaseStart ? formatDate(leaseStart) : '—'}
            />
            <StatCell label="Lease end" value={leaseEnd ? formatDate(leaseEnd) : '—'} />
          </div>
          {pendingRent ? (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <StatCell
                label="New rent"
                value={`${formatCurrency(pendingRent.newRent)}/wk`}
              />
              <StatCell
                label="New rent from"
                value={formatDate(pendingRent.startDate)}
              />
            </div>
          ) : tenancyRentReviews.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-[10px]">No pending rent review.</p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border bg-card p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <History className="text-primary size-3.5" />
          <h3 className="text-xs font-semibold">History</h3>
        </div>
        <TenancyHistorySection
          propertyId={propertyId}
          records={leasing}
          compact
          onViewAll={onViewHistory}
        />
      </section>

      <PropertyLandlordEditDialog
        open={landlordDialogOpen}
        onOpenChange={setLandlordDialogOpen}
        propertyId={propertyId}
        initial={{
          name: landlord.name === '—' ? '' : landlord.name,
          email: landlord.email ?? '',
          phone: landlord.phone ?? '',
        }}
        onSaved={handleSaved}
      />

      <PropertyBuildingContactsDialog
        open={buildingDialogOpen}
        onOpenChange={setBuildingDialogOpen}
        propertyId={propertyId}
        onSaved={handleSaved}
      />
    </div>
  );
}
