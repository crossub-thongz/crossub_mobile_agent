'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { OpenInspectionCheckInVisitorDetails } from '@/components/open-inspection/open-inspection-check-in-visitor-details';
import { Button } from '@/components/ui/button';
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
  const [sending, setSending] = useState(false);
  const reportReady = session.openReportGenerated === true;
  const visitors = session.visitors;
  const landlordEmail = session.landlord?.email?.trim() || '';

  const sendToLandlord = async () => {
    setSending(true);
    try {
      const result = await openViewingsApi.sendReportToLandlord(
        session.id,
        landlordEmail || undefined,
      );
      onSessionChange?.(result.session);
      toast.success('Open report emailed to landlord');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not email the report');
    } finally {
      setSending(false);
    }
  };

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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            disabled={sending}
            onClick={() => void sendToLandlord()}
          >
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            {sending ? 'Sending…' : 'Email report to landlord'}
          </Button>
          {landlordEmail ? (
            <p className="text-muted-foreground text-xs">Sends to {landlordEmail}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Uses the landlord email on file for this property.
            </p>
          )}
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
