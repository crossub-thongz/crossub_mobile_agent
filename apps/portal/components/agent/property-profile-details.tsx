'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { PropertyBuildingContactsDialog } from '@/components/agent/property-building-contacts-dialog';
import {
  ContactTile,
  formatStrataMeta,
  hasContact,
} from '@/components/agent/property-contact-tile';
import { useAgentData } from '@/components/providers/agent-data-provider';
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
    <div className="rounded-lg border border-border/40 bg-background/60 px-2.5 py-2">
      <div className="flex items-center justify-between gap-1">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
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
          className="text-primary mt-0.5 text-left text-sm font-semibold"
        >
          {value}
        </button>
      ) : (
        <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
      )}
    </div>
  );
}

function formatKeyFobCount(count: number | null | undefined): string {
  if (count == null) return '—';
  return count === 1 ? '1 fob' : `${count} fobs`;
}

/** Registry strip merged into the property profile header card. */
export function PropertyProfileDetails({
  property,
  propertyId,
  currentLease,
  inspections: _inspections,
  propertyDocs: _propertyDocs,
  leasingCycles,
  tenantSelections,
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

  const [open, setOpen] = useState(true);
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);

  const furnished =
    sync.overview?.furnished ??
    (typeof sync.record?.furnished === 'boolean' ? sync.record.furnished : property.furnished);

  const overview = sync.overview;
  const buildingManager = overview?.buildingManager;
  const strataContact = overview?.strataContact;

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
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <h3 className="text-sm font-semibold">Property details</h3>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs capitalize">{property.leaseStatus}</span>
          {open ? (
            <ChevronUp className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          )}
        </span>
      </button>

      {open ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatCell
              label="Furnished"
              value={registry.furnished == null ? '—' : registry.furnished ? 'Yes' : 'No'}
            />
            <StatCell label="Property type" value={registry.propertyType ?? '—'} />
            <StatCell label="Key fob" value={formatKeyFobCount(sync.keyFobCount)} />
          </div>

          <div className="mt-2 space-y-2">
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
        </>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">
          {registry.propertyType ?? 'Property'}
          {registry.furnished != null ? ` · ${registry.furnished ? 'Furnished' : 'Unfurnished'}` : ''}
          {sync.keyFobCount != null ? ` · ${formatKeyFobCount(sync.keyFobCount)}` : ''}
        </p>
      )}

      <PropertyBuildingContactsDialog
        open={buildingDialogOpen}
        onOpenChange={setBuildingDialogOpen}
        propertyId={propertyId}
        onSaved={handleSaved}
      />
    </div>
  );
}
