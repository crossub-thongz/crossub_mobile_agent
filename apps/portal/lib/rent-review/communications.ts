import {
  dedupeJobCaseEmails,
  mimeTypeForAttachmentFilename,
  type JobCaseEmailRecord,
} from '@/lib/job-case-email';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';

const COMM_AUDIT_KINDS = new Set([
  'landlord_research_email',
  'agent_research_email',
  'comm_reply',
  'comm_forward',
  'agent_counter_offer_email',
  'tenant_accept_signed_lease_agent_email',
  'tenant_accept_signed_lease_admin_email',
  'accounting_complete_signed_lease_admin_email',
]);

interface RentReviewEmailSnapshot {
  subject: string;
  body: string;
  from: string;
  to: string;
  toEmail?: string;
  fromEmail?: string;
  channel?: 'email' | 'message';
  attachments?: JobCaseEmailRecord['attachments'];
  inReplyToId?: string;
}

function parseEmailSnapshot(detail: string | undefined): RentReviewEmailSnapshot | null {
  if (!detail?.trim()) return null;
  try {
    const parsed = JSON.parse(detail) as Partial<RentReviewEmailSnapshot>;
    if (
      typeof parsed.subject === 'string' &&
      typeof parsed.body === 'string' &&
      typeof parsed.from === 'string' &&
      typeof parsed.to === 'string'
    ) {
      return parsed as RentReviewEmailSnapshot;
    }
  } catch {
    /* legacy plain-text detail */
  }
  return null;
}

export function rentReviewEmailAttachmentUrl(
  propertyId: string,
  reviewId: string,
  auditId: string,
  filename: string,
): string {
  return `/api/v1/agent/properties/${propertyId}/workflows/rent-review/${reviewId}/communications/${auditId}/attachments/${encodeURIComponent(filename)}`;
}

/** Add open/download URLs for persisted email attachments. */
export function enrichRentReviewEmailRecords(
  detail: RentReviewWorkflowDetail,
  records: JobCaseEmailRecord[],
): JobCaseEmailRecord[] {
  if (!detail.propertyId) return records;

  const byId = new Map(records.map((r) => [r.id, r]));

  const withUrls = records.map((record) => {
    const sourceId = record.id;
    const attachments = record.attachments?.map((attachment) => ({
      ...attachment,
      mimeType: attachment.mimeType ?? mimeTypeForAttachmentFilename(attachment.name),
      url:
        attachment.url ??
        rentReviewEmailAttachmentUrl(
          detail.propertyId!,
          detail.id,
          sourceId,
          attachment.name,
        ),
    }));

    let inheritedAttachments = attachments;
    if ((!inheritedAttachments || inheritedAttachments.length === 0) && record.inReplyToId) {
      const parent = byId.get(record.inReplyToId);
      if (parent?.attachments?.length) {
        inheritedAttachments = parent.attachments.map((attachment) => ({
          ...attachment,
          mimeType: attachment.mimeType ?? mimeTypeForAttachmentFilename(attachment.name),
          url:
            attachment.url ??
            rentReviewEmailAttachmentUrl(
              detail.propertyId!,
              detail.id,
              parent.id,
              attachment.name,
            ),
        }));
      }
    }

    return {
      ...record,
      attachments: inheritedAttachments,
    };
  });

  return dedupeJobCaseEmails(withUrls);
}

/** Sent/received emails persisted on the rent-review audit log (server-side). */
export function commRecordsFromAuditLog(detail: RentReviewWorkflowDetail): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  for (const entry of detail.auditLog) {
    if (!COMM_AUDIT_KINDS.has(entry.kind)) continue;
    const snapshot = parseEmailSnapshot(entry.detail);
    if (!snapshot) continue;
    records.push({
      id: entry.id,
      subject: snapshot.subject,
      body: snapshot.body,
      from: snapshot.from,
      to: snapshot.to,
      toEmail: snapshot.toEmail,
      fromEmail: snapshot.fromEmail,
      at: entry.at,
      kind: entry.kind,
      channel: snapshot.channel ?? 'email',
      attachments: snapshot.attachments,
      inReplyToId: snapshot.inReplyToId,
    });
  }
  return enrichRentReviewEmailRecords(
    detail,
    records.sort((a, b) => b.at.localeCompare(a.at)),
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveCommInReplyToAuditId(recordId: string | undefined): string | undefined {
  if (!recordId?.trim() || !UUID_RE.test(recordId)) return undefined;
  return recordId;
}
