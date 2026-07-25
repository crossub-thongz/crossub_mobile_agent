'use client';

import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { OpenInspectionLandlordReportEmailButton } from '@/components/open-inspection/open-inspection-landlord-report-email-button';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { openViewingsApi } from '@/lib/open-viewings-api';

function isLeasingOpenReportReady(detail: LeasingPropertyDetail): boolean {
  const or = detail.openReport;
  return (
    or.reportViewable ||
    or.sentToAgent ||
    or.status === LEASING_ITEM_STATUS.DONE
  );
}

export function OpenLeasingInspectionReportPanel({
  detail,
  openSession,
  className,
  showPending = false,
  onSessionChange,
}: {
  detail: LeasingPropertyDetail;
  openSession?: OpenInspectionSession | null;
  className?: string;
  /** When true, render the section even before the PDF is ready (Report Available step). */
  showPending?: boolean;
  onSessionChange?: (session: OpenInspectionSession) => void;
}) {
  const ready = isLeasingOpenReportReady(detail) || openSession?.openReportGenerated === true;
  if (!ready && !showPending) {
    return null;
  }

  const sessionId = openSession?.id ?? detail.openInspection.viewingSessionId;
  const cycleId = detail.cycleId;
  const sources = openSession?.reportSourceCounts;
  const useSessionPdf = Boolean(sessionId);

  return (
    <section className={className ?? 'rounded-2xl border bg-card p-4'}>
      <h2 className="mb-3 text-sm font-semibold">Open inspection report</h2>
      {ready ? (
        sessionId ? (
          <InspectionReportDownloadActions
            inspectionId={sessionId}
            propertyLabel={detail.propertyAddress}
            inspectionType="open"
            fetchPdf={openViewingsApi.downloadReportPdf}
            variant="inline"
            size="sm"
            downloadOnly
          />
        ) : cycleId ? (
          <InspectionReportDownloadActions
            inspectionId={cycleId}
            propertyLabel={detail.propertyAddress}
            inspectionType="open"
            fetchPdf={leasingOpsApi.downloadOpenReportPdf}
            variant="inline"
            size="sm"
            downloadOnly
          />
        ) : null
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          The viewing window has started. The open report will appear here once the inspection
          is complete.
        </p>
      )}
      {ready && openSession ? (
        <OpenInspectionLandlordReportEmailButton
          session={openSession}
          onSessionChange={onSessionChange}
          className="mt-3"
        />
      ) : null}
      {sources ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <p className="text-muted-foreground col-span-2 font-medium uppercase tracking-wide">
            Open report summary
          </p>
          <p>Tenant app: {sources.tenantApp}</p>
          <p>Apply link / QR: {sources.linkOrQr}</p>
        </div>
      ) : typeof detail.openReport.attendeeCount === 'number' ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Viewing attendees: {detail.openReport.attendeeCount}
        </p>
      ) : null}
      {ready && !useSessionPdf && !cycleId ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Report is being prepared — refresh in a moment if download is not ready yet.
        </p>
      ) : null}
    </section>
  );
}

export { isLeasingOpenReportReady };
