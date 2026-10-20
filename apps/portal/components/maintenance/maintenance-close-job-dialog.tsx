'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MAINTENANCE_CLOSE_CONFLICT_CODE,
  MAINTENANCE_CLOSE_NOTE_MAX_LENGTH,
  MAINTENANCE_CLOSE_REASON,
  MAINTENANCE_CLOSE_REASON_LABEL,
  MAINTENANCE_CLOSE_REASON_ORDER,
  MAINTENANCE_CLOSE_REASON_REQUIRES_NOTE,
  type MaintenanceCloseReason,
} from '@/constants/maintenance-close';
import { closeMaintenanceCaseWithReason } from '@/lib/crossub-api/maintenance-client';
import { apiErrorCode, apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Close a job that should not proceed — a duplicate, one raised in error, one the tenant sorted
 * out. Deliberately separate from the completion close: the reason is what keeps a cancelled job
 * tellable from finished work afterwards.
 *
 * The warnings are the server's judgement, not the app's. A 409 coded as outstanding commitments
 * or an unpaid contractor invoice holds the message and turns the button into "Close anyway",
 * which re-sends with that acknowledgement set — a second copy of those rules in the browser is
 * a second copy to drift. The two can come one after the other.
 */
export function MaintenanceCloseJobDialog({
  open,
  onOpenChange,
  requestId,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onClosed?: () => void | Promise<void>;
}) {
  const [reason, setReason] = useState<MaintenanceCloseReason>(
    MAINTENANCE_CLOSE_REASON.DUPLICATE,
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState({ commitments: false, payment: false });
  const [paymentWarned, setPaymentWarned] = useState(false);

  const noteRequired = MAINTENANCE_CLOSE_REASON_REQUIRES_NOTE.includes(reason);
  const noteMissing = noteRequired && !note.trim();

  const reset = () => {
    setReason(MAINTENANCE_CLOSE_REASON.DUPLICATE);
    setNote('');
    clearWarning();
  };

  const clearWarning = () => {
    setWarning(null);
    setAcknowledged({ commitments: false, payment: false });
    setPaymentWarned(false);
  };

  const submit = async (ack: { commitments: boolean; payment: boolean }) => {
    if (noteMissing) {
      toast.error('Add a note explaining why');
      return;
    }
    setSaving(true);
    try {
      await closeMaintenanceCaseWithReason(requestId, {
        reason,
        note: note.trim() || undefined,
        acknowledgeCommitments: ack.commitments,
        acknowledgePayment: ack.payment,
      });
      toast.success('Job closed');
      reset();
      onOpenChange(false);
      await onClosed?.();
    } catch (err) {
      const message = apiErrorMessage(err, "Couldn't close the job");
      const code = apiErrorCode(err);
      // A coded 409 — surface it and let the agent confirm rather than failing them with a
      // toast they cannot act on.
      if (code === MAINTENANCE_CLOSE_CONFLICT_CODE.COMMITMENTS) {
        setWarning(message);
        setAcknowledged({ ...ack, commitments: true });
      } else if (code === MAINTENANCE_CLOSE_CONFLICT_CODE.PAYMENT_UNSETTLED) {
        setWarning(message);
        setAcknowledged({ ...ack, payment: true });
        setPaymentWarned(true);
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" stacked>
        <DialogHeader>
          <DialogTitle>Close this job</DialogTitle>
          <DialogDescription>
            For a job that will not proceed — a duplicate, one raised in error, or one already
            resolved. It stays in the record under Closed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="close-job-reason"
              className="text-muted-foreground text-[12px] uppercase tracking-wider"
            >
              Reason
            </Label>
            <select
              id="close-job-reason"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={reason}
              disabled={saving}
              onChange={(e) => {
                setReason(e.target.value as MaintenanceCloseReason);
                clearWarning();
              }}
            >
              {MAINTENANCE_CLOSE_REASON_ORDER.map((value) => (
                <option key={value} value={value}>
                  {MAINTENANCE_CLOSE_REASON_LABEL[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="close-job-note"
              className="text-muted-foreground text-[12px] uppercase tracking-wider"
            >
              Note {noteRequired ? '(required)' : '(optional)'}
            </Label>
            <Textarea
              id="close-job-note"
              value={note}
              inputKind="message"
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Duplicate of MR-00042 — plumber already booked"
              rows={3}
              maxLength={MAINTENANCE_CLOSE_NOTE_MAX_LENGTH}
              className="min-h-[80px] resize-none text-sm"
              disabled={saving}
            />
            <p className="text-muted-foreground text-[12px]">
              Internal only — the tenant never sees this note.
            </p>
          </div>

          {warning ? (
            <div className="border-warning/40 bg-warning/10 rounded-md border px-3 py-2.5">
              <p className="text-foreground flex items-start gap-2 text-xs font-medium">
                <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
                <span>{warning}</span>
              </p>
              <p className="text-muted-foreground mt-1.5 pl-5 text-[12px]">
                {paymentWarned
                  ? 'Closing leaves the invoice unpaid. Settle it with the contractor yourself.'
                  : 'Closing will not tell them. Stand the contractor down yourself if the visit is no longer going ahead.'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Keep job open
          </Button>
          <Button
            type="button"
            disabled={saving || noteMissing}
            onClick={() => void submit(acknowledged)}
          >
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {warning ? 'Close anyway' : 'Close job'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
