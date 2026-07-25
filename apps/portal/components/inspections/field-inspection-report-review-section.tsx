'use client';

import { useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { inspectionsApi } from '@/lib/inspections-api';
import { mapInspectionRecordToView } from '@/lib/inspection-mappers';
import type { InspectionRecord } from '@/lib/inspections-types';
import {
  canRejectFieldInspectionReport,
  FIELD_INSPECTION_PHASE,
} from '@/lib/inspections/agent-field-inspection-status';

export function FieldInspectionReportReviewSection({
  inspectionId,
  record,
  propertyLabel,
  inspectionType,
  reportUrl,
  onUpdated,
  tenantReportSigned,
  leasingTenantApproved,
  agentAcknowledged,
}: {
  inspectionId: string;
  record: InspectionRecord | null;
  propertyLabel: string;
  inspectionType: 'ingoing' | 'outgoing';
  reportUrl?: string | null;
  onUpdated: () => void | Promise<void>;
  tenantReportSigned?: boolean;
  leasingTenantApproved?: boolean;
  agentAcknowledged?: boolean;
}) {
  const { refresh, registerInspection } = useAgentData();
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [busy, setBusy] = useState(false);

  const canReject = canRejectFieldInspectionReport(record, {
    tenantReportSigned,
    leasingTenantApproved,
    agentAcknowledged,
  });

  const awaitingResubmit =
    record?.reportDeclineReason &&
    record.status === 'IN_PROGRESS' &&
    record.workflowPhase === FIELD_INSPECTION_PHASE.IN_PROGRESS;

  if (!canReject && !awaitingResubmit) {
    return null;
  }

  const runDecline = async () => {
    const reason = declineReason.trim();
    if (!reason) {
      toast.error('Please provide a reason for declining');
      return;
    }

    setBusy(true);
    try {
      const updated = await inspectionsApi.rejectReport(inspectionId, { reason });
      registerInspection(mapInspectionRecordToView(updated));
      await onUpdated();
      await refresh();
      setShowDecline(false);
      setDeclineReason('');
      toast.success('Report declined — inspector notified to redo and resubmit');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (awaitingResubmit && !canReject) {
    return (
      <section className="space-y-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="text-sm font-semibold">Awaiting inspector resubmit</p>
        <p className="text-muted-foreground text-xs">
          You declined this report. The inspector must redo the inspection and submit a
          revised report.
        </p>
        {record?.reportDeclineReason ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Your feedback: </span>
            {record.reportDeclineReason}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
      <div>
        <p className="text-sm font-semibold">
          {inspectionType === 'ingoing' ? 'Ingoing' : 'Outgoing'} report review
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Preview or download the submitted report, then decline with feedback if the
          inspector must redo and resubmit.
        </p>
      </div>

      <InspectionReportDownloadActions
        inspectionId={inspectionId}
        reportUrl={reportUrl}
        propertyLabel={propertyLabel}
        inspectionType={inspectionType}
        canDownload
        variant="inline"
      />

      {!showDecline ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={busy}
          onClick={() => setShowDecline(true)}
        >
          <XCircle className="size-3.5" />
          Decline report
        </Button>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Explain what the inspector needs to fix or resubmit…"
            rows={3}
            maxLength={500}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-1.5"
              disabled={busy}
              onClick={() => void runDecline()}
            >
              {busy ? (
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
              disabled={busy}
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
