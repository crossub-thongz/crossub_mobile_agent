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
  MAINTENANCE_CLOSE_NOTE_MAX_LENGTH,
  MAINTENANCE_CLOSE_REASON,
  MAINTENANCE_CLOSE_REASON_LABEL,
  MAINTENANCE_CLOSE_REASON_ORDER,
  MAINTENANCE_CLOSE_REASON_REQUIRES_NOTE,
  type MaintenanceCloseReason,
} from '@/constants/maintenance-close';
import { closeMaintenanceCaseWithReason } from '@/lib/crossub-api/maintenance-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Close a job that should not proceed — a duplicate, one raised in error, one the tenant sorted
 * out. Deliberately separate from the completion close: the reason is what keeps a cancelled job
 * tellable from finished work afterwards.
 *
 * The commitment warning is the server's judgement, not the app's. On a 409 whose message reads
 * "…commitments that need acknowledging first…" the message is held and the button becomes
 * "Close anyway", which re-sends with `acknowledgeCommitments: true` — a second copy of that rule
 * in the browser is a second copy to drift.
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
  const [commitments, setCommitments] = useState<string | null>(null);

  const noteRequired = MAINTENANCE_CLOSE_REASON_REQUIRES_NOTE.includes(reason);
  const noteMissing = noteRequired && !note.trim();

  const reset = () => {
    setReason(MAINTENANCE_CLOSE_REASON.DUPLICATE);
    setNote('');
    setCommitments(null);
  };

  const submit = async (acknowledgeCommitments: boolean) => {
    if (noteMissing) {
      toast.error('Add a note explaining why');
      return;
    }
    setSaving(true);
    try {
      await closeMaintenanceCaseWithReason(requestId, {
        reason,
        note: note.trim() || undefined,
        acknowledgeCommitments,
      });
      toast.success('Job closed');
      reset();
      onOpenChange(false);
      await onClosed?.();
    } catch (err) {
      const message = apiErrorMessage(err, "Couldn't close the job");
      // 409 with the commitment list — surface it and let the agent confirm rather than
      // failing them with a toast they cannot act on.
      if (message.toLowerCase().includes('acknowledging')) {
        setCommitments(message);
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
              className="text-muted-foreground text-[11px] uppercase tracking-wider"
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
                setCommitments(null);
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
              className="text-muted-foreground text-[11px] uppercase tracking-wider"
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
            <p className="text-muted-foreground text-[11px]">
              Internal only — the tenant never sees this note.
            </p>
          </div>

          {commitments ? (
            <div className="border-warning/40 bg-warning/10 rounded-md border px-3 py-2.5">
              <p className="text-foreground flex items-start gap-2 text-xs font-medium">
                <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
                <span>{commitments}</span>
              </p>
              <p className="text-muted-foreground mt-1.5 pl-5 text-[11px]">
                Closing will not tell them. Stand the contractor down yourself if the visit is no
                longer going ahead.
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
            onClick={() => void submit(commitments !== null)}
          >
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {commitments ? 'Close anyway' : 'Close job'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
