'use client';

import { useState } from 'react';
import { Loader2, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { CaseNestedDialog } from '@/components/agent/case-nested-dialog';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { openViewingsApi } from '@/lib/open-viewings-api';

export function OpenInspectionReportStage({
  session,
  propertyLabel,
}: {
  session: OpenInspectionSession;
  propertyLabel: string;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [landlordEmail, setLandlordEmail] = useState(session.landlord?.email?.trim() ?? '');
  const [sending, setSending] = useState(false);
  const reportReady = session.openReportGenerated === true;
  const visitors = session.visitors;

  const sendToLandlord = async () => {
    const email = landlordEmail.trim();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid landlord email');
      return;
    }
    setSending(true);
    try {
      await openViewingsApi.sendReportToLandlord(session.id, email);
      toast.success('Open report emailed to landlord');
      setEmailOpen(false);
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
                  {visitor.phone ? <p>Phone: {visitor.phone}</p> : null}
                  {visitor.email ? <p>Email: {visitor.email}</p> : null}
                  {visitor.followUpNote?.trim() ? (
                    <p className="flex items-start gap-1.5">
                      <MessageSquare className="mt-0.5 size-3 shrink-0" />
                      <span>{visitor.followUpNote}</span>
                    </p>
                  ) : (
                    <p>Notes: —</p>
                  )}
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
            onClick={() => setEmailOpen(true)}
          >
            <Mail className="size-3.5" />
            Email report (send to landlord)
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Complete applicant review to generate the open inspection report.
        </p>
      )}

      <CaseNestedDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Email report to landlord"
        description="Send the open inspection PDF to the property landlord."
      >
        <div className="space-y-2">
          <Label htmlFor="landlord-report-email">Landlord email</Label>
          <Input
            id="landlord-report-email"
            type="email"
            value={landlordEmail}
            onChange={(e) => setLandlordEmail(e.target.value)}
            disabled={sending}
            placeholder="landlord@email.com"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setEmailOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void sendToLandlord()} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send report'
            )}
          </Button>
        </div>
      </CaseNestedDialog>
    </section>
  );
}
