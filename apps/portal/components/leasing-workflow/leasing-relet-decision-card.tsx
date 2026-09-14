'use client';

import { useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingDefaultInspectorField } from '@/components/leasing-workflow/leasing-default-inspector-field';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  LEASING_OPEN_PROVIDER,
  LEASING_OPEN_PROVIDER_OPTIONS,
  LEASING_RELET_COPY,
  LEASING_RELET_DECISION,
  LEASING_RELET_DECLINE_REASON_MAX,
  type LeasingOpenProvider,
} from '@/constants/leasing-relet-decision';
import {
  setAgentReletDecision,
  type SetAgentReletDecisionInput,
} from '@/lib/crossub-api/agent-workflow-client';
import { fetchLeasingCycleView, invalidateLeasingCycleView } from '@/lib/leasing/fetch-leasing-cycle';
import { LEASING_UI } from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { cn } from '@/lib/utils';
import {
  countReletReminders,
  isAwaitingReletConfirmation,
} from '@/utils/leasing-relet-decision';

type ReletDialog = typeof LEASING_RELET_DECISION.PROCEED | typeof LEASING_RELET_DECISION.DO_NOT_RELET;
type ReletDecision = SetAgentReletDecisionInput['decision'];

const SUCCESS_TOAST: Record<ReletDecision, string> = {
  [LEASING_RELET_DECISION.PROCEED]: LEASING_RELET_COPY.proceedSuccess,
  [LEASING_RELET_DECISION.DO_NOT_RELET]: LEASING_RELET_COPY.doNotReletSuccess,
  [LEASING_RELET_DECISION.DECIDE_LATER]: LEASING_RELET_COPY.decideLaterSuccess,
};

/**
 * The re-let confirmation gate. Renders only while the cycle is `awaiting_confirmation`;
 * reads the workflow store the leasing live sync already keeps fresh.
 */
export function LeasingReletDecisionCard({
  propertyId,
  cycleId,
  className,
}: {
  propertyId: string;
  cycleId: string;
  className?: string;
}) {
  const detail = useLeasingWorkflowStore((s) => s.getDetail(propertyId));
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const { properties, refresh } = useAgentData();

  const [dialog, setDialog] = useState<ReletDialog | null>(null);
  const [provider, setProvider] = useState<LeasingOpenProvider | null>(null);
  const [inspectorId, setInspectorId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState<ReletDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!detail || detail.cycleId !== cycleId || !isAwaitingReletConfirmation(detail)) {
    return null;
  }

  const agencyId =
    detail.agencyId ?? properties.find((row) => row.id === propertyId)?.agencyId ?? null;
  const reminders = countReletReminders(detail.timeline);
  const busy = submitting !== null;
  const agencyRuns = provider === LEASING_OPEN_PROVIDER.AGENCY;
  const proceedValid = provider !== null && (!agencyRuns || Boolean(inspectorId));
  const trimmedReason = reason.trim();

  const closeDialog = () => {
    setDialog(null);
    setProvider(null);
    setInspectorId('');
    setReason('');
    setError(null);
  };

  const submit = async (body: SetAgentReletDecisionInput) => {
    setSubmitting(body.decision);
    setError(null);
    try {
      await setAgentReletDecision(propertyId, cycleId, body);
      invalidateLeasingCycleView(cycleId);
      try {
        applyCycleView(propertyId, await fetchLeasingCycleView(cycleId));
      } catch {
        /* live sync will catch up */
      }
      await refresh().catch(() => undefined);
      toast.success(SUCCESS_TOAST[body.decision]);
      closeDialog();
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : LEASING_RELET_COPY.genericError;
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleProceed = () => {
    if (!provider) return;
    if (agencyRuns && !inspectorId) {
      setError(LEASING_RELET_COPY.inspectorRequired);
      return;
    }
    void submit({
      decision: LEASING_RELET_DECISION.PROCEED,
      openProvider: provider,
      ...(agencyRuns ? { defaultInspectorId: inspectorId } : {}),
    });
  };

  const handleDoNotRelet = () => {
    if (!trimmedReason) {
      setError(LEASING_RELET_COPY.reasonRequired);
      return;
    }
    void submit({ decision: LEASING_RELET_DECISION.DO_NOT_RELET, reason: trimmedReason });
  };

  return (
    <section className={cn('space-y-3 rounded-xl border p-4', LEASING_UI.callout, className)}>
      <div className="flex items-start gap-3">
        <span className={cn('shrink-0', LEASING_UI.iconChip)}>
          <BellRing className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">{LEASING_RELET_COPY.title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {LEASING_RELET_COPY.explanation}
          </p>
          {reminders > 0 ? (
            <p className="text-muted-foreground text-[11px] font-medium">
              {LEASING_RELET_COPY.reminderLine(reminders)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <ReletAction
          label={LEASING_RELET_COPY.proceedLabel}
          description={LEASING_RELET_COPY.proceedDescription}
        >
          <Button
            type="button"
            className="h-9 w-full"
            disabled={busy}
            onClick={() => {
              setError(null);
              setDialog(LEASING_RELET_DECISION.PROCEED);
            }}
          >
            {LEASING_RELET_COPY.proceedLabel}
          </Button>
        </ReletAction>
        <ReletAction
          label={LEASING_RELET_COPY.doNotReletLabel}
          description={LEASING_RELET_COPY.doNotReletDescription}
        >
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full"
            disabled={busy}
            onClick={() => {
              setError(null);
              setDialog(LEASING_RELET_DECISION.DO_NOT_RELET);
            }}
          >
            {LEASING_RELET_COPY.doNotReletLabel}
          </Button>
        </ReletAction>
        <ReletAction
          label={LEASING_RELET_COPY.decideLaterLabel}
          description={LEASING_RELET_COPY.decideLaterDescription}
        >
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full"
            disabled={busy}
            onClick={() => void submit({ decision: LEASING_RELET_DECISION.DECIDE_LATER })}
          >
            {submitting === LEASING_RELET_DECISION.DECIDE_LATER ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {LEASING_RELET_COPY.decideLaterLabel}
          </Button>
        </ReletAction>
      </div>

      <Dialog
        open={dialog === LEASING_RELET_DECISION.PROCEED}
        onOpenChange={(next) => {
          if (!next && !busy) closeDialog();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{LEASING_RELET_COPY.proceedDialogTitle}</DialogTitle>
            <DialogDescription>{LEASING_RELET_COPY.proceedDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{LEASING_RELET_COPY.providerQuestion} *</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {LEASING_OPEN_PROVIDER_OPTIONS.map((option) => {
                  const selected = provider === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={selected}
                      variant={selected ? 'default' : 'outline'}
                      className={cn('h-9', selected && 'bg-teal-600 text-white hover:bg-teal-700')}
                      disabled={busy}
                      onClick={() => {
                        setProvider(option.value);
                        setError(null);
                      }}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              {provider ? (
                <p className="text-muted-foreground text-[11px]">
                  {LEASING_OPEN_PROVIDER_OPTIONS.find((option) => option.value === provider)?.description}
                </p>
              ) : null}
            </div>
            {agencyRuns ? (
              <LeasingDefaultInspectorField
                id={`relet-default-inspector-${cycleId}`}
                agencyId={agencyId}
                value={inspectorId}
                onChange={(userId) => {
                  setInspectorId(userId);
                  setError(null);
                }}
                enabled={agencyRuns}
                disabled={busy}
              />
            ) : null}
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={closeDialog}>
              {LEASING_RELET_COPY.cancelLabel}
            </Button>
            <Button type="button" disabled={busy || !proceedValid} onClick={handleProceed}>
              {submitting === LEASING_RELET_DECISION.PROCEED ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {LEASING_RELET_COPY.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === LEASING_RELET_DECISION.DO_NOT_RELET}
        onOpenChange={(next) => {
          if (!next && !busy) closeDialog();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{LEASING_RELET_COPY.doNotReletDialogTitle}</DialogTitle>
            <DialogDescription>{LEASING_RELET_COPY.doNotReletDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`relet-decline-reason-${cycleId}`} className="text-xs">
              {LEASING_RELET_COPY.reasonLabel} *
            </Label>
            <Textarea
              id={`relet-decline-reason-${cycleId}`}
              rows={3}
              inputKind="internal_note"
              maxLength={LEASING_RELET_DECLINE_REASON_MAX}
              placeholder={LEASING_RELET_COPY.reasonPlaceholder}
              value={reason}
              disabled={busy}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
            />
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={closeDialog}>
              {LEASING_RELET_COPY.cancelLabel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !trimmedReason}
              onClick={handleDoNotRelet}
            >
              {submitting === LEASING_RELET_DECISION.DO_NOT_RELET ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {LEASING_RELET_COPY.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ReletAction({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1" aria-label={label}>
      {children}
      <p className="text-muted-foreground text-[11px] leading-snug">{description}</p>
    </div>
  );
}
