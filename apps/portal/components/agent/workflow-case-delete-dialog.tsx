'use client';

import { useState } from 'react';
import { toast } from 'sonner';

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

export function WorkflowCaseDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete case',
  onConfirm,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => Promise<void>;
  onSuccess?: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = (next: boolean) => {
    if (!submitting) {
      if (!next) setReason('');
      onOpenChange(next);
    }
  };

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error('Please enter a reason for deleting this case');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent elevated className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="workflow-delete-reason">Reason</Label>
          <Textarea
            id="workflow-delete-reason"
            inputKind="internal_note"
            rows={4}
            placeholder="Why is this case being removed?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Keep case
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? 'Deleting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
