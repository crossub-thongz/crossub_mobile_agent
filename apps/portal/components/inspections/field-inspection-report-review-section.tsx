'use client';

import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import type { InspectionRecord } from '@/lib/inspections-types';
import { deriveFieldInspectionReportReviewState } from '@/lib/inspections/agent-field-inspection-status';
import { cn } from '@/lib/utils';

export function FieldInspectionReportReviewSection({
  inspectionId,
  record,
  propertyLabel,
  inspectionType,
  reportUrl,
  approvedAt,
  reportDeclineReason,
}: {
  inspectionId: string;
  record: InspectionRecord | null;
  propertyLabel: string;
  inspectionType: 'ingoing' | 'outgoing';
  reportUrl?: string | null;
  onUpdated?: () => void | Promise<void>;
  tenantReportSigned?: boolean;
  leasingTenantApproved?: boolean;
  agentAcknowledged?: boolean;
  approvedAt?: string | null;
  reportDeclineReason?: string | null;
}) {
  const kindLabel = inspectionType === 'ingoing' ? 'Ingoing' : 'Outgoing';
  const declineReason =
    reportDeclineReason?.trim() || record?.reportDeclineReason?.trim() || '';
  const state = deriveFieldInspectionReportReviewState({
    record,
    reportUrl,
    approvedAt: approvedAt ?? record?.approvedAt,
    reportDeclineReason: declineReason,
  });

  if (state === 'hidden') return null;

  if (state === 'rejected') {
    return (
      <section className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{kindLabel} report review</p>
          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
            Rejected
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          CROSSUB rejected this report. The inspector must correct it and resubmit.
        </p>
        {declineReason ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Reason: </span>
            {declineReason}
          </p>
        ) : null}
      </section>
    );
  }

  const pending = state === 'pending_crossub';

  return (
    <section
      className={cn(
        'space-y-3 rounded-2xl border p-4',
        pending
          ? 'border-amber-500/25 bg-amber-500/5'
          : 'border-emerald-500/25 bg-emerald-500/5',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">
          {pending
            ? `${kindLabel} report review pending approval from CROSSUB`
            : `${kindLabel} report review`}
        </p>
        {pending ? null : (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Approved
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {pending
          ? 'Preview or download the submitted report. CROSSUB is reviewing it before this job is complete.'
          : 'CROSSUB has approved this report. You can view or download it.'}
      </p>

      <InspectionReportDownloadActions
        inspectionId={inspectionId}
        reportUrl={reportUrl}
        propertyLabel={propertyLabel}
        inspectionType={inspectionType}
        canDownload
        variant="inline"
      />
    </section>
  );
}
