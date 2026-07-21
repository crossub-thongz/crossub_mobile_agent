import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import { formatAgentSender } from '@/lib/job-case-email-sender';
import { parseRentReviewEmailSnapshot } from '@/lib/rent-review/audit-detail-display';
import {
  resolveTenantNoticeTerms,
  tenantNoticeTermsEmailLines,
} from '@/lib/rent-review/tenant-notice-terms';
import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';

export function buildTenantNoticeEmailSubject(detail: RentReviewWorkflowDetail): string {
  return `Lease extension agreement — ${detail.propertyAddress}`;
}

export function buildTenantNoticeEmailBody(
  detail: RentReviewWorkflowDetail,
  overrides?: { effectiveDate?: string | null },
): string {
  const terms = resolveTenantNoticeTerms(detail, overrides);
  const termsBlock = tenantNoticeTermsEmailLines(terms).map((line) => `• ${line}`).join('\n');

  return [
    `Dear ${detail.tenantName},`,
    '',
    'Please find attached your lease extension agreement for review.',
    '',
    'Confirmed terms:',
    termsBlock,
    '',
    'Please reply to confirm acceptance, submit a counter-offer, or let us know if you wish to decline.',
    '',
    'Kind regards,',
    'Your managing agent (Agent portal)',
  ].join('\n');
}

export function buildTenantNoticeEmailRecord(
  detail: RentReviewWorkflowDetail,
  auditEntry: RentReviewAuditEntry,
): JobCaseEmailRecord {
  const snapshot = parseRentReviewEmailSnapshot(auditEntry.detail);
  if (snapshot) {
    const fileName = `lease-extension-agreement-${detail.id.slice(0, 8)}.pdf`;
    return {
      id: auditEntry.id,
      subject: snapshot.subject,
      body: snapshot.body,
      from: snapshot.from,
      to: snapshot.to,
      toEmail: snapshot.toEmail,
      fromEmail: snapshot.fromEmail,
      at: auditEntry.at,
      kind: auditEntry.kind,
      channel: snapshot.channel ?? 'email',
      attachments:
        snapshot.attachments?.map((a) => ({
          name: a.name,
          mimeType: a.mimeType ?? 'application/pdf',
        })) ?? [{ name: fileName, mimeType: 'application/pdf' }],
    };
  }

  return {
    id: auditEntry.id,
    subject: buildTenantNoticeEmailSubject(detail),
    ...formatAgentSender(),
    to: detail.tenantName,
    at: auditEntry.at,
    kind: auditEntry.kind,
    body: buildTenantNoticeEmailBody(detail),
  };
}
