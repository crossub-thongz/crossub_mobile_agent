'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

export function PropertyEndManagementDialog({
  property,
  open,
  onOpenChange,
  onConfirm,
  saving,
}: {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (endOfManagementDate: string) => Promise<void>;
  saving?: boolean;
}) {
  const [endDate, setEndDate] = useState('');

  const reset = () => setEndDate('');

  const submit = async () => {
    if (!endDate.trim()) return;
    await onConfirm(endDate);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>End property management?</DialogTitle>
          <DialogDescription>
            {property
              ? `This will end agency management for ${formatPropertyFullAddress(property)}. Enter the end of management date — it will appear on the property Overview.`
              : 'Enter the end of management date.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="end-of-management-date">End of management date</Label>
          <Input
            id="end-of-management-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={saving}
          />
        </div>

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
            disabled={!endDate.trim() || saving}
            onClick={() => void submit()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            End management
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
