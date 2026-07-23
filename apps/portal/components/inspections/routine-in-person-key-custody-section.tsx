'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';

import { StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { inspectionsApi } from '@/lib/inspections-api';
import type { OnSiteProgression } from '@/lib/inspections-types';
import { isReportSubmitted } from '@/lib/inspections/agent-field-inspection-status';
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

function formatCustodyTime(iso: string): string {
  return formatDateTime(iso);
}

/** Live key collect/return for in-person routine inspections (mirrors ingoing/outgoing). */
export function RoutineInPersonKeyCustodySection({
  inspectionId,
  apiConnected,
  inspectorAssigned = true,
}: {
  inspectionId: string;
  apiConnected: boolean;
  inspectorAssigned?: boolean;
}) {
  const [progression, setProgression] = useState<OnSiteProgression | null>(null);
  const [loading, setLoading] = useState(apiConnected);

  const refresh = useCallback(async () => {
    if (!apiConnected) {
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

  useLivePoll(refresh, apiConnected);

  const custody = progression?.keyCustody;
  const collectPhotos = custody?.collectPhotos ?? [];
  const returnPhotos = custody?.returnPhotos ?? [];
  const keyCollected = custody?.collectComplete ?? false;
  const keyReturned = custody?.returnComplete ?? false;
  const reportSubmitted = isReportSubmitted(null, progression);

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
              ? ` · ${formatCustodyTime(progression.keyCollection.time)}`
              : ''}
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <StepCard
          icon={KeyRound}
          title="Key collection proof"
          description="Photo proof uploaded by the inspector in the mobile app."
          status={
            keyCollected
              ? LEASING_ITEM_STATUS.DONE
              : inspectorAssigned
                ? LEASING_ITEM_STATUS.IN_PROGRESS
                : LEASING_ITEM_STATUS.NOT_STARTED
          }
        >
          {collectPhotos.length > 0 ? (
            <div className="space-y-2">
              {custody?.collectedAt ? (
                <StepFact label="Collected" value={formatCustodyTime(custody.collectedAt)} />
              ) : null}
              {custody?.collectNotes ? (
                <p className="text-muted-foreground text-xs">{custody.collectNotes}</p>
              ) : null}
              <ProofPhotoGrid urls={collectPhotos} label="Inspector upload" />
            </div>
          ) : inspectorAssigned ? (
            <p className="text-muted-foreground text-xs">
              Waiting for the inspector to upload key collection proof…
            </p>
          ) : null}
        </StepCard>

        <StepCard
          icon={KeyRound}
          title="Key return proof"
          description="After the routine report is filed, the inspector uploads keys-returned proof."
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
                <StepFact label="Returned" value={formatCustodyTime(custody.returnedAt)} />
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
              Available after the routine report is submitted.
            </p>
          )}
        </StepCard>
      </div>
    </section>
  );
}
