'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { SaturdayDatetimeField } from '@/components/open-inspection/saturday-datetime-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ensurePrepaidCharge } from '@/lib/crossub-api/agent-billing-client';
import { requestAgentOpenInspection } from '@/lib/crossub-api/agent-workflow-client';
import { finalizeAgentOpenInspectionSchedule } from '@/lib/open-inspection/finalize-agent-open-schedule';
import {
  addHoursToDatetimeLocal,
  validateCrossubOpenDateTimeLocal,
} from '@/lib/open-inspection/open-inspection-saturday';
import { openInspectionEndIsoFromDurationHours } from '@/lib/open-inspection/start-now';
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
  const [durationHours, setDurationHours] = useState('1');
  const [preferredNotes, setPreferredNotes] = useState('');
  const [keyCollectLocation, setKeyCollectLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [startingNow, setStartingNow] = useState(false);

  const parseDurationHours = (): number | null => {
    const hours = Number(durationHours);
    if (!Number.isFinite(hours) || hours <= 0) return null;
    return hours;
  };

  const validateKeyLocation = (): string | null => {
    const keyLocation = keyCollectLocation.trim();
    if (!keyLocation) return 'Enter where the inspector collects keys';
    return null;
  };

  const finalizeSchedule = async (
    body: Parameters<typeof requestAgentOpenInspection>[2],
    successMessage: string,
  ) => {
    const platformChargeId = await ensurePrepaidCharge({
      serviceType: 'open_inspection',
      propertyId,
      leasingCycleId: cycleId,
    });

    const result = await requestAgentOpenInspection(propertyId, cycleId, {
      ...body,
      ...(platformChargeId ? { platformChargeId } : {}),
    });
    toast.success(successMessage);

    const inspectionId = await finalizeAgentOpenInspectionSchedule({
      propertyId,
      cycleId,
      result,
      registerInspection,
      applyCycleView,
      refresh,
    });
    onScheduled?.(inspectionId);
  };

  const submit = async () => {
    if (!apiConnected) {
      toast.error('Connect to the API to schedule');
      return;
    }
    if (!preferredStartLocal) {
      toast.error('Pick a Saturday and start time');
      return;
    }
    const keyError = validateKeyLocation();
    if (keyError) {
      toast.error(keyError);
      return;
    }

    const hours = parseDurationHours();
    if (hours == null) {
      toast.error('Enter a valid duration in hours');
      return;
    }

    const startError = validateCrossubOpenDateTimeLocal(
      preferredStartLocal,
      'Viewing date & time',
    );
    if (startError) {
      toast.error(startError);
      return;
    }

    const preferredEndLocal = addHoursToDatetimeLocal(preferredStartLocal, hours);
    const endError = validateCrossubOpenDateTimeLocal(
      preferredEndLocal,
      'Viewing end time',
    );
    if (endError) {
      toast.error('Duration is too long — the viewing must finish on the same Saturday');
      return;
    }

    setSubmitting(true);
    try {
      await finalizeSchedule(
        {
          preferredStartTime: new Date(preferredStartLocal).toISOString(),
          preferredEndTime: new Date(preferredEndLocal).toISOString(),
          preferredNotes: preferredNotes.trim() || undefined,
          keyCollectLocation: keyCollectLocation.trim(),
        },
        'Open inspection scheduled — CROSSUB will assign an inspector',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not schedule open inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const submitStartNow = async () => {
    if (!apiConnected) {
      toast.error('Connect to the API to schedule');
      return;
    }
    const keyError = validateKeyLocation();
    if (keyError) {
      toast.error(keyError);
      return;
    }

    const hours = parseDurationHours();
    if (hours == null) {
      toast.error('Enter a valid duration in hours');
      return;
    }

    setStartingNow(true);
    try {
      await finalizeSchedule(
        {
          startNow: true,
          preferredEndTime: openInspectionEndIsoFromDurationHours(hours),
          preferredNotes: preferredNotes.trim() || undefined,
          keyCollectLocation: keyCollectLocation.trim(),
        },
        'Open inspection started — viewing window is live now',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start open inspection now');
    } finally {
      setStartingNow(false);
    }
  };

  const busy = submitting || startingNow;

  return (
    <section className={cn('space-y-4 rounded-2xl border bg-card p-4', className)}>
      <div>
        <h2 className="text-sm font-semibold">Schedule Open Inspection</h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          CROSSUB open inspections are normally held on <strong>Saturdays</strong>. Use{' '}
          <strong>Start open inspection now</strong> to begin immediately for testing — the end
          time follows the duration you set below.
        </p>
      </div>

      <SaturdayDatetimeField
        id="open-schedule-start"
        label="Viewing date & time *"
        value={preferredStartLocal}
        onChange={setPreferredStartLocal}
        disabled={busy}
        defaultTime="10:00"
      />

      <div className="space-y-2">
        <Label htmlFor="open-schedule-duration">Duration (hours) *</Label>
        <Input
          id="open-schedule-duration"
          type="number"
          min={0.5}
          step={0.5}
          value={durationHours}
          onChange={(e) => setDurationHours(e.target.value)}
          disabled={busy}
          className="w-28"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="open-schedule-key-location">Key collect location *</Label>
        <Input
          id="open-schedule-key-location"
          value={keyCollectLocation}
          onChange={(e) => setKeyCollectLocation(e.target.value)}
          placeholder="e.g. Lockbox on front gate — code 4821"
          disabled={busy}
        />
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          The assigned inspector sees this only after they accept the job.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="open-schedule-notes">Notes (optional)</Label>
        <Textarea
          id="open-schedule-notes"
          value={preferredNotes}
          onChange={(e) => setPreferredNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Tenant needs 24h notice…"
          disabled={busy}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9"
          disabled={busy}
          onClick={() => void submit()}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Scheduling…
            </>
          ) : (
            'Schedule open inspection'
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          disabled={busy}
          onClick={() => void submitStartNow()}
        >
          {startingNow ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Starting…
            </>
          ) : (
            'Start open inspection now'
          )}
        </Button>
      </div>
    </section>
  );
}
