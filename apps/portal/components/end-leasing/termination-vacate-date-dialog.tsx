'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  dateOnly,
  PropertyVacateDateField,
  vacateDateChangeInvalid,
} from '@/components/agent/property-vacate-date-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { terminationApi } from '@/lib/termination-case-api';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';

export function TerminationVacateDateDialog({
  open,
  onOpenChange,
  caseId,
  initialDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  initialDate: string;
  onSaved?: (detail?: TerminationCaseDetail) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(initialDate);
    setReason('');
  }, [open, initialDate]);

  const submit = async () => {
    if (!dateOnly(date)) {
      toast.error('Select a vacate date');
      return;
    }
    if (dateOnly(date) === dateOnly(initialDate)) {
      toast.message('No changes to save');
      onOpenChange(false);
      return;
    }
    if (vacateDateChangeInvalid(date, initialDate, reason)) {
      toast.error('Provide a reason when changing the vacate date');
      return;
    }

    setSaving(true);
    try {
      const updated = await terminationApi.updateVacateDate(caseId, dateOnly(date), reason.trim());
      toast.success('Vacate date updated');
      onOpenChange(false);
      onSaved?.(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update vacate date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent elevated className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change vacate date</DialogTitle>
          <DialogDescription>
            Update the expected vacate date. A reason is required for every change.
          </DialogDescription>
        </DialogHeader>
        <div className="py-1">
          <PropertyVacateDateField
            date={date}
            initialDate={initialDate}
            reason={reason}
            onDateChange={setDate}
            onReasonChange={setReason}
            idPrefix="termination-vacate"
            requireReason
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              saving ||
              (dateOnly(date) !== dateOnly(initialDate) && !reason.trim())
            }
            onClick={() => void submit()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
