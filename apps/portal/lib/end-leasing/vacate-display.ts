import { TERMINATION_TYPE } from '@/constants/end-leasing';
import { isBreachLease } from '@/lib/end-leasing/agent-workflow-model';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** FIXED or PERIODIC for display. */
export function endLeasingLeaseTypeLabel(caseData: TerminationCaseDetail): 'Fixed' | 'Periodic' {
  if (!caseData.leaseEndDate) return 'Periodic';
  const end = new Date(caseData.leaseEndDate);
  if (Number.isNaN(end.getTime())) return 'Fixed';
  return 'Fixed';
}

/** Date the tenant notified the agency of their intention to vacate. */
export function tenantNoticeDate(caseData: TerminationCaseDetail): string | null {
  if (caseData.terminationType === TERMINATION_TYPE.TENANT_INITIATED) {
    return caseData.createdAt?.slice(0, 10) ?? null;
  }
  return (
    caseData.terminationNotice?.tenantVacateDateProvidedAt?.slice(0, 10) ??
    caseData.terminationNotice?.noticeEmailSentAt?.slice(0, 10) ??
    caseData.createdAt?.slice(0, 10) ??
    null
  );
}

/** Statutory notice period label — 14 days fixed, 21 days periodic, N/A for breach. */
export function daysNotifyInAdvanceLabel(caseData: TerminationCaseDetail): string {
  if (isBreachLease(caseData)) return 'N/A — breach lease';
  if (endLeasingLeaseTypeLabel(caseData) === 'Fixed') return '14 days';
  return '21 days';
}

/** Actual calendar days between tenant notice and vacate date, when both are known. */
export function actualDaysNoticeToVacate(caseData: TerminationCaseDetail): number | null {
  const notice = tenantNoticeDate(caseData);
  const vacate =
    caseData.vacate.expectedVacateDate ??
    caseData.vacateDate ??
    caseData.terminationNotice?.tenantVacateDate;
  if (!notice || !vacate) return null;
  const a = new Date(`${notice}T12:00:00`);
  const b = new Date(`${vacate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * Breach path only — % of the original lease term still remaining at notice.
 * Uses lease start/end and the tenant notice date as the reference point.
 */
export function agreementRemainingPercent(caseData: TerminationCaseDetail): number | null {
  if (!isBreachLease(caseData)) return null;
  if (!caseData.leaseStartDate || !caseData.leaseEndDate) return null;

  const start = new Date(`${caseData.leaseStartDate.slice(0, 10)}T12:00:00`);
  const end = new Date(`${caseData.leaseEndDate.slice(0, 10)}T12:00:00`);
  const refRaw = tenantNoticeDate(caseData) ?? caseData.vacateDate;
  if (!refRaw) return null;
  const ref = new Date(`${refRaw.slice(0, 10)}T12:00:00`);

  const total = end.getTime() - start.getTime();
  if (total <= 0) return null;

  const remaining = end.getTime() - ref.getTime();
  const pct = Math.round((Math.max(0, remaining) / total) * 100);
  return Math.min(100, Math.max(0, pct));
}

export const NSW_BOND_RELEASE_URL = 'https://rbo.fairtrading.nsw.gov.au/agent/login';

const JOB_COMPLETED_REMINDER_RE = /^Job completed reminder #/i;

export function jobCompletedReminderTimelineEntries(
  caseData: TerminationCaseDetail,
): TerminationCaseDetail['timeline'] {
  return caseData.timeline.filter((e) => JOB_COMPLETED_REMINDER_RE.test(e.label));
}
