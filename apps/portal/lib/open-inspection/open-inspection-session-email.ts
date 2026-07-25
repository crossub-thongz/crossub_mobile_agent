import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
import { openInspectionReportAttachmentName } from '@/lib/open-inspection-report-email';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { formatCrossubOutboundSender } from '@/lib/workflow-outbound-mail';
import { formatAgentSender } from '@/lib/job-case-email-sender';
import {
  formatLandlordRecipient,
  formatTenantRecipient,
} from '@/lib/job-case-email-recipients';

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
  const landlordName = session.landlord?.name?.trim() || 'Landlord';
  const agentName = session.agent?.name?.trim() || 'Managing Agent';
  return {
    id: `${session.id}-landlord-report`,
    subject: `Open inspection report — ${propertyLabel}`,
    body: [
      `Dear ${landlordName},`,
      '',
      `Please find attached the open inspection report for ${propertyLabel}.`,
      '',
      'Kind regards,',
      agentName,
    ].join('\n'),
    ...formatCrossubOutboundSender(),
    ...formatLandlordRecipient({
      name: session.landlord?.name?.trim(),
      email: recipientEmail || session.landlord?.email,
    }),
    at: session.landlordReportEmailedAt,
    kind: 'open_report_landlord',
    attachments: [
      {
        name: openInspectionReportAttachmentName(session.id),
        mimeType: 'application/pdf',
        url: openViewingsApi.reportPdfUrl(session.id),
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
      ...formatTenantRecipient({
        email: visitor.email,
        name: visitor.name,
      }),
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
