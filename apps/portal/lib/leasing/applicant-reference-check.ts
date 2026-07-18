import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
import { allLeasingEmailRecords } from '@/lib/leasing/agent-workflow-email';
import type {
  LeasingApplicationDetail,
  LeasingPropertyDetail,
  LeasingTimelineEvent,
} from '@/lib/leasing/types';
import { openInspectionSessionEmails } from '@/lib/open-inspection/open-inspection-session-email';

function matchesApplicantEmail(record: JobCaseEmailRecord, app: LeasingApplicationDetail): boolean {
  if (!app.email?.trim() || !record.toEmail) return false;
  return record.toEmail.trim().toLowerCase() === app.email.trim().toLowerCase();
}

function linkedVisitor(
  session: OpenInspectionSession,
  app: LeasingApplicationDetail,
) {
  return session.visitors.find((visitor) => {
    if (visitor.application?.id && visitor.application.id === app.id) return true;
    if (
      app.email?.trim() &&
      visitor.email?.trim() &&
      visitor.email.trim().toLowerCase() === app.email.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  });
}

function applicantSessionEmails(
  session: OpenInspectionSession,
  app: LeasingApplicationDetail,
): JobCaseEmailRecord[] {
  const visitor = linkedVisitor(session, app);
  return openInspectionSessionEmails(session).filter((record) => {
    if (matchesApplicantEmail(record, app)) return true;
    if (visitor && record.id.includes(visitor.id)) return true;
    if (record.id.includes(app.id)) return true;
    return false;
  });
}

export function applicantEmailRecords(
  detail: LeasingPropertyDetail,
  app: LeasingApplicationDetail,
  openSession?: OpenInspectionSession | null,
): JobCaseEmailRecord[] {
  const applicantNeedle = app.applicant.trim().toLowerCase();
  const fromLeasing = allLeasingEmailRecords(detail).filter((record) => {
    if (record.id.includes(app.id)) return true;
    if (matchesApplicantEmail(record, app)) return true;
    if (record.kind === 'application_feedback' && record.body && applicantNeedle) {
      return record.subject.toLowerCase().includes(applicantNeedle);
    }
    return false;
  });
  const fromOpen = openSession ? applicantSessionEmails(openSession, app) : [];
  return dedupeJobCaseEmails([...fromLeasing, ...fromOpen]);
}

function matchesApplicantAudit(
  entry: Pick<LeasingTimelineEvent, 'label' | 'actor'>,
  needles: string[],
): boolean {
  const haystack = `${entry.label} ${entry.actor}`.toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

export function applicantAuditEntries(
  detail: LeasingPropertyDetail,
  app: LeasingApplicationDetail,
  openSession?: OpenInspectionSession | null,
): LeasingTimelineEvent[] {
  const needles = [
    app.applicant.trim().toLowerCase(),
    app.id.toLowerCase(),
    app.email?.trim().toLowerCase() ?? '',
  ].filter(Boolean);

  const fromLeasing = detail.timeline.filter((entry) => matchesApplicantAudit(entry, needles));
  const fromOpen = (openSession?.timeline ?? []).filter((entry) =>
    matchesApplicantAudit(entry, needles),
  );

  const byId = new Map<string, LeasingTimelineEvent>();
  for (const entry of [...fromLeasing, ...fromOpen]) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}
