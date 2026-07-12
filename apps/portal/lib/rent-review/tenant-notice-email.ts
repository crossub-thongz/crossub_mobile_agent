import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import {
  resolveTenantNoticeTerms,
  tenantNoticeTermsEmailLines,
} from '@/lib/rent-review/tenant-notice-terms';
import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';

interface TenantNoticeEmailSnapshot {
  subject: string;
  body: string;
  from: string;
  to: string;
  toEmail?: string;
  channel?: 'email' | 'message';
}

function parseTenantNoticeEmailSnapshot(detail: string | undefined): TenantNoticeEmailSnapshot | null {
  if (!detail?.trim()) return null;
  try {
    const parsed = JSON.parse(detail) as Partial<TenantNoticeEmailSnapshot>;
    if (
      typeof parsed.subject === 'string' &&
      typeof parsed.body === 'string' &&
      typeof parsed.from === 'string' &&
      typeof parsed.to === 'string'
    ) {
      return parsed as TenantNoticeEmailSnapshot;
    }
  } catch {
    /* legacy plain-text detail */
  }
  return null;
}

export function buildTenantNoticeEmailSubject(detail: RentReviewWorkflowDetail): string {
  return `Notice of rent increase — ${detail.propertyAddress}`;
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
    'Please find attached your formal Notice of Rent Increase.',
    '',
    'Confirmed terms:',
    termsBlock,
    '',
    'Please reply to confirm acceptance, submit a counter-offer, or let us know if you wish to decline.',
    '',
    'Kind regards,',
    'Your managing agent',
  ].join('\n');
}

export function buildTenantNoticeEmailRecord(
  detail: RentReviewWorkflowDetail,
  auditEntry: RentReviewAuditEntry,
): JobCaseEmailRecord {
  const snapshot = parseTenantNoticeEmailSnapshot(auditEntry.detail);
  if (snapshot) {
    return {
      id: auditEntry.id,
      subject: snapshot.subject,
      body: snapshot.body,
      from: snapshot.from,
      to: snapshot.to,
      toEmail: snapshot.toEmail,
      at: auditEntry.at,
      kind: auditEntry.kind,
      channel: snapshot.channel ?? 'email',
    };
  }

  return {
    id: auditEntry.id,
    subject: buildTenantNoticeEmailSubject(detail),
    from: 'Managing Agent',
    to: detail.tenantName,
    at: auditEntry.at,
    kind: auditEntry.kind,
    body: buildTenantNoticeEmailBody(detail),
  };
}
