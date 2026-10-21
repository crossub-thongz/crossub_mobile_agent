import { MAINTENANCE_ISSUE_URGENCY } from '@/constants/self-managed-maintenance';
import type { AgentMaintenanceIssue } from '@/lib/crossub-api/maintenance-client';

export interface AskableIssueQuestions {
  issue: AgentMaintenanceIssue;
  questions: AgentMaintenanceIssue['questions'];
}

/**
 * The suggested questions the server will still email, by fault: on a fault never asked, not
 * confirmed urgent (that one must not wait on the tenant), and not answered yet. Mirrors
 * `sendIssueQuestionsForRequest`, so a ticked question is one the email can carry.
 */
export function askableIssueQuestions(
  issues: readonly AgentMaintenanceIssue[],
): AskableIssueQuestions[] {
  return issues
    .filter(
      (issue) =>
        !issue.questionsSentAt && issue.urgency !== MAINTENANCE_ISSUE_URGENCY.URGENT_CONFIRMED,
    )
    .map((issue) => ({ issue, questions: issue.questions.filter((q) => !q.answer?.trim()) }))
    .filter((entry) => entry.questions.length > 0);
}
