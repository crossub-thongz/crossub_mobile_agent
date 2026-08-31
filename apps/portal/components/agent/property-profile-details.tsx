'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Home } from 'lucide-react';

import { PropertyBuildingContactsDialog } from '@/components/agent/property-building-contacts-dialog';
import {
  ContactTile,
  formatStrataMeta,
  hasContact,
} from '@/components/agent/property-contact-tile';
import { PropertyProfileInfoCard } from '@/components/agent/property-profile/property-profile-info-card';
import { PropertyTenancyManagementSections } from '@/components/agent/property-tenancy-management-sections';
import { RentEquivalentsHint } from '@/components/rent-equivalents-hint';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import {
  formatProfileLeaseStatus,
  formatUpcomingRentChangeHint,
  resolveCurrentRent,
  resolveLeaseDates,
  resolveUpcomingAcceptedRentChange,
} from '@/lib/property-overview';
import type { PropertyContactBlock } from '@/lib/property-registry-api';
import type {
  AgentDocument,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  VacatingCase,
} from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

function StatCell({
  label,
  value,
  hint,
  onClick,
  onEdit,
  labelAccessory,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
  onEdit?: () => void;
  labelAccessory?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/60 px-2.5 py-2">
      <div className="flex items-center justify-between gap-1">
        <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
          <span>{label}</span>
          {labelAccessory}
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
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="text-primary mt-0.5 text-left text-sm font-semibold"
        >
          {value}
        </button>
      ) : (
        <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
      )}
      {hint ? (
        <p className="text-muted-foreground mt-0.5 text-[10px] leading-snug tabular-nums">
          → {hint}
        </p>
      ) : null}
    </div>
  );
}

function formatKeyFobCount(count: number | null | undefined): string {
  if (count == null) return '—';
  return count === 1 ? '1 fob' : `${count} fobs`;
}

function contactFromScalars(
  name?: string | null,
  email?: string | null,
  phone?: string | null,
): PropertyContactBlock | undefined {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedPhone = phone?.trim();
  if (!trimmedName && !trimmedEmail && !trimmedPhone) return undefined;
  return {
    name: trimmedName || undefined,
    email: trimmedEmail || undefined,
    mobile: trimmedPhone || undefined,
  };
}

/** Collapsible property, tenancy, and management details in the profile header card. */
export function PropertyProfileDetails({
  property,
  propertyId,
  currentLease,
  inspections: _inspections,
  propertyDocs,
  leasingCycles,
  tenantSelections,
  vacatingCases = [],
  rentReviews = [],
  onViewBondLodgement: _onViewBondLodgement,
  onRefresh,
}: {
  property: Property;
  propertyId: string;
  currentLease?: LeasingRecord;
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasingCycles?: LeasingCycle[];
  tenantSelections?: TenantSelectionCase[];
  vacatingCases?: VacatingCase[];
  rentReviews?: RentReviewCase[];
  onViewBondLodgement?: () => void;
  onRefresh?: () => void;
}) {
  const { apiConnected } = useAgentData();
  const isV2 = useIsAgentUiV2();
  const activeCycle = leasingCycles?.[0];
  const sync = usePropertyOverviewSync(
    property,
    apiConnected,
    activeCycle,
    tenantSelections,
    currentLease,
  );

  const [open, setOpen] = useState(false);
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);

  const furnished =
    sync.overview?.furnished ??
    (typeof sync.record?.furnished === 'boolean' ? sync.record.furnished : property.furnished);

  const overview = sync.overview;
  const buildingManager = hasContact(overview?.buildingManager)
    ? overview?.buildingManager
    : contactFromScalars(
        sync.record?.buildingManagerName ?? property.buildingManagerName,
        sync.record?.buildingManagerEmail ?? property.buildingManagerEmail,
        sync.record?.buildingManagerPhone ?? property.buildingManagerPhone,
      );
  const strataContact = hasContact(overview?.strataContact)
    ? overview?.strataContact
    : contactFromScalars(
        sync.record?.strataContactName ?? property.strataContactName,
        sync.record?.strataContactEmail ?? property.strataContactEmail,
        sync.record?.strataContactPhone ?? property.strataContactPhone,
      );

  const strataMeta = formatStrataMeta(
    overview?.buildingName ?? sync.record?.buildingName ?? property.buildingName,
    overview?.strataPlanNumber ?? sync.record?.strataPlanNumber ?? property.strataPlanNumber,
  );
  const showStrataTile = hasContact(strataContact) || Boolean(strataMeta);

  const registry = useMemo(
    () => ({
      propertyType: property.propertyType,
      furnished,
    }),
    [property.propertyType, furnished],
  );

  const currentRent = resolveCurrentRent(property, currentLease);
  const financialRent = sync.financial?.currentRentWeekly;
  const registryRent = sync.record?.rentWeekly ?? property.rentWeekly;
  const displayRent =
    financialRent != null && financialRent > 0
      ? financialRent
      : registryRent != null && registryRent > 0
        ? registryRent
        : currentRent;
  const weeklyRentLabel =
    displayRent != null && displayRent > 0 ? `${formatCurrency(displayRent)}/wk` : '—';
  const upcomingRentChange = useMemo(
    () => resolveUpcomingAcceptedRentChange(rentReviews, displayRent),
    [rentReviews, displayRent],
  );
  const upcomingRentHint = upcomingRentChange
    ? formatUpcomingRentChangeHint(upcomingRentChange)
    : undefined;

  const profileLeaseStatus = useMemo(() => {
    const { end } = resolveLeaseDates(property, currentLease);
    const leaseEnd =
      overview?.leaseEndDate ?? sync.record?.leaseEndDate ?? end ?? property.leaseEnd;
    return formatProfileLeaseStatus(property, leaseEnd);
  }, [property, currentLease, overview, sync.record]);

  const handleSaved = () => {
    onRefresh?.();
  };

  const propertyFacts = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCell
          label="Furnished"
          value={registry.furnished == null ? '—' : registry.furnished ? 'Yes' : 'No'}
        />
        <StatCell label="Property type" value={registry.propertyType ?? '—'} />
        <StatCell label="Key fob" value={formatKeyFobCount(sync.keyFobCount)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatCell
          label="Weekly rent"
          value={weeklyRentLabel}
          hint={upcomingRentHint}
          labelAccessory={
            displayRent != null && displayRent > 0 ? (
              <RentEquivalentsHint weekly={displayRent} />
            ) : undefined
          }
        />
        <StatCell label="Lease status" value={profileLeaseStatus} />
      </div>
      {property.paymentReference ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Rent payment reference
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-wide text-amber-950 dark:text-amber-50">
            {property.paymentReference}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[10px] leading-snug">
            Quote this reference when paying rent by bank transfer.
          </p>
        </div>
      ) : null}
      {hasContact(buildingManager) ? (
        <ContactTile
          title="Building manager"
          layout="row"
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
          layout="row"
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
  );

  const tenancySections = (
    <PropertyTenancyManagementSections
      property={property}
      propertyId={propertyId}
      currentLease={currentLease}
      propertyDocs={propertyDocs}
      leasingCycles={leasingCycles}
      tenantSelections={tenantSelections}
      vacatingCases={vacatingCases}
      onRefresh={onRefresh}
    />
  );

  if (!isV2) {
    return (
      <div className="mt-3 border-t border-border/50 pt-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center gap-2 text-left lg:pointer-events-none"
          aria-expanded={open}
        >
          <h3 className="text-sm font-semibold">Property details</h3>
          {open ? (
            <ChevronUp className="text-muted-foreground size-4 shrink-0 lg:hidden" aria-hidden />
          ) : (
            <ChevronDown className="text-muted-foreground size-4 shrink-0 lg:hidden" aria-hidden />
          )}
        </button>

        <div className={cn('mt-3 space-y-3', !open && 'hidden lg:block')}>
          {propertyFacts}
          {tenancySections}
        </div>

        <PropertyBuildingContactsDialog
          open={buildingDialogOpen}
          onOpenChange={setBuildingDialogOpen}
          propertyId={propertyId}
          onSaved={handleSaved}
        />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <PropertyProfileInfoCard title="Property details" icon={Home}>
          {propertyFacts}
        </PropertyProfileInfoCard>
        {tenancySections}
      </div>

      <PropertyBuildingContactsDialog
        open={buildingDialogOpen}
        onOpenChange={setBuildingDialogOpen}
        propertyId={propertyId}
        onSaved={handleSaved}
      />
    </>
  );
}
