import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import { allLeasingEmailRecords } from '@/lib/leasing/agent-workflow-email';
import type { LeasingApplicationDetail, LeasingPropertyDetail } from '@/lib/leasing/types';

function matchesApplicantEmail(record: JobCaseEmailRecord, app: LeasingApplicationDetail): boolean {
  if (!app.email?.trim() || !record.toEmail) return false;
  return record.toEmail.trim().toLowerCase() === app.email.trim().toLowerCase();
}

export function applicantEmailRecords(
  detail: LeasingPropertyDetail,
  app: LeasingApplicationDetail,
): JobCaseEmailRecord[] {
  const applicantNeedle = app.applicant.trim().toLowerCase();
  return allLeasingEmailRecords(detail).filter((record) => {
    if (record.id.includes(app.id)) return true;
    if (matchesApplicantEmail(record, app)) return true;
    if (record.kind === 'application_feedback' && record.body && applicantNeedle) {
      return record.subject.toLowerCase().includes(applicantNeedle);
    }
    return false;
  });
}

export function applicantAuditEntries(
  detail: LeasingPropertyDetail,
  app: LeasingApplicationDetail,
) {
  const needles = [app.applicant.trim().toLowerCase(), app.id.toLowerCase()].filter(Boolean);
  return detail.timeline
    .filter((entry) => {
      const haystack = `${entry.label} ${entry.actor}`.toLowerCase();
      return needles.some((needle) => haystack.includes(needle));
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
