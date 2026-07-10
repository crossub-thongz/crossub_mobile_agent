'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { dateOnly } from '@/components/agent/property-vacate-date-field';
import { terminationApi } from '@/lib/termination-case-api';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';

export function TerminationKeyReturnDateDialog({
  open,
  onOpenChange,
  caseId,
  initialDate,
  keysReturned,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  initialDate: string;
  keysReturned: boolean;
  onSaved?: (detail?: TerminationCaseDetail) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [keysReceived, setKeysReceived] = useState(keysReturned);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(initialDate);
    setKeysReceived(keysReturned);
  }, [open, initialDate, keysReturned]);

  const submit = async () => {
    if (!dateOnly(date)) {
      toast.error('Select a key return date');
      return;
    }

    setSaving(true);
    try {
      const updated = await terminationApi.setKeyReturn(caseId, {
        date: dateOnly(date),
        keysReceived,
      });
      toast.success(keysReceived ? 'Key return recorded' : 'Key return date saved');
      onOpenChange(false);
      onSaved?.(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save key return date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent elevated className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set key return date</DialogTitle>
          <DialogDescription>
            Record the agreed or actual key return date on behalf of the tenant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="key-return-date">Key return date</Label>
            <Input
              id="key-return-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={keysReceived}
              onChange={(e) => setKeysReceived(e.target.checked)}
            />
            <span>
              <span className="font-medium">Keys have been received</span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                When checked, possession is marked as regained and the outgoing inspection is
                scheduled.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
