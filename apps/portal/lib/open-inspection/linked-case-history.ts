import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  enrichFieldInspectionCaseEmails,
  filterRedundantOpenInspectionPoolEmails,
  filterRedundantOpenSessionEmails,
} from '@/lib/inspection/field-inspection-case-email';
import { mergeJobCaseEmailSources, type JobCaseEmailRecord } from '@/lib/job-case-email';
import {
  leasingEmailRecordsForStep,
  openInspectionJobCaseEmails,
} from '@/lib/leasing/agent-workflow-email';
import type { LeasingLifecycleStep } from '@/lib/leasing/constants';
import type { LeasingPropertyDetail, LeasingTimelineEvent } from '@/lib/leasing/types';
import type { InspectionRecord } from '@/lib/inspections-types';
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

/** Pool inspection id for open cases (viewing session id is not the pool row). */
export function resolveOpenPoolInspectionId(args: {
  leasingDetail?: LeasingPropertyDetail | null;
  openSession?: OpenInspectionSession | null;
  focusInspectionId?: string | null;
  isViewingSessionSource?: boolean;
}): string | null {
  const fromLeasing = args.leasingDetail?.openInspection?.inspectionId?.trim();
  if (fromLeasing) return fromLeasing;
  const fromSession =
    args.openSession?.inspectionId?.trim() ||
    args.openSession?.openInspection?.inspectionId?.trim();
  if (fromSession) return fromSession;
  if (args.focusInspectionId && !args.isViewingSessionSource) {
    return args.focusInspectionId;
  }
  return null;
}

/** Session + pool-persisted emails not covered by leasing synthesis alone. */
export function openInspectionSupplementalEmails(args: {
  openSession?: OpenInspectionSession | null;
  poolInspectionRecord?: InspectionRecord | null;
  primaryEmails?: JobCaseEmailRecord[];
}): JobCaseEmailRecord[] {
  const primary = args.primaryEmails ?? [];
  const sessionEmails = filterRedundantOpenSessionEmails(
    primary,
    args.openSession ? openInspectionSessionEmails(args.openSession) : [],
  );
  const poolEmails = filterRedundantOpenInspectionPoolEmails(
    primary,
    enrichFieldInspectionCaseEmails(args.poolInspectionRecord),
  );
  return mergeJobCaseEmailSources(sessionEmails, poolEmails);
}

/** Leasing step history plus open session / pool inspection persisted mail. */
export function leasingStageEmailsWithOpenSupplement(args: {
  detail: LeasingPropertyDetail;
  step: LeasingLifecycleStep;
  openSession?: OpenInspectionSession | null;
  poolInspectionRecord?: InspectionRecord | null;
}): JobCaseEmailRecord[] {
  const leasingEmails = leasingEmailRecordsForStep(args.detail, args.step);
  return mergeJobCaseEmailSources(
    leasingEmails,
    openInspectionSupplementalEmails({
      openSession: args.openSession,
      poolInspectionRecord: args.poolInspectionRecord,
      primaryEmails: leasingEmails,
    }),
  );
}

/** Email history shared by linked open-inspection + new-leasing job cases. */
export function linkedOpenLeasingEmails(args: {
  openSession?: OpenInspectionSession | null;
  leasingDetail?: LeasingPropertyDetail | null;
  /** Pool inspection row — holds persisted workflow emails (e.g. inspector accepted). */
  poolInspectionRecord?: InspectionRecord | null;
}): JobCaseEmailRecord[] {
  const leasingEmails = args.leasingDetail ? openInspectionJobCaseEmails(args.leasingDetail) : [];
  return mergeJobCaseEmailSources(
    leasingEmails,
    openInspectionSupplementalEmails({
      openSession: args.openSession,
      poolInspectionRecord: args.poolInspectionRecord,
      primaryEmails: leasingEmails,
    }),
  );
}
