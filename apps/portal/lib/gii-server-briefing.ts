import {
  BRIEFING_TASK_NOUN,
  SERVER_BRIEFING_CHANGES_NAMED,
  SERVER_BRIEFING_UNAVAILABLE_LABEL,
} from '@/constants/gii-briefing';
import type { GiiServerBriefing } from '@/lib/crossub-api/gii-client';
import { greetingLead } from '@/lib/gii-briefing';
import {
  filterTaskListV2Rows,
  sortTasksByDueDate,
  taskDueMeta,
  taskReference,
  taskSubtypeLabel,
  type TaskListV2Row,
} from '@/lib/task-list-v2';

/**
 * The Tasks page's "Needs My Action" rows the server briefing does not already list, soonest due
 * first. The server covers repairs, money, messages and leases; leasing approvals, vacate notices
 * and a job's next step live only in the app's task list, so Cros adds them here.
 */
export function briefingExtraTasks(briefing: GiiServerBriefing, rows: TaskListV2Row[]): TaskListV2Row[] {
  const listed = new Set(briefing.items.flatMap((item) => (item.link ? [item.link.id] : [])));
  const needAction = filterTaskListV2Rows(rows, 'need_action', 'all', '');
  return sortTasksByDueDate(needAction.filter((row) => !listed.has(row.task.jobRow?.id ?? row.id)));
}

/** "EL-4047994 · Agent approval · Overdue 3 days · 1008/19 Halifax Street", as the Tasks page reads. */
export function briefingTaskDetail(row: TaskListV2Row, now: Date): string {
  return [taskReference(row), taskSubtypeLabel(row), taskDueMeta(row, now).primary, row.propertyAddress]
    .filter(Boolean)
    .join(' · ');
}

/** "1 quote waiting · 3 other tasks", or null when there is nothing. */
export function briefingSummaryWithTasks(summary: string | null, taskCount: number): string | null {
  if (taskCount === 0) return summary;
  const noun = summary
    ? taskCount === 1
      ? BRIEFING_TASK_NOUN.OTHER_ONE
      : BRIEFING_TASK_NOUN.OTHER_MANY
    : taskCount === 1
      ? BRIEFING_TASK_NOUN.ONE
      : BRIEFING_TASK_NOUN.MANY;
  const tasks = `${taskCount} ${noun}`;
  return summary ? `${summary} · ${tasks}` : tasks;
}

/**
 * Cros's opening message from the server briefing (Jarvis 2.2) plus the app's own tasks needing
 * the agent. Every number is counted, none written by the model. Pure, with `now` passed in, like
 * `buildGiiBriefing`.
 */
export function serverBriefingGreeting(
  briefing: GiiServerBriefing,
  now: Date,
  agentName?: string | null,
  taskCount = 0,
): string {
  const lead = `${greetingLead(now, agentName)} 👋`;
  const parts: string[] = [];
  const total = briefing.total + taskCount;
  if (total === 0) {
    parts.push(`${lead} Nothing needs you right now.`);
  } else {
    const verb = total === 1 ? 'thing needs' : 'things need';
    // Only tasks: "4 things need you today: 4 tasks" says nothing, so the count stands alone.
    const summary = briefing.summary ? briefingSummaryWithTasks(briefing.summary, taskCount) : null;
    parts.push(`${lead} ${total} ${verb} you today${summary ? `: ${summary}` : ''}.`);
  }
  const { count, latest } = briefing.changes;
  if (count > 0) {
    const named = latest.slice(0, SERVER_BRIEFING_CHANGES_NAMED).join('; ');
    const more = count > SERVER_BRIEFING_CHANGES_NAMED ? `, and ${count - SERVER_BRIEFING_CHANGES_NAMED} more` : '';
    parts.push(`Since your last briefing: ${named}${more}.`);
  }
  if (briefing.unavailable.length > 0) {
    const missing = briefing.unavailable.map((u) => SERVER_BRIEFING_UNAVAILABLE_LABEL[u] ?? u).join(', ');
    parts.push(`I could not check ${missing} just now, so this list may be missing some.`);
  }
  return parts.join('\n\n');
}
