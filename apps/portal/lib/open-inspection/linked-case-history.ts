import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
import { openInspectionJobCaseEmails } from '@/lib/leasing/agent-workflow-email';
import type { LeasingPropertyDetail, LeasingTimelineEvent } from '@/lib/leasing/types';
import { openInspectionSessionEmails } from '@/lib/open-inspection/open-inspection-session-email';
import type { TimelineEntry } from '@/lib/types';

/** Map leasing / viewing timeline rows into the inspection Activity shape. */
export function workflowEventToTimelineEntry(
  event: Pick<LeasingTimelineEvent, 'id' | 'label' | 'actor' | 'at' | 'kind'>,
): TimelineEntry {
  const actorLower = event.actor.toLowerCase();
  const actorRole: TimelineEntry['actorRole'] =
    actorLower.includes('agent') || actorLower.includes('account manager')
      ? 'agent'
      : actorLower.includes('tenant') || actorLower.includes('applicant')
        ? 'tenant'
        : actorLower.includes('crossub') || actorLower.includes('inspector')
          ? 'crossub'
          : 'system';

  return {
    id: event.id,
    at: event.at,
    actor: event.actor,
    actorRole,
    title: event.label,
    source: /email|emailed|mail/i.test(event.label) ? 'email' : 'system',
  };
}

export function mergeOpenAndLeasingTimeline(args: {
  openSession?: OpenInspectionSession | null;
  leasingDetail?: LeasingPropertyDetail | null;
  fallback?: TimelineEntry[];
}): TimelineEntry[] {
  const fromSession = (args.openSession?.timeline ?? []).map(workflowEventToTimelineEntry);
  const fromLeasing = (args.leasingDetail?.timeline ?? []).map(workflowEventToTimelineEntry);
  const byId = new Map<string, TimelineEntry>();
  for (const entry of [...fromSession, ...fromLeasing, ...(args.fallback ?? [])]) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}

/** Email history shared by linked open-inspection + new-leasing job cases. */
export function linkedOpenLeasingEmails(args: {
  openSession?: OpenInspectionSession | null;
  leasingDetail?: LeasingPropertyDetail | null;
}): JobCaseEmailRecord[] {
  const sessionEmails = args.openSession
    ? openInspectionSessionEmails(args.openSession)
    : [];
  const leasingEmails = args.leasingDetail
    ? openInspectionJobCaseEmails(args.leasingDetail)
    : [];
  return dedupeJobCaseEmails([...leasingEmails, ...sessionEmails]);
}
