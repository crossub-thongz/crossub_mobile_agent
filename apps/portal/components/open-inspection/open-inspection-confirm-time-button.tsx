'use client';

import { useState } from 'react';
import { CalendarCheck, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { OPEN_INSPECTION_CONFIRM_COPY } from '@/constants/open-inspection-confirm';
import type { OpenInspectionPoolJob } from '@/constants/open-inspection-ops';
import { confirmAgentOpenInspectionSchedule } from '@/lib/crossub-api/agent-workflow-client';
import { formatDateTime } from '@/lib/utils';

/**
 * "Confirm this time" on the agent's open inspection.
 *
 * Four states, and keeping them apart is the whole point — see
 * `constants/open-inspection-confirm.ts`:
 *
 * - no time set → say so, no button;
 * - time but no inspector → say so, no button (confirming would promise an unstaffed viewing);
 * - ready → the button;
 * - confirmed → the server's timestamp, and the button is gone because it is one-way.
 */
export function OpenInspectionConfirmTimeButton({
  propertyId,
  job,
  scheduledStart,
  onConfirmed,
}: {
  propertyId?: string;
  /** The linked pool job. Absent means the session has no inspection row yet. */
  job?: OpenInspectionPoolJob;
  /** The viewing window start, which is the time being confirmed. */
  scheduledStart?: string;
  /** Refresh the session so the confirmed stamp appears everywhere it is quoted. */
  onConfirmed?: (confirmedAt: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(
    job?.agentConfirmedAt ?? null,
  );

  const hasSchedule = Boolean(scheduledStart || job?.scheduledDate);
  const hasInspector = (job?.inspectors?.length ?? 0) > 0;

  if (confirmedAt) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          {OPEN_INSPECTION_CONFIRM_COPY.TILE_LABEL}
          <span className="text-foreground ml-1 font-medium">
            {formatDateTime(confirmedAt)}
          </span>
        </span>
      </p>
    );
  }

  if (!hasSchedule) {
    return (
      <p className="text-muted-foreground text-xs">
        {OPEN_INSPECTION_CONFIRM_COPY.AWAITING_SCHEDULE}
      </p>
    );
  }

  if (!hasInspector || !job || !propertyId) {
    return (
      <p className="text-muted-foreground text-xs">
        {OPEN_INSPECTION_CONFIRM_COPY.AWAITING_INSPECTOR}
      </p>
    );
  }

  async function handleConfirm() {
    if (!job || !propertyId || busy) return;
    setBusy(true);
    try {
      const result = await confirmAgentOpenInspectionSchedule(
        propertyId,
        job.inspectionId,
      );
      // The server's instant, not the handset's — staff read this off the Task Pool.
      setConfirmedAt(result.agentConfirmedAt);
      toast.success(OPEN_INSPECTION_CONFIRM_COPY.SUCCESS);
      onConfirmed?.(result.agentConfirmedAt);
    } catch (err) {
      // The server's refusal names which half is missing; surface it rather than a
      // house string, because "no inspector yet" and "already confirmed" need
      // different things from the agent.
      toast.error(
        err instanceof Error ? err.message : OPEN_INSPECTION_CONFIRM_COPY.FAILURE,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        size="sm"
        className="w-full gap-1.5 sm:w-auto"
        disabled={busy}
        onClick={() => void handleConfirm()}
      >
        <CalendarCheck className="size-3.5" />
        {busy ? OPEN_INSPECTION_CONFIRM_COPY.BUSY : OPEN_INSPECTION_CONFIRM_COPY.ACTION}
      </Button>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        {OPEN_INSPECTION_CONFIRM_COPY.HELP}
      </p>
    </div>
  );
}
