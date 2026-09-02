'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function MaintenanceApproveLandlordEmailDialog({
  open,
  onOpenChange,
  busy = false,
  onProceed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onProceed: (skipRecipientEmail: boolean) => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" stacked>
        <DialogHeader>
          <DialogTitle>Approve quote</DialogTitle>
          <DialogDescription>
            The job continues either way. Choose whether to send the landlord email.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="bg-[#5f9f6b] text-white hover:bg-[#4f8d5b]"
            disabled={busy}
            onClick={() => void onProceed(false)}
          >
            Proceed with sending email to landlord
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void onProceed(true)}
          >
            Proceed without sending email to landlord
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
