'use client';

import { useEffect, useMemo, useState } from 'react';

import { AddHandymanDialog } from '@/components/end-leasing/add-handyman-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchMaintenanceContractorSuggestions,
  type MaintenanceContractorSuggestion,
} from '@/lib/crossub-api/maintenance-client';
import {
  fetchPreferredContractors,
  type PreferredContractor,
} from '@/lib/crossub-api/agent-client';
import {
  MAINTENANCE_CONTRACTOR_AUTO_PICK_COUNT,
  MAINTENANCE_CONTRACTOR_PREVIEW_COUNT,
  topMaintenanceContractorIds,
} from '@/lib/maintenance/maintenance-contractor-list.constants';
import { useContractorAutoPick } from '@/lib/maintenance/use-contractor-auto-pick';
import { maintenanceContractorSelectionKey } from '@/lib/maintenance/maintenance-contractor-key';
import { cn } from '@/lib/utils';

function mapPreferredToSuggestion(row: PreferredContractor): MaintenanceContractorSuggestion {
  const key = maintenanceContractorSelectionKey(row);
  return {
    id: key,
    contractorId: row.contractorId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    serviceTypes: row.serviceTypes ?? [],
    isPreferred: true,
    isTopPick: false,
    rating: null,
  };
}

function ContractorSuggestionRow({
  contractor,
  index,
  active,
  isAutoPick,
  isClientPreferred,
  disabled,
  onToggle,
}: {
  contractor: MaintenanceContractorSuggestion;
  index: number;
  active: boolean;
  isAutoPick: boolean;
  isClientPreferred: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-left transition-colors',
        active
          ? 'border-primary bg-primary/10'
          : 'border-border bg-background hover:bg-secondary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            readOnly
            checked={active}
            className="mt-1 size-4 accent-primary"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{contractor.name}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {[contractor.email, contractor.phone].filter(Boolean).join(' · ') || '—'}
            </p>
            {contractor.serviceTypes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {contractor.serviceTypes.slice(0, 4).map((tag) => (
                  <span
                    key={`${contractor.id}-${tag}`}
                    className="text-muted-foreground rounded bg-muted/40 px-2 py-0.5 text-[10px] font-medium ring-1 ring-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isClientPreferred ? (
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              Preferred
            </span>
          ) : null}
          {isAutoPick ? (
            <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Auto
            </span>
          ) : null}
          {!isAutoPick && index < MAINTENANCE_CONTRACTOR_AUTO_PICK_COUNT ? (
            <span className="text-muted-foreground text-[10px] tabular-nums">#{index + 1}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function MaintenanceResponsibilityLandlordPanel({
  requestId,
  agencyId,
  apiConnected,
  selectedContractorIds,
  onChangeSelectedContractorIds,
  disabled = false,
}: {
  requestId: string;
  agencyId?: string | null;
  apiConnected: boolean;
  selectedContractorIds: string[];
  onChangeSelectedContractorIds: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MaintenanceContractorSuggestion[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);

  const loadSuggestions = async () => {
    if (!apiConnected) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const ranked = await fetchMaintenanceContractorSuggestions(requestId);
      if (ranked.length > 0) {
        setSuggestions(ranked);
        return;
      }
      if (agencyId) {
        const preferred = await fetchPreferredContractors(agencyId);
        setSuggestions(preferred.map(mapPreferredToSuggestion));
      } else {
        setSuggestions([]);
      }
    } catch {
      if (agencyId) {
        try {
          const preferred = await fetchPreferredContractors(agencyId);
          setSuggestions(preferred.map(mapPreferredToSuggestion));
        } catch {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when request/agency changes
  }, [requestId, agencyId, apiConnected]);

  const { markSelectionTouched } = useContractorAutoPick({
    enabled: true,
    contractors: suggestions,
    selectedIds: selectedContractorIds,
    onChangeSelectedIds: onChangeSelectedContractorIds,
    resetKey: requestId,
  });

  const preferredIds = useMemo(
    () => new Set(suggestions.filter((row) => row.isPreferred).map((row) => row.id)),
    [suggestions],
  );

  const autoPickIds = useMemo(
    () => new Set(topMaintenanceContractorIds(suggestions)),
    [suggestions],
  );

  const previewSuggestions = suggestions.slice(0, MAINTENANCE_CONTRACTOR_PREVIEW_COUNT);
  const moreSuggestions = suggestions.slice(MAINTENANCE_CONTRACTOR_PREVIEW_COUNT);

  const toggleContractor = (contractorId: string) => {
    markSelectionTouched();
    onChangeSelectedContractorIds(
      selectedContractorIds.includes(contractorId)
        ? selectedContractorIds.filter((id) => id !== contractorId)
        : [...selectedContractorIds, contractorId],
    );
  };

  const handleCreated = (contractor: PreferredContractor) => {
    const mapped = mapPreferredToSuggestion(contractor);
    setSuggestions((prev) => [mapped, ...prev.filter((row) => row.id !== mapped.id)]);
    markSelectionTouched();
    onChangeSelectedContractorIds([
      ...new Set([...selectedContractorIds, maintenanceContractorSelectionKey(contractor)]),
    ]);
  };

  const renderContractor = (contractor: MaintenanceContractorSuggestion, index: number) => {
    const active = selectedContractorIds.includes(contractor.id);
    const isAutoPick =
      active &&
      selectedContractorIds.length <= MAINTENANCE_CONTRACTOR_AUTO_PICK_COUNT &&
      autoPickIds.has(contractor.id) &&
      selectedContractorIds.every((id) => autoPickIds.has(id));
    const isClientPreferred = preferredIds.has(contractor.id);

    return (
      <ContractorSuggestionRow
        key={contractor.id}
        contractor={contractor}
        index={index}
        active={active}
        isAutoPick={isAutoPick}
        isClientPreferred={isClientPreferred}
        disabled={disabled}
        onToggle={() => toggleContractor(contractor.id)}
      />
    );
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Tradesmen
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            disabled={disabled || !agencyId}
            onClick={() => setAddOpen(true)}
          >
            + Add
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Top {MAINTENANCE_CONTRACTOR_AUTO_PICK_COUNT} ranked tradesmen are pre-selected (untick any you
          do not want). Adjust before confirming — only your selection is sent when you submit.
        </p>

        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-muted-foreground text-xs">Loading contractor suggestions…</p>
          ) : suggestions.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No contractors yet. Add a tradesman to your agency preferred list.
            </p>
          ) : (
            <>
              {previewSuggestions.map((contractor, index) => renderContractor(contractor, index))}
              {moreSuggestions.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={disabled}
                  onClick={() => setViewMoreOpen(true)}
                >
                  View more ({moreSuggestions.length} more)
                </Button>
              ) : null}
            </>
          )}
        </div>

        {selectedContractorIds.length > 0 ? (
          <p className="text-muted-foreground mt-3 text-[11px]">
            {selectedContractorIds.length} contractor
            {selectedContractorIds.length === 1 ? '' : 's'} selected for quote review.
          </p>
        ) : null}
      </div>

      <Dialog open={viewMoreOpen} onOpenChange={setViewMoreOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>All tradesmen</DialogTitle>
            <DialogDescription>
              Select contractors for the quote request. Your submission replaces any unsent picks from
              other users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {suggestions.map((contractor, index) => renderContractor(contractor, index))}
          </div>
        </DialogContent>
      </Dialog>

      <AddHandymanDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        agencyId={agencyId}
        onCreated={handleCreated}
      />
    </>
  );
}
