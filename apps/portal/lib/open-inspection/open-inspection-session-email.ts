import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
import { formatAgentSender } from '@/lib/job-case-email-sender';

function agentSender(
  session: OpenInspectionSession,
): Pick<JobCaseEmailRecord, 'from' | 'fromEmail'> {
  return formatAgentSender({ name: session.agent?.name });
}

/** Landlord open-inspection report email sent from the Report step. */
export function openInspectionLandlordReportEmail(
  session: OpenInspectionSession,
): JobCaseEmailRecord | null {
  if (!session.landlordReportEmailedAt?.trim()) return null;
  const propertyLabel = session.address?.trim() || session.property;
  const recipientEmail =
    session.landlordReportEmailedTo?.trim() || session.landlord?.email?.trim() || '';
  const agent = agentSender(session);
  return {
    id: `${session.id}-landlord-report`,
    subject: `Open inspection report — ${propertyLabel}`,
    body: [
      'Open inspection PDF report emailed to the property landlord.',
      '',
      `Sent by: ${agent.from}`,
      recipientEmail ? `Sent to: ${recipientEmail}` : '',
      `Attached: open-report-${session.id.slice(0, 8)}.pdf`,
    ]
      .filter(Boolean)
      .join('\n'),
    ...agent,
    to: session.landlord?.name?.trim() || recipientEmail || 'Landlord',
    toEmail: recipientEmail || undefined,
    at: session.landlordReportEmailedAt,
    kind: 'open_report_landlord',
    attachments: [
      {
        name: `open-report-${session.id.slice(0, 8)}.pdf`,
        mimeType: 'application/pdf',
      },
    ],
  };
}

/** Application-link emails sent to open-inspection check-in visitors. */
export function openInspectionApplyLinkEmails(
  session: OpenInspectionSession,
): JobCaseEmailRecord[] {
  const propertyLabel = session.address?.trim() || session.property;
  const applyUrl = session.applyUrl?.trim();
  const agent = agentSender(session);

  return (session.visitors ?? [])
    .filter((visitor) => visitor.applyLinkSentAt?.trim())
    .map((visitor) => ({
      id: `${visitor.id}-apply-link`,
      subject: `Rental application — ${propertyLabel}`,
      body: [
        `Application form link and QR code sent to ${visitor.name || visitor.email}.`,
        '',
        `Sent by: ${agent.from}`,
        applyUrl
          ? `Apply link:\n${applyUrl}\n\nThe email included the application link and an attached QR code.`
          : 'The email included the application link and an attached QR code.',
      ].join('\n'),
      ...agent,
      to: visitor.email,
      toEmail: visitor.email,
      at: visitor.applyLinkSentAt!,
      kind: 'application_link_sent',
    }));
}

export function openInspectionSessionEmails(
  session: OpenInspectionSession,
): JobCaseEmailRecord[] {
  const records = openInspectionApplyLinkEmails(session);
  const landlordReport = openInspectionLandlordReportEmail(session);
  if (landlordReport) records.push(landlordReport);
  return dedupeJobCaseEmails(records);
}
