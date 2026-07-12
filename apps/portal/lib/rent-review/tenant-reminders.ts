import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatCurrency } from '@/lib/utils';

export interface TenantReminderEmail {
  entry: RentReviewAuditEntry;
  index: number;
  subject: string;
  body: string;
}

export function listTenantResponseReminders(detail: RentReviewWorkflowDetail): RentReviewAuditEntry[] {
  return detail.auditLog
    .filter((e) => e.kind === 'tenant_response_reminder')
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function buildTenantReminderEmail(
  detail: RentReviewWorkflowDetail,
  entry: RentReviewAuditEntry,
  index: number,
): TenantReminderEmail {
  const weekly =
    detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent;
  const effective = detail.effectiveDate ?? 'to be confirmed';
  const reminderNote =
    entry.detail ??
    (index === 1
      ? 'First reminder — tenant response outstanding'
      : `Reminder ${index} — tenant response still outstanding`);

  return {
    entry,
    index,
    subject: `Reminder: Rent review response required — ${detail.propertyAddress}`,
    body: [
      `Dear ${detail.tenantName},`,
      '',
      `This is an automated reminder that we are still awaiting your response to the proposed rent increase for ${detail.propertyAddress}.`,
      '',
      `Proposed rent: ${formatCurrency(weekly)}/week`,
      `Rent increase effective from: ${effective}`,
      '',
      reminderNote,
      '',
      'Please contact your property manager to accept, decline, or submit a counter-offer.',
      '',
      'Kind regards,',
      'CROSSUB Property Management',
    ].join('\n'),
  };
}

export function buildAllTenantReminderEmails(detail: RentReviewWorkflowDetail): TenantReminderEmail[] {
  return listTenantResponseReminders(detail).map((entry, i) =>
    buildTenantReminderEmail(detail, entry, i + 1),
  );
}
