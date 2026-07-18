import type { OpenInspectionSession } from '@/constants/open-inspection-ops';

/** Stable key for open-viewing poll updates — avoids re-rendering when nothing material changed. */
export function openInspectionSessionSyncKey(session: OpenInspectionSession): string {
  return JSON.stringify({
    id: session.id,
    leasingCycleId: session.leasingCycleId,
    startTime: session.startTime,
    endTime: session.endTime,
    sessionStatus: session.sessionStatus,
    openReportGenerated: session.openReportGenerated,
    reviewCompletedAt: session.reviewCompletedAt,
    landlordReportEmailedAt: session.landlordReportEmailedAt,
    timelineCount: session.timeline?.length ?? 0,
    timelineHead: session.timeline?.[0]?.id,
    visitors: session.visitors.map((visitor) => ({
      id: visitor.id,
      attendanceStatus: visitor.attendanceStatus,
      applyLinkSentAt: visitor.applyLinkSentAt,
      application: visitor.application
        ? {
            agentDecision: visitor.application.agentDecision,
            resultsSentAt: visitor.application.resultsSentAt,
            feedback: visitor.application.feedback,
            rejectReason: visitor.application.rejectReason,
          }
        : null,
    })),
  });
}

export function mergeOpenInspectionSessionPoll(
  previous: OpenInspectionSession | null,
  next: OpenInspectionSession,
): OpenInspectionSession {
  if (previous && openInspectionSessionSyncKey(previous) === openInspectionSessionSyncKey(next)) {
    return previous;
  }
  return next;
}
