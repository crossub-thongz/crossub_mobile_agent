'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { inspectionsApi } from '@/lib/inspections-api';
import { mapInspectionRecordToView } from '@/lib/inspection-mappers';
import {
  routineInspectionApi,
  type ServerRoutineScheduleView,
} from '@/lib/routine-inspection-api';

export function RoutineSelfInspectionReviewSection({
  schedule,
  propertyLabel,
  onUpdated,
}: {
  schedule: ServerRoutineScheduleView;
  propertyLabel: string;
  onUpdated: (next: ServerRoutineScheduleView) => void;
}) {
  const { refresh, registerInspection } = useAgentData();
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);

  const inspectionId = schedule.currentInspectionId ?? schedule.currentInspection?.id ?? null;

  if (schedule.flow !== 'self' || schedule.selfStatus !== 'submitted' || !inspectionId) {
    return null;
  }

  const run = async (action: 'approve' | 'decline') => {
    if (action === 'decline') {
      const reason = declineReason.trim();
      if (!reason) {
        toast.error('Please provide a reason for declining');
        return;
      }
    }

    setBusy(action);
    try {
      const updated =
        action === 'approve'
          ? await routineInspectionApi.approveSelf(schedule.id)
          : await routineInspectionApi.declineSelf(schedule.id, {
              reason: declineReason.trim(),
            });
      onUpdated(updated);
      if (action === 'approve' && inspectionId) {
        try {
          const record = await inspectionsApi.get(inspectionId);
          registerInspection(mapInspectionRecordToView(record));
        } catch {
          // Portfolio refresh below will reconcile status from the API.
        }
      }
      await refresh();
      setShowDecline(false);
      setDeclineReason('');
      toast.success(
        action === 'approve'
          ? 'Self-inspection approved — report finalized'
          : 'Self-inspection declined — tenant notified to resubmit',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
      <div>
        <p className="text-sm font-semibold">Tenant self-inspection review</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Preview or download the submitted report, then approve or decline with feedback for
          the tenant.
        </p>
      </div>

      <InspectionReportDownloadActions
        inspectionId={inspectionId}
        propertyLabel={propertyLabel}
        inspectionType="routine"
        canDownload
        variant="inline"
      />

      {!showDecline ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={busy !== null}
            onClick={() => void run('approve')}
          >
            {busy === 'approve' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Approve report
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={busy !== null}
            onClick={() => setShowDecline(true)}
          >
            <XCircle className="size-3.5" />
            Decline
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={declineReason}
            inputKind="inspection_comment"
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Explain what the tenant needs to fix or resubmit…"
            rows={3}
            maxLength={500}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-1.5"
              disabled={busy !== null}
              onClick={() => void run('decline')}
            >
              {busy === 'decline' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <XCircle className="size-3.5" />
              )}
              Confirm decline
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy !== null}
              onClick={() => {
                setShowDecline(false);
                setDeclineReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
