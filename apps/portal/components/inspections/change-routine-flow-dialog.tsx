'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
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
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import { prepareInspectionOrderPayment } from '@/lib/billing/inspection-order-payment';
import {
  routineInspectionApi,
  type ServerRoutineScheduleView,
} from '@/lib/routine-inspection-api';

const FLOW_REASONS = [
  { value: 'agent_requested_cycle', label: 'Agent requested change' },
  { value: 'tenant_overseas', label: 'Tenant overseas / unavailable' },
  { value: 'property_inaccessible', label: 'Property inaccessible' },
  { value: 'owner_request', label: 'Owner / landlord request' },
  { value: 'other', label: 'Other' },
] as const;

export function ChangeRoutineFlowDialog({
  schedule,
  inspectionId,
  propertyId,
  open,
  onOpenChange,
  onUpdated,
}: {
  schedule: ServerRoutineScheduleView;
  inspectionId?: string;
  propertyId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (schedule: ServerRoutineScheduleView) => void;
}) {
  const currentFlow = schedule.flow;
  const [nextFlow, setNextFlow] = useState<'self' | 'in_person'>(
    currentFlow === 'in_person' ? 'self' : 'in_person',
  );
  const [reason, setReason] = useState<(typeof FLOW_REASONS)[number]['value']>(
    FLOW_REASONS[0].value,
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const pendingPaidChangeRef = useRef<((platformChargeId?: string) => Promise<void>) | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setNextFlow(currentFlow === 'in_person' ? 'self' : 'in_person');
    setReason(FLOW_REASONS[0].value);
    setNote('');
    setPaymentDialog(null);
    pendingPaidChangeRef.current = null;
  }, [open, schedule.id, currentFlow]);

  const canSave = nextFlow !== currentFlow && note.trim().length >= 10;
  const billingPropertyId = schedule.propertyId?.trim() || propertyId?.trim() || '';

  const applyFlowChange = async (platformChargeId?: string) => {
    const updated = await routineInspectionApi.changeFlow(schedule.id, {
      flow: nextFlow,
      reason,
      reasonNote: note.trim(),
      ...(inspectionId ? { inspectionId } : {}),
      ...(platformChargeId ? { platformChargeId } : {}),
    });
    onUpdated(updated);
    toast.success(
      nextFlow === 'in_person'
        ? platformChargeId
          ? 'Payment successful. Conduct mode updated to in-person inspector visit.'
          : 'Conduct mode updated to in-person inspector visit.'
        : 'Inspection flow updated',
    );
    setPaymentDialog(null);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (nextFlow === 'in_person') {
        if (!billingPropertyId) {
          throw new Error('This routine is missing a property. Refresh and try again.');
        }
        const prepared = await prepareInspectionOrderPayment(
          'routine_inspection',
          billingPropertyId,
        );
        if (prepared.status === 'needs_card') {
          pendingPaidChangeRef.current = applyFlowChange;
          setPaymentDialog({
            ...prepared.dialog,
            title: 'Change conduct mode',
            description:
              'Pay for the in-person inspector visit. The mode changes after payment succeeds.',
          });
          return;
        }
        await applyFlowChange(prepared.chargeId ?? undefined);
        return;
      }
      await applyFlowChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change inspection flow');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentSuccess = async () => {
    const run = pendingPaidChangeRef.current;
    const chargeId = paymentDialog?.chargeId;
    pendingPaidChangeRef.current = null;
    setSaving(true);
    try {
      await finalizeBillingChargePayment(chargeId);
      await run?.(chargeId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change inspection flow');
    } finally {
      setSaving(false);
    }
  };

  const currentLabel =
    currentFlow === 'self' ? 'Tenant self-inspection' : 'In-person inspector visit';

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && paymentDialog) return;
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-w-lg" elevated>
          <DialogHeader>
            <DialogTitle>Change inspection flow</DialogTitle>
            <DialogDescription>
              Current mode: <span className="font-medium text-foreground">{currentLabel}</span>. Your
              reason is recorded in the case audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>New conduct mode</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={nextFlow}
                onChange={(e) => setNextFlow(e.target.value as 'self' | 'in_person')}
              >
                <option value="in_person">In-person inspector visit</option>
                <option value="self">Tenant self-inspection</option>
              </select>
              {nextFlow === 'in_person' ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Switching to an in-person visit is billed like a new routine order. If payment is
                  due, Stripe opens when you save; the mode changes after payment succeeds.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Reason category</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value as (typeof FLOW_REASONS)[number]['value'])
                }
              >
                {FLOW_REASONS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-flow-note">Reason details *</Label>
              <Textarea
                id="agent-flow-note"
                inputKind="internal_note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Explain why the conduct mode is changing (min. 10 characters)…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={paymentDialog != null}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSave || saving || paymentDialog != null}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            pendingPaidChangeRef.current = null;
            setPaymentDialog(null);
          }
        }}
        onSuccess={() => void handlePaymentSuccess()}
      />
    </>
  );
}
