'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  requestAgentOpenInspection,
  scheduleAgentSelfOpenInspection,
} from '@/lib/crossub-api/agent-workflow-client';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import {
  openScheduleModeFromStartLocal,
  validateCrossubOpenDateTimeLocal,
  validateSelfOpenDateTimeLocal,
} from '@/lib/open-inspection/open-inspection-saturday';
import { registerOpenInspectionFromCycle } from '@/lib/open-inspection-resolve';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { cn } from '@/lib/utils';

export function OpenInspectionScheduleRequestPanel({
  propertyId,
  cycleId,
  onScheduled,
  className,
}: {
  propertyId: string;
  cycleId: string;
  onScheduled?: (inspectionId?: string) => void;
  className?: string;
}) {
  const { apiConnected, refresh, registerInspection } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);

  const [preferredStartLocal, setPreferredStartLocal] = useState('');
  const [preferredEndLocal, setPreferredEndLocal] = useState('');
  const [preferredNotes, setPreferredNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const scheduleMode = useMemo(
    () => openScheduleModeFromStartLocal(preferredStartLocal),
    [preferredStartLocal],
  );

  const submit = async () => {
    if (!apiConnected) {
      toast.error('Connect to the API to schedule');
      return;
    }
    if (!preferredStartLocal) {
      toast.error('Enter a viewing start date and time');
      return;
    }
    if (!preferredEndLocal) {
      toast.error('Enter a viewing end date and time');
      return;
    }

    const mode = openScheduleModeFromStartLocal(preferredStartLocal);
    const startError =
      mode === 'crossub'
        ? validateCrossubOpenDateTimeLocal(preferredStartLocal, 'Viewing start date & time')
        : validateSelfOpenDateTimeLocal(preferredStartLocal, 'Viewing start date & time');
    if (startError) {
      toast.error(startError);
      return;
    }
    const endError =
      mode === 'crossub'
        ? validateCrossubOpenDateTimeLocal(preferredEndLocal, 'Viewing end date & time')
        : validateSelfOpenDateTimeLocal(preferredEndLocal, 'Viewing end date & time');
    if (endError) {
      toast.error(endError);
      return;
    }
    if (new Date(preferredEndLocal) <= new Date(preferredStartLocal)) {
      toast.error('Viewing end time must be after the start time');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        preferredStartTime: new Date(preferredStartLocal).toISOString(),
        preferredEndTime: new Date(preferredEndLocal).toISOString(),
        preferredNotes: preferredNotes.trim() || undefined,
      };
      const result =
        mode === 'crossub'
          ? await requestAgentOpenInspection(propertyId, cycleId, body)
          : await scheduleAgentSelfOpenInspection(propertyId, cycleId, body);

      toast.success(
        mode === 'crossub'
          ? 'Open inspection scheduled — CROSSUB will assign an inspector'
          : 'Open inspection scheduled — you conduct this viewing',
      );

      const view = await leasingOpsApi.get(cycleId);
      applyCycleView(propertyId, view);

      if (mode === 'crossub') {
        await registerOpenInspectionFromCycle(
          propertyId,
          result.openInspectionId ?? view.openInspection.inspectionId,
          registerInspection,
        );
      }
      await refresh({ force: true });
      onScheduled?.(
        mode === 'crossub'
          ? result.openInspectionId ?? view.openInspection.inspectionId ?? undefined
          : view.viewingSessionId ?? undefined,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not schedule open inspection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={cn('space-y-4 rounded-2xl border bg-card p-4', className)}>
      <div>
        <h2 className="text-sm font-semibold">Schedule Open Inspection</h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          <strong>Saturday</strong> — CROSSUB assigns an inspector from the task pool.
          <br />
          <strong>Monday–Friday or Sunday</strong> — you conduct the open inspection yourself.
        </p>
      </div>

      {scheduleMode === 'crossub' ? (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-950 dark:text-sky-100">
          CROSSUB will conduct this open — the job will appear in the inspector task pool.
        </p>
      ) : scheduleMode === 'self' ? (
        <p className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs leading-relaxed">
          You will conduct this open — no CROSSUB inspector will be assigned.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="open-schedule-start">Viewing start date &amp; time *</Label>
        <Input
          id="open-schedule-start"
          type="datetime-local"
          value={preferredStartLocal}
          onChange={(e) => setPreferredStartLocal(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="open-schedule-end">Viewing end date &amp; time *</Label>
        <Input
          id="open-schedule-end"
          type="datetime-local"
          value={preferredEndLocal}
          onChange={(e) => setPreferredEndLocal(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="open-schedule-notes">Notes (optional)</Label>
        <Textarea
          id="open-schedule-notes"
          value={preferredNotes}
          onChange={(e) => setPreferredNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Tenant needs 24h notice…"
          disabled={submitting}
        />
      </div>

      <Button
        type="button"
        size="sm"
        className="h-9"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            Scheduling…
          </>
        ) : scheduleMode === 'self' ? (
          'Schedule self-conducted open'
        ) : (
          'Schedule CROSSUB open (Saturday)'
        )}
      </Button>
    </section>
  );
}
