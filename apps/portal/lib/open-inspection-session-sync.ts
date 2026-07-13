import type { OpenInspectionSession } from '@/constants/open-inspection-ops';

/** Stable key for open-viewing poll updates — avoids re-rendering when nothing material changed. */
export function openInspectionSessionSyncKey(session: OpenInspectionSession): string {
  return JSON.stringify({
    id: session.id,
    startTime: session.startTime,
    endTime: session.endTime,
    sessionStatus: session.sessionStatus,
    openReportGenerated: session.openReportGenerated,
    reviewCompletedAt: session.reviewCompletedAt,
    visitors: session.visitors.map((visitor) => ({
      id: visitor.id,
      attendanceStatus: visitor.attendanceStatus,
      application: visitor.application
        ? {
            agentDecision: visitor.application.agentDecision,
            feedbackSentAt: visitor.application.feedbackSentAt,
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
