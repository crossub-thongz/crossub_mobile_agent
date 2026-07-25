'use client';

import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { OpenInspectionCheckInVisitorDetails } from '@/components/open-inspection/open-inspection-check-in-visitor-details';
import { OpenInspectionLandlordReportEmailButton } from '@/components/open-inspection/open-inspection-landlord-report-email-button';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { openViewingsApi } from '@/lib/open-viewings-api';

export function OpenInspectionReportStage({
  session,
  propertyLabel,
  onSessionChange,
}: {
  session: OpenInspectionSession;
  propertyLabel: string;
  onSessionChange?: (session: OpenInspectionSession) => void;
}) {
  const reportReady = session.openReportGenerated === true;
  const visitors = session.visitors;

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Report</h2>

      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wide">
          Check-in details
        </p>
        {visitors.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
            No check-ins recorded for this viewing yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {visitors.map((visitor) => (
              <li key={visitor.id} className="rounded-xl border bg-background px-3 py-2.5 text-xs">
                <p className="font-medium">{visitor.name || 'Unnamed visitor'}</p>
                <div className="text-muted-foreground mt-1 space-y-0.5">
                  {visitor.phone ? <p>Mobile: {visitor.phone}</p> : null}
                  {visitor.email ? <p>E-mail: {visitor.email}</p> : null}
                  <OpenInspectionCheckInVisitorDetails
                    visitor={visitor}
                    sessionLeaseTerm={session.rental?.leaseTerm}
                    variant="detailed"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reportReady ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Open inspection report
          </p>
          <InspectionReportDownloadActions
            inspectionId={session.id}
            propertyLabel={propertyLabel}
            inspectionType="open"
            fetchPdf={openViewingsApi.downloadReportPdf}
            variant="inline"
            size="sm"
          />
          <OpenInspectionLandlordReportEmailButton
            session={session}
            onSessionChange={onSessionChange}
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Complete applicant review to generate the open inspection report.
        </p>
      )}

      {session.sessionStatus === 'closed' ? (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
          This open inspection is closed.
        </p>
      ) : null}
    </section>
  );
}
