'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { SaturdayDatetimeField } from '@/components/open-inspection/saturday-datetime-field';
import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  canStartOpenInspectionNow,
  OPEN_PREFERRED_TIME_HINT,
  OPEN_REQUEST_DESCRIPTION,
  OPEN_REQUEST_SUBMITTED,
  OPEN_REQUEST_TITLE,
} from '@/constants/open-batch';
import { requestAgentOpenInspection } from '@/lib/crossub-api/agent-workflow-client';
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import { prepareInspectionOrderPayment } from '@/lib/billing/inspection-order-payment';
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
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const pendingPaidCreateRef = useRef<((platformChargeId?: string) => Promise<void>) | null>(
    null,
  );

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
    const run = async (platformChargeId?: string) => {
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

    const prepared = await prepareInspectionOrderPayment('open_inspection', propertyId);
    if (prepared.status === 'needs_card') {
      pendingPaidCreateRef.current = run;
      setPaymentDialog(prepared.dialog);
      return;
    }
    await run(prepared.chargeId ?? undefined);
  };

  const handleOpenPaymentSuccess = async () => {
    const run = pendingPaidCreateRef.current;
    const chargeId = paymentDialog?.chargeId;
    pendingPaidCreateRef.current = null;
    setPaymentDialog(null);
    setSubmitting(true);
    try {
      await finalizeBillingChargePayment(chargeId);
      await run?.(chargeId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not add this property to the open list',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!apiConnected) {
      toast.error('Connect to the API to schedule');
      return;
    }
    const keyError = validateKeyLocation();
    if (keyError) {
      toast.error(keyError);
      return;
    }

    // The time is now OPTIONAL, and that is the substance of the change rather than a
    // relaxation of validation. The agent is asking for a property to be opened; the
    // Saturday time comes from the route the inspector who takes it can actually drive.
    // Requiring a time here is what let two properties forty minutes apart be advertised
    // for the same quarter hour with nobody on either.
    let preferredStartTime: string | undefined;
    let preferredEndTime: string | undefined;

    if (preferredStartLocal) {
      const hours = parseDurationHours();
      if (hours == null) {
        toast.error('Enter a valid duration in hours');
        return;
      }
      const startError = validateCrossubOpenDateTimeLocal(
        preferredStartLocal,
        'Preferred date & time',
      );
      if (startError) {
        toast.error(startError);
        return;
      }
      const preferredEndLocal = addHoursToDatetimeLocal(preferredStartLocal, hours);
      const endError = validateCrossubOpenDateTimeLocal(
        preferredEndLocal,
        'Preferred end time',
      );
      if (endError) {
        toast.error('Duration is too long — the viewing must finish on the same Saturday');
        return;
      }
      preferredStartTime = new Date(preferredStartLocal).toISOString();
      preferredEndTime = new Date(preferredEndLocal).toISOString();
    }

    setSubmitting(true);
    try {
      await finalizeSchedule(
        {
          preferredStartTime,
          preferredEndTime,
          preferredNotes: preferredNotes.trim() || undefined,
          keyCollectLocation: keyCollectLocation.trim(),
        },
        OPEN_REQUEST_SUBMITTED,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not add this property to the open list',
      );
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
    <section className={cn('space-y-4 rounded-2xl border bg-white p-4 dark:bg-card', className)}>
      <div>
        <h2 className="text-sm font-semibold">{OPEN_REQUEST_TITLE}</h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {OPEN_REQUEST_DESCRIPTION}
        </p>
      </div>

      <SaturdayDatetimeField
        id="open-schedule-start"
        label="Preferred date & time (optional)"
        value={preferredStartLocal}
        onChange={setPreferredStartLocal}
        disabled={busy}
        defaultTime="10:00"
      />
      <p className="text-muted-foreground -mt-2 text-[11px] leading-relaxed">
        {OPEN_PREFERRED_TIME_HINT}
      </p>

      {/* Duration only means something once a preferred start exists. */}
      {preferredStartLocal ? (
        <div className="space-y-2">
          <Label htmlFor="open-schedule-duration">Preferred duration (hours)</Label>
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
      ) : null}

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
          inputKind="internal_note"
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
              Adding…
            </>
          ) : (
            'Add to open list'
          )}
        </Button>
        {/*
          "Start open inspection now" lived here. Removed for agents (CRS-0068) — it is
          time-selection by the shortest route there is, and `startNow` skips the weekly
          batch and the Saturday rule to do it. `submitStartNow` is kept below so a
          staff-gated caller can be added without rebuilding the flow.
        */}
        {canStartOpenInspectionNow ? (
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
        ) : null}
      </div>
      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(open) => {
          if (!open) {
            pendingPaidCreateRef.current = null;
            setPaymentDialog(null);
          }
        }}
        onSuccess={() => void handleOpenPaymentSuccess()}
      />
    </section>
  );
}
