'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { terminationApi } from '@/lib/termination-case-api';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { formatDateTime } from '@/lib/utils';

export function TerminationCompleteInspectionDialog({
  open,
  onOpenChange,
  caseData,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: TerminationCaseDetail | null | undefined;
  onCompleted?: (detail: TerminationCaseDetail) => void;
}) {
  const [saving, setSaving] = useState(false);
  const inspection = caseData?.inspection;

  if (!caseData?.id || !inspection) {
    return null;
  }

  const submit = async () => {
    setSaving(true);
    try {
      const updated = await terminationApi.completeInspection(caseData.id);
      toast.success('Outgoing inspection marked as done');
      onOpenChange(false);
      onCompleted?.(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not complete inspection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent elevated className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark outgoing inspection as done?</DialogTitle>
          <DialogDescription>
            This confirms the outgoing inspection is complete for this end-leasing case. The
            workflow will move to report comparison and make-good.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Inspector</dt>
              <dd className="font-medium">{inspection.inspectorName ?? 'Pending assignment'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Scheduled</dt>
              <dd className="font-medium">
                {inspection.inspectionDate
                  ? formatDateTime(inspection.inspectionDate)
                  : 'Not scheduled'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Issues found</dt>
              <dd className="font-medium">{inspection.issuesFound}</dd>
            </div>
          </dl>
        </div>
        <p className="text-muted-foreground text-xs">
          Only confirm if the outgoing inspection has been conducted and the report is ready to
          proceed.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Mark as done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
