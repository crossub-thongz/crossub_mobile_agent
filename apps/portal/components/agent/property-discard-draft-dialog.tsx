'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

export function PropertyDiscardDraftDialog({
  property,
  open,
  onOpenChange,
  onConfirm,
  saving,
}: {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  saving?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete draft property?</DialogTitle>
          <DialogDescription>
            {property
              ? `${formatPropertyFullAddress(property)} will be permanently removed. This draft was never completed — no end-of-management date is needed.`
              : 'This draft will be permanently removed.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={saving}
            onClick={() => void onConfirm()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
