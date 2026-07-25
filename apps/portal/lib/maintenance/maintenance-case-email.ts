import {
  dedupeJobCaseEmails,
  mimeTypeForAttachmentFilename,
  type JobCaseEmailRecord,
} from '@/lib/job-case-email';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';

function attachmentsForEmail(
  email: JobCaseEmailRecord,
  requestAttachments: ApiMaintenanceAttachment[],
): ApiMaintenanceAttachment[] {
  const hay = `${email.kind ?? ''} ${email.subject} ${email.body}`.toLowerCase();

  if (/invoice|payment|paid|billing/.test(hay)) {
    return requestAttachments.filter((a) => a.kind === 'invoice');
  }

  if (/quotation|quote|rfq|counter offer|requote|handyman/.test(hay)) {
    return requestAttachments.filter((a) => a.kind === 'quote');
  }

  if (
    /responsibility|review|landlord|tenant|schedule|visit|rfq|contractor|evidence|photo|repair/.test(
      hay,
    )
  ) {
    return requestAttachments.filter(
      (a) => a.kind === 'initial_evidence' || a.kind === 'evidence',
    );
  }

  return [];
}

export function enrichMaintenanceEmailRecords(
  requestId: string,
  attachments: ApiMaintenanceAttachment[] | null | undefined,
  emails: JobCaseEmailRecord[],
): JobCaseEmailRecord[] {
  const forRequest = (attachments ?? []).filter((a) => a.maintenanceRequestId === requestId);
  if (forRequest.length === 0) return emails;

  return emails.map((email) => {
    if (email.attachments?.length) return email;
    const matched = attachmentsForEmail(email, forRequest);
    if (matched.length === 0) return email;
    return {
      ...email,
      attachments: matched.map((attachment) => ({
        name: attachment.fileName,
        mimeType: attachment.mimeType || mimeTypeForAttachmentFilename(attachment.fileName),
        url: `/api/maintenance/attachments/${attachment.id}/preview`,
      })),
    };
  });
}
