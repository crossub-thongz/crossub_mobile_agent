'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

import { CreateTribunalRentChasingDialog } from '@/components/agent/create-tribunal-rent-chasing-dialog';
import { PropertyWorkflowCreateDialog } from '@/components/agent/property-workflow-panel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildPropertyWorkflowContext,
  tabActionsFor,
  type PropertyWorkflowActionId,
  type PropertyWorkflowTab,
} from '@/lib/property-workflow-actions';
import type { PropertyWorkflowCreatedResult } from '@/lib/property-workflow-created';

const ACTION_TAB: Record<
  Exclude<PropertyWorkflowActionId, `schedule_${string}` | 'start_leasing' | 'start_end_leasing'>,
  PropertyWorkflowTab
> = {
  start_maintenance: 'maintenance',
  start_rent_review: 'rent_review',
  open_tribunal: 'tribunal',
  open_rent_chasing: 'accounting',
};

const ACTION_LABEL: Partial<Record<PropertyWorkflowActionId, string>> = {
  start_maintenance: 'Add new repair job',
  start_rent_review: 'Rent review',
  open_tribunal: 'Rent chasing',
  open_rent_chasing: 'Rent chasing',
};

function workflowTabFor(actionId: PropertyWorkflowActionId): PropertyWorkflowTab | null {
  if (actionId in ACTION_TAB) {
    return ACTION_TAB[actionId as keyof typeof ACTION_TAB];
  }
  return null;
}

export function QuickCreateWorkflowDialog({
  actionId,
  open,
  onOpenChange,
  initialPropertyId,
  onCreated,
}: {
  actionId: PropertyWorkflowActionId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPropertyId?: string;
  onCreated?: (result?: PropertyWorkflowCreatedResult) => void;
}) {
  const {
    properties,
    primaryAgency,
    leasingRecords,
    leasingCycles,
    rentReviews,
    vacating,
    maintenanceAll,
    inspections,
    tribunalCases,
    tenantSelections,
    refresh,
  } = useAgentData();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(initialPropertyId);
  const [formOpen, setFormOpen] = useState(false);

  const filteredProperties = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.address.toLowerCase().includes(q) ||
        p.suburb.toLowerCase().includes(q) ||
        p.tenantName.toLowerCase().includes(q),
    );
  }, [properties, search]);

  const property = properties.find((p) => p.id === selectedPropertyId);
  const propertyId = property?.id;

  const propertyLeasing = useMemo(
    () => (propertyId ? leasingRecords.filter((l) => l.propertyId === propertyId) : []),
    [leasingRecords, propertyId],
  );
  const currentLease =
    propertyLeasing.find((l) => l.status === 'current') ??
    propertyLeasing.find((l) => l.status === 'upcoming');
  const propertyLeasingCycles = useMemo(
    () => (propertyId ? leasingCycles.filter((c) => c.propertyId === propertyId) : []),
    [leasingCycles, propertyId],
  );
  const propertyRentReviews = useMemo(
    () => (propertyId ? rentReviews.filter((r) => r.propertyId === propertyId) : []),
    [rentReviews, propertyId],
  );
  const propertyVacating = useMemo(
    () => (propertyId ? vacating.filter((v) => v.propertyId === propertyId) : []),
    [vacating, propertyId],
  );
  const propertyMaintenance = useMemo(
    () =>
      propertyId
        ? maintenanceAll.filter(
            (m) => m.propertyId === propertyId || m.propertyAddress.includes(property?.address ?? ''),
          )
        : [],
    [maintenanceAll, propertyId, property?.address],
  );
  const propertyInspections = useMemo(
    () => (propertyId ? inspections.filter((i) => i.propertyId === propertyId) : []),
    [inspections, propertyId],
  );
  const propertyTribunal = useMemo(
    () => (propertyId ? tribunalCases.filter((c) => c.propertyId === propertyId) : []),
    [tribunalCases, propertyId],
  );
  const propertyTenantSelections = useMemo(
    () => (propertyId ? tenantSelections.filter((t) => t.propertyId === propertyId) : []),
    [tenantSelections, propertyId],
  );

  const reset = () => {
    setSearch('');
    setSelectedPropertyId(initialPropertyId);
    setPickerOpen(false);
    setFormOpen(false);
  };

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    setSelectedPropertyId(initialPropertyId);
    if (initialPropertyId) {
      setFormOpen(true);
      setPickerOpen(false);
    } else {
      setFormOpen(false);
      setPickerOpen(true);
    }
  }, [open, initialPropertyId, actionId]);

  useEffect(() => {
    if (!open || !formOpen || !actionId || !propertyId) return;
    const tab = workflowTabFor(actionId);
    if (!tab) return;
    const ctx = buildPropertyWorkflowContext({
      propertyId,
      leasingCycles: propertyLeasingCycles,
      rentReviews: propertyRentReviews,
      vacatingCases: propertyVacating,
      maintenance: propertyMaintenance,
      inspections: propertyInspections,
      tribunalCases: propertyTribunal,
      currentLease,
    });
    const action = tabActionsFor(tab, ctx).find((row) => row.id === actionId);
    if (action?.disabled) {
      toast.error(action.description ?? 'This action is not available for the selected property.');
      onOpenChange(false);
    }
  }, [
    open,
    formOpen,
    actionId,
    propertyId,
    propertyLeasingCycles,
    propertyRentReviews,
    propertyVacating,
    propertyMaintenance,
    propertyInspections,
    propertyTribunal,
    currentLease,
    onOpenChange,
  ]);

  const closeAll = () => {
    onOpenChange(false);
  };

  const confirmProperty = (id: string) => {
    setSelectedPropertyId(id);
    setPickerOpen(false);
    setFormOpen(true);
  };

  const handleCreated = async (result?: PropertyWorkflowCreatedResult) => {
    await refresh();
    onCreated?.(result);
    closeAll();
  };

  if (!open || !actionId) return null;

  const label = ACTION_LABEL[actionId] ?? 'Quick create';

  return (
    <>
      <Dialog
        open={pickerOpen}
        onOpenChange={(next) => {
          if (!next) closeAll();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>Select a property to continue.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search address or tenant…"
              className="rounded-xl pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-52 space-y-1.5 overflow-y-auto">
            {filteredProperties.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">No properties found.</p>
            ) : (
              filteredProperties.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => confirmProperty(p.id)}
                  className="flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-primary/30 hover:bg-secondary"
                >
                  <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="font-medium">{p.address}</span>
                    <span className="text-muted-foreground block text-xs">{p.suburb}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {property && propertyId && formOpen && actionId !== 'open_tribunal' && actionId !== 'open_rent_chasing' ? (
        <PropertyWorkflowCreateDialog
          actionId={actionId}
          open
          onOpenChange={(next) => {
            if (!next) closeAll();
          }}
          property={property}
          propertyId={propertyId}
          agency={primaryAgency}
          currentLease={currentLease}
          leasingCycle={propertyLeasingCycles[0]}
          tenantSelections={propertyTenantSelections}
          onSuccess={handleCreated}
        />
      ) : null}

      {propertyId && formOpen && (actionId === 'open_tribunal' || actionId === 'open_rent_chasing') ? (
        <CreateTribunalRentChasingDialog
          open
          onOpenChange={(next) => {
            if (!next) closeAll();
          }}
          propertyId={propertyId}
          properties={properties}
          mode={actionId === 'open_tribunal' ? 'tribunal' : 'rent_chasing'}
          onCreated={(caseId) => {
            void handleCreated({ kind: 'tribunal', id: caseId });
          }}
        />
      ) : null}
    </>
  );
}
