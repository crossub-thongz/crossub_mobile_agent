import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';

const CROSSUB_FROM = 'leasing@crossub.com.au';

function crossubSender(): Pick<JobCaseEmailRecord, 'from' | 'fromEmail'> {
  return { from: CROSSUB_FROM, fromEmail: CROSSUB_FROM };
}

/** Application-link emails sent to open-inspection check-in visitors. */
export function openInspectionApplyLinkEmails(
  session: OpenInspectionSession,
): JobCaseEmailRecord[] {
  const propertyLabel = session.address?.trim() || session.property;
  const applyUrl = session.applyUrl?.trim();

  return session.visitors
    .filter((visitor) => visitor.applyLinkSentAt?.trim())
    .map((visitor) => ({
      id: `${visitor.id}-apply-link`,
      subject: `Rental application — ${propertyLabel}`,
      body: [
        `Application form link and QR code sent to ${visitor.name || visitor.email}.`,
        '',
        applyUrl
          ? `Apply link:\n${applyUrl}\n\nThe email included the application link and an attached QR code.`
          : 'The email included the application link and an attached QR code.',
      ].join('\n'),
      ...crossubSender(),
      to: visitor.email,
      toEmail: visitor.email,
      at: visitor.applyLinkSentAt!,
      kind: 'application_link_sent',
    }));
}

export function openInspectionSessionEmails(
  session: OpenInspectionSession,
): JobCaseEmailRecord[] {
  return dedupeJobCaseEmails(openInspectionApplyLinkEmails(session));
}
