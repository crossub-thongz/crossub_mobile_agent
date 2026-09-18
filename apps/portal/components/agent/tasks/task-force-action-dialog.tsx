'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function TaskForceActionDialog({
  open,
  onOpenChange,
  action,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'complete' | 'delete' | null;
  submitting: boolean;
  onConfirm: () => void;
}) {
  const isDelete = action === 'delete';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent elevated className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDelete ? 'Delete this task?' : 'Mark this task as completed?'}
          </DialogTitle>
          <DialogDescription>
            {isDelete
              ? 'This will remove the task from the active workflow and cancel all remaining actions related to it. If this task has already been paid, the fee will be refunded. This action will be recorded in the Audit Log.'
              : 'This will force complete the task and close all remaining workflow actions related to this task. If this task requires a payment, it must already be paid.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDelete ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting
              ? isDelete
                ? 'Deleting...'
                : 'Completing...'
              : isDelete
                ? 'Delete task'
                : 'Mark as completed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
