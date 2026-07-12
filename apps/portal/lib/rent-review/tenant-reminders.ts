import {
  resolveTenantNoticeTerms,
  tenantNoticeTermsEmailLines,
} from '@/lib/rent-review/tenant-notice-terms';
import type { RentReviewAuditEntry, RentReviewWorkflowDetail } from '@/lib/rent-review/types';

/** Matches backend `RENT_REVIEW_TENANT_REMINDER_DAYS`. */
export const RENT_REVIEW_TENANT_REMINDER_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TenantReminderEmail {
  entry: RentReviewAuditEntry;
  index: number;
  subject: string;
  from: string;
  to: string;
  body: string;
  /** True for the next scheduled send — not yet in the audit log. */
  upcoming?: boolean;
  scheduledAt?: string;
}

export interface TenantReminderSchedule {
  active: boolean;
  nextIndex: number;
  nextDueAt: string | null;
  msRemaining: number;
  countdownLabel: string;
}

function noticeDispatchedAt(detail: RentReviewWorkflowDetail): string | null {
  const hit = [...detail.auditLog].reverse().find((e) => e.kind === 'tenant_notices_dispatched');
  return hit?.at ?? null;
}

export function isTenantReminderScheduleActive(detail: RentReviewWorkflowDetail): boolean {
  if (!noticeDispatchedAt(detail)) return false;
  if (
    ['tenant_accepted', 'tenant_rejected', 'accounting', 'completed', 'cancelled', 'postponed'].includes(
      detail.workflowState,
    )
  ) {
    return false;
  }
  if (
    detail.auditLog.some((e) =>
      ['tenant_accepted_response', 'tenant_rejected_response', 'tenant_counter_submitted'].includes(
        e.kind,
      ),
    )
  ) {
    return false;
  }
  return detail.workflowState === 'tenant_notified' || detail.workflowState === 'negotiation';
}

export function formatReminderCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Due now — sends on next automated sweep';
  const totalMinutes = Math.ceil(msRemaining / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `in ${days} day${days === 1 ? '' : 's'}${hours > 0 ? ` ${hours} hr` : ''}`;
  }
  if (hours > 0) return `in ${hours} hr ${minutes} min`;
  return `in ${minutes} min`;
}

/** When the next automated tenant reminder will fire (every 2 days after notice dispatch). */
export function resolveTenantReminderSchedule(
  detail: RentReviewWorkflowDetail,
  now = Date.now(),
): TenantReminderSchedule {
  const inactive: TenantReminderSchedule = {
    active: false,
    nextIndex: 0,
    nextDueAt: null,
    msRemaining: 0,
    countdownLabel: '',
  };

  if (!isTenantReminderScheduleActive(detail)) return inactive;

  const noticeAt = noticeDispatchedAt(detail);
  if (!noticeAt) return inactive;

  const sentCount = listTenantResponseReminders(detail).length;
  const nextIndex = sentCount + 1;
  const nextDueMs =
    new Date(noticeAt).getTime() + nextIndex * RENT_REVIEW_TENANT_REMINDER_DAYS * DAY_MS;
  const msRemaining = nextDueMs - now;

  return {
    active: true,
    nextIndex,
    nextDueAt: new Date(nextDueMs).toISOString(),
    msRemaining,
    countdownLabel: formatReminderCountdown(msRemaining),
  };
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
  const terms = resolveTenantNoticeTerms(detail);
  const termsBlock = tenantNoticeTermsEmailLines(terms).map((line) => `• ${line}`).join('\n');
  const reminderNote =
    entry.detail ??
    (index === 1
      ? 'First reminder — tenant response outstanding'
      : `Reminder ${index} — tenant response still outstanding`);

  return {
    entry,
    index,
    subject: `Reminder: Rent review response required — ${detail.propertyAddress}`,
    from: 'Managing Agent',
    to: detail.tenantName,
    body: [
      `Dear ${detail.tenantName},`,
      '',
      `This is an automated reminder that we are still awaiting your response to the proposed rent increase for ${detail.propertyAddress}.`,
      '',
      'Confirmed terms:',
      termsBlock,
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

export function buildUpcomingTenantReminderPreview(
  detail: RentReviewWorkflowDetail,
  index: number,
  scheduledAt: string,
): TenantReminderEmail {
  const previewEntry: RentReviewAuditEntry = {
    id: `${detail.id}-tenant-reminder-preview-${index}`,
    at: scheduledAt,
    actor: 'system',
    kind: 'tenant_response_reminder',
    message: 'Tenant reminder (scheduled)',
    detail:
      index === 1
        ? 'First reminder — tenant response outstanding'
        : `Reminder ${index} — tenant response still outstanding`,
  };

  return {
    ...buildTenantReminderEmail(detail, previewEntry, index),
    upcoming: true,
    scheduledAt,
  };
}

export function buildAllTenantReminderEmails(detail: RentReviewWorkflowDetail): TenantReminderEmail[] {
  return listTenantResponseReminders(detail).map((entry, i) =>
    buildTenantReminderEmail(detail, entry, i + 1),
  );
}

export function buildTenantReminderListItems(
  detail: RentReviewWorkflowDetail,
  now = Date.now(),
): TenantReminderEmail[] {
  const sent = buildAllTenantReminderEmails(detail);
  const schedule = resolveTenantReminderSchedule(detail, now);
  if (!schedule.active || !schedule.nextDueAt) return sent;

  return [
    ...sent,
    buildUpcomingTenantReminderPreview(detail, schedule.nextIndex, schedule.nextDueAt),
  ];
}
