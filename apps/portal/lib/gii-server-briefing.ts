import {
  BRIEFING_TASK_NOUN,
  NEEDS_YOU_GROUPS,
  NEEDS_YOU_GROUP_OF_CATEGORY,
  NEEDS_YOU_GROUP_OF_TASK,
  type NeedsYouGroup,
  CROS_TODAY_QUESTION,
  SERVER_BRIEFING_CHANGES_NAMED,
  SERVER_BRIEFING_UNAVAILABLE_LABEL,
} from '@/constants/gii-briefing';
import type { GiiServerBriefing, GiiServerBriefingItem } from '@/lib/crossub-api/gii-client';
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
  return sortTasksByDueDate(needActionTaskRows(rows).filter((row) => !listed.has(taskRowRecordId(row))));
}

/**
 * The briefing rows the Tasks page's "Needs My Action" does not list: money owed, unanswered
 * messages, leases ending, and jobs Tasks files elsewhere. With them, Tasks adds up to the count.
 */
export function briefingNotOnTasks(briefing: GiiServerBriefing, rows: TaskListV2Row[]): GiiServerBriefingItem[] {
  const onTasks = new Set(needActionTaskRows(rows).map(taskRowRecordId));
  return briefing.items.filter((item) => !item.link || !onTasks.has(item.link.id));
}

/** What Cros is asked when the agent taps Ask on a briefing row. */
export function briefingItemQuestion(item: GiiServerBriefingItem): string {
  const where = item.propertyAddress ? ` at ${item.propertyAddress}` : '';
  return `Give me an update on ${item.title}${where} (${item.detail}).`;
}

/**
 * The one count split by part: the briefing's own counts (which include rows past its list cap)
 * plus the tasks it does not list. Without a briefing, the tasks alone.
 */
export function needsYouByGroup(
  briefing: GiiServerBriefing | null,
  tasks: TaskListV2Row[],
): Record<NeedsYouGroup, number> {
  const out = Object.fromEntries(NEEDS_YOU_GROUPS.map((group) => [group, 0])) as Record<NeedsYouGroup, number>;
  for (const entry of briefing?.counts ?? []) out[NEEDS_YOU_GROUP_OF_CATEGORY[entry.category]] += entry.count;
  for (const row of tasks) out[NEEDS_YOU_GROUP_OF_TASK[row.category]] += 1;
  return out;
}

/** The Tasks page's "Needs My Action" rows. */
export function needActionTaskRows(rows: TaskListV2Row[]): TaskListV2Row[] {
  return filterTaskListV2Rows(rows, 'need_action', 'all', '');
}

/** The record a task row is about, as a briefing row links it. */
function taskRowRecordId(row: TaskListV2Row): string {
  return row.task.jobRow?.id ?? row.id;
}

/**
 * "Agent approval · Overdue 3 days · 1008/19 Halifax Street", as the Tasks page reads, without the
 * reference: an internal number means nothing to the agent on a briefing row.
 */
export function briefingTaskDetail(row: TaskListV2Row, now: Date): string {
  return [taskSubtypeLabel(row), taskDueMeta(row, now).primary, row.propertyAddress].filter(Boolean).join(' · ');
}

/** The row's detail with its reference first, for Cros, which finds the job by it. */
export function briefingTaskDetailForCros(row: TaskListV2Row, now: Date): string {
  return [taskReference(row), briefingTaskDetail(row, now)].filter(Boolean).join(' · ');
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

/**
 * The briefing as Cros reads it when the agent asks what needs them today: every row the card
 * shows, in its order, server rows then the app's tasks. Pure, with `now` passed in.
 */
export function briefingContextForCros(briefing: GiiServerBriefing, tasks: TaskListV2Row[], now: Date): string {
  const rows = [
    ...briefing.items.map((item) => [item.title, item.detail, item.propertyAddress].filter(Boolean).join(' · ')),
    ...tasks.map((row) => `${row.task.title} · ${briefingTaskDetailForCros(row, now)}`),
  ];
  return [CROS_TODAY_QUESTION.CONTEXT_LEAD(rows.length), ...rows.map((row, i) => `${i + 1}. ${row}`)].join('\n');
}
