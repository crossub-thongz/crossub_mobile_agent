'use client';

import { useMemo, useState } from 'react';
import { Archive, Loader2, Pin, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  PINNABLE_LEASING_RECORD_STATUS,
  PROPERTY_EDIT_COPY as COPY,
} from '@/constants/property-profile-edit';
import {
  archivePropertyTenancy,
  restorePropertyTenancy,
  setCurrentPropertyTenancy,
} from '@/lib/crossub-api/agent-client';
import type { Property } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Tenancy actions staff Properties had and the agent app did not: archive the current tenant,
 * restore a past tenancy (by its own `archivedAt`), and pin which live agreement is current
 * when the lease dates pick the wrong one.
 */
export function PropertyTenancyActions({
  property,
  viewingArchiveAt,
  hasCurrentTenant,
  onRefresh,
}: {
  property: Property;
  /** The `archivedAt` of the past tenancy on screen; null while the current one is shown. */
  viewingArchiveAt: string | null;
  hasCurrentTenant: boolean;
  onRefresh?: () => void;
}) {
  const { leasingRecords } = useAgentData();
  const [busy, setBusy] = useState(false);

  const pinnable = useMemo(
    () =>
      leasingRecords.filter(
        (l) => l.propertyId === property.id && l.status === PINNABLE_LEASING_RECORD_STATUS,
      ),
    [leasingRecords, property.id],
  );
  const pinnedId = property.pinnedTenancyId ?? null;
  // Pinning only means something when more than one live agreement could be "current".
  const showPins = pinnable.length > 1 || pinnedId !== null;

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      onRefresh?.();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const archive = () => {
    if (!window.confirm(COPY.archiveConfirm)) return;
    void run(() => archivePropertyTenancy(property.id), COPY.archived);
  };

  const restore = (archivedAt: string) => {
    if (!window.confirm(COPY.restoreConfirm)) return;
    void run(() => restorePropertyTenancy(property.id, archivedAt), COPY.restored);
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        {viewingArchiveAt ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            disabled={busy || hasCurrentTenant}
            onClick={() => restore(viewingArchiveAt)}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            {COPY.restoreTenancy}
          </Button>
        ) : hasCurrentTenant ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={archive}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
            {COPY.archiveTenant}
          </Button>
        ) : null}
      </div>

      {!viewingArchiveAt && showPins ? (
        <div className="rounded-lg border border-border/40 bg-background/60 px-2.5 py-2">
          <p className="text-[11px] font-medium">{COPY.tenanciesTitle}</p>
          <p className="text-muted-foreground text-[11px]">{COPY.tenanciesHint}</p>
          <ul className="mt-1.5 space-y-1.5">
            {pinnable.map((lease) => (
              <li key={lease.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate">
                  {lease.approvedTenant || '—'}
                  {lease.leaseStart ? ` · ${formatDate(lease.leaseStart)}` : ''}
                  {lease.leaseEnd ? ` – ${formatDate(lease.leaseEnd)}` : ''}
                </span>
                {lease.id === pinnedId ? (
                  <span className="text-primary flex shrink-0 items-center gap-1 text-[11px] font-semibold">
                    <Pin className="size-3" />
                    {COPY.pinnedBadge}
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 text-xs"
                    disabled={busy}
                    onClick={() =>
                      void run(() => setCurrentPropertyTenancy(property.id, lease.id), COPY.pinned)
                    }
                  >
                    {COPY.setCurrent}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {pinnedId ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 h-7 text-xs"
              disabled={busy}
              onClick={() =>
                void run(() => setCurrentPropertyTenancy(property.id, null), COPY.pinCleared)
              }
            >
              {COPY.clearPin}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
