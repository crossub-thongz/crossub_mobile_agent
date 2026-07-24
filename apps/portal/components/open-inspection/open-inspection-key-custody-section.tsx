'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';

import { StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { inspectionsApi } from '@/lib/inspections-api';
import type { OnSiteProgression } from '@/lib/inspections-types';
import { useLivePoll } from '@/lib/use-live-poll';
import { formatDateTime } from '@/lib/utils';

function ProofPhotoGrid({ urls, label }: { urls: string[]; label: string }) {
  if (urls.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url, index) => (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary/40 block size-14 shrink-0 overflow-hidden rounded-md border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Live key collect/return proof for CROSSUB open inspections. */
export function OpenInspectionKeyCustodySection({
  inspectionId,
  apiConnected,
  inspectionComplete = false,
}: {
  inspectionId?: string | null;
  apiConnected: boolean;
  /** True once the open viewing is finished (inspector marked complete). */
  inspectionComplete?: boolean;
}) {
  const [progression, setProgression] = useState<OnSiteProgression | null>(null);
  const [loading, setLoading] = useState(Boolean(inspectionId && apiConnected));

  const refresh = useCallback(async () => {
    if (!apiConnected || !inspectionId) {
      setLoading(false);
      return;
    }
    try {
      const next = await inspectionsApi.getOnSiteProgression(inspectionId);
      setProgression(next);
    } catch {
      setProgression(null);
    } finally {
      setLoading(false);
    }
  }, [apiConnected, inspectionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLivePoll(refresh, apiConnected && Boolean(inspectionId));

  if (!inspectionId) return null;

  const custody = progression?.keyCustody;
  const collectPhotos = custody?.collectPhotos ?? [];
  const returnPhotos = custody?.returnPhotos ?? [];
  const keyCollected = custody?.collectComplete ?? false;
  const keyReturned = custody?.returnComplete ?? false;
  const reportSubmitted =
    inspectionComplete || progression?.inspectionStatus === 'COMPLETED';

  if (!loading && !progression?.hasKeyArrangement) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="text-primary size-4" />
          <h3 className="text-sm font-semibold">Key collection & return</h3>
        </div>
        {loading ? (
          <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
            <Loader2 className="size-3 animate-spin" />
            Syncing…
          </span>
        ) : (
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
            Live · inspector app
          </span>
        )}
      </div>

      {progression?.keyCollection ? (
        <div className="bg-secondary/30 rounded-lg border p-3 text-xs">
          <p className="font-medium">Pickup arrangement</p>
          <p className="text-muted-foreground mt-1">
            {progression.keyCollection.location ?? 'Location TBD'}
            {progression.keyCollection.time
              ? ` · ${formatDateTime(progression.keyCollection.time)}`
              : ''}
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <StepCard
          icon={KeyRound}
          title="Key collection proof"
          description="Photo proof uploaded by the inspector before the open inspection starts."
          status={
            keyCollected
              ? LEASING_ITEM_STATUS.DONE
              : LEASING_ITEM_STATUS.IN_PROGRESS
          }
        >
          {collectPhotos.length > 0 ? (
            <div className="space-y-2">
              {custody?.collectedAt ? (
                <StepFact label="Collected" value={formatDateTime(custody.collectedAt)} />
              ) : null}
              {custody?.collectNotes ? (
                <p className="text-muted-foreground text-xs">{custody.collectNotes}</p>
              ) : null}
              <ProofPhotoGrid urls={collectPhotos} label="Inspector upload" />
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Waiting for the inspector to upload key collection proof…
            </p>
          )}
        </StepCard>

        <StepCard
          icon={KeyRound}
          title="Key return proof"
          description="After the open inspection is finished, the inspector uploads keys-returned proof."
          status={
            keyReturned
              ? LEASING_ITEM_STATUS.DONE
              : reportSubmitted
                ? LEASING_ITEM_STATUS.IN_PROGRESS
                : LEASING_ITEM_STATUS.NOT_STARTED
          }
        >
          {returnPhotos.length > 0 ? (
            <div className="space-y-2">
              {custody?.returnedAt ? (
                <StepFact label="Returned" value={formatDateTime(custody.returnedAt)} />
              ) : null}
              {custody?.returnNotes ? (
                <p className="text-muted-foreground text-xs">{custody.returnNotes}</p>
              ) : null}
              <ProofPhotoGrid urls={returnPhotos} label="Inspector upload" />
            </div>
          ) : reportSubmitted ? (
            <p className="text-muted-foreground text-xs">
              Waiting for the inspector to upload key return proof…
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Available after the open inspection is completed.
            </p>
          )}
        </StepCard>
      </div>
    </section>
  );
}
