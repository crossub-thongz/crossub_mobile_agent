'use client';

import { useEffect, useMemo, useState } from 'react';

import { AddHandymanDialog } from '@/components/end-leasing/add-handyman-dialog';
import { Button } from '@/components/ui/button';
import {
  fetchMaintenanceContractorSuggestions,
  type MaintenanceContractorSuggestion,
} from '@/lib/crossub-api/maintenance-client';
import {
  fetchPreferredContractors,
  type PreferredContractor,
} from '@/lib/crossub-api/agent-client';
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

  useEffect(() => {
    if (selectedContractorIds.length > 0 || suggestions.length === 0) return;
    const topPick = suggestions.find((row) => row.isTopPick) ?? suggestions[0];
    if (topPick) onChangeSelectedContractorIds([topPick.id]);
  }, [onChangeSelectedContractorIds, selectedContractorIds.length, suggestions]);

  const preferredIds = useMemo(
    () => new Set(suggestions.filter((row) => row.isPreferred).map((row) => row.id)),
    [suggestions],
  );

  const toggleContractor = (contractorId: string) => {
    onChangeSelectedContractorIds(
      selectedContractorIds.includes(contractorId)
        ? selectedContractorIds.filter((id) => id !== contractorId)
        : [...selectedContractorIds, contractorId],
    );
  };

  const handleCreated = (contractor: PreferredContractor) => {
    const mapped = mapPreferredToSuggestion(contractor);
    setSuggestions((prev) => [mapped, ...prev.filter((row) => row.id !== mapped.id)]);
    onChangeSelectedContractorIds([
      ...new Set([...selectedContractorIds, maintenanceContractorSelectionKey(contractor)]),
    ]);
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
          Select one or more tradesmen to send for quote review. Each selected contractor receives
          an RFQ when you confirm responsibility.
        </p>

        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-muted-foreground text-xs">Loading contractor suggestions…</p>
          ) : suggestions.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No contractors yet. Add a tradesman to your agency preferred list.
            </p>
          ) : (
            suggestions.map((contractor, index) => {
              const active = selectedContractorIds.includes(contractor.id);
              const isAutoPick =
                active && selectedContractorIds.length === 1 && (contractor.isTopPick || index === 0);
              const isClientPreferred = preferredIds.has(contractor.id);

              return (
                <button
                  key={contractor.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleContractor(contractor.id)}
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
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selectedContractorIds.length > 0 ? (
          <p className="text-muted-foreground mt-3 text-[11px]">
            {selectedContractorIds.length} contractor
            {selectedContractorIds.length === 1 ? '' : 's'} selected for quote review.
          </p>
        ) : null}
      </div>

      <AddHandymanDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        agencyId={agencyId}
        onCreated={handleCreated}
      />
    </>
  );
}
