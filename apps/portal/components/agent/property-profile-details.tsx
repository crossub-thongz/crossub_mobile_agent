'use client';

import { useMemo, useState } from 'react';

import { PropertyBondEditDialog } from '@/components/agent/property-bond-edit-dialog';
import { PropertyBuildingContactsDialog } from '@/components/agent/property-building-contacts-dialog';
import {
  ContactTile,
  formatStrataMeta,
  hasContact,
} from '@/components/agent/property-contact-tile';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  formatBondDisplay,
  resolveBondReference,
  resolveBondReferenceRaw,
} from '@/lib/property-overview';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import type {
  AgentDocument,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  Property,
  TenantSelectionCase,
} from '@/lib/types';

function StatCell({
  label,
  value,
  onClick,
  onEdit,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/60 px-2 py-1.5">
      <div className="flex items-center justify-between gap-1">
        <p className="text-muted-foreground text-[9px] font-medium uppercase tracking-wide">
          {label}
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

/** Registry strip merged into the property profile header card. */
export function PropertyProfileDetails({
  property,
  propertyId,
  currentLease,
  inspections: _inspections,
  propertyDocs,
  leasingCycles,
  tenantSelections,
  onViewBondLodgement,
  onRefresh,
}: {
  property: Property;
  propertyId: string;
  currentLease?: LeasingRecord;
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasingCycles?: LeasingCycle[];
  tenantSelections?: TenantSelectionCase[];
  onViewBondLodgement?: () => void;
  onRefresh?: () => void;
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

  const [bondDialogOpen, setBondDialogOpen] = useState(false);
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);

  const displayBond =
    sync.financial?.bondAmount ??
    sync.record?.bondAmount ??
    property.bondAmount ??
    sync.bond?.amount ??
    null;

  const furnished =
    sync.overview?.furnished ??
    (typeof sync.record?.furnished === 'boolean' ? sync.record.furnished : property.furnished);

  const overview = sync.overview;
  const buildingManager = overview?.buildingManager;
  const strataContact = overview?.strataContact;

  const bondRef = resolveBondReference(property, sync.bond, propertyDocs, currentLease);
  const bondDisplay = formatBondDisplay(displayBond, bondRef);
  const bondReferenceRaw = resolveBondReferenceRaw(property, sync.bond);

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

  const handleSaved = () => {
    onRefresh?.();
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">Property details</h3>
        <span className="text-muted-foreground text-[10px] capitalize">{property.leaseStatus}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <StatCell
          label="Furnished"
          value={registry.furnished == null ? '—' : registry.furnished ? 'Yes' : 'No'}
        />
        <StatCell label="Property type" value={registry.propertyType ?? '—'} />
        <StatCell
          label="Bond"
          value={bondDisplay}
          onClick={
            bondRef.showLodgementNav && onViewBondLodgement ? onViewBondLodgement : undefined
          }
          onEdit={apiConnected ? () => setBondDialogOpen(true) : undefined}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
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

      <PropertyBondEditDialog
        open={bondDialogOpen}
        onOpenChange={setBondDialogOpen}
        propertyId={propertyId}
        leasingCycleId={activeCycle?.id}
        initialAmount={displayBond}
        initialReference={bondReferenceRaw}
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
