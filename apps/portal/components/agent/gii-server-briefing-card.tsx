'use client';

import Link from 'next/link';
import { ListTodo, type LucideIcon } from 'lucide-react';

import { CrosAssistantLogo } from '@/components/brand/cros-assistant-logo';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import {
  BRIEFING_MAX_ROWS,
  BRIEFING_URGENT_PRIORITY,
  SERVER_BRIEFING_ICON,
  SERVER_BRIEFING_URGENT,
  TASK_BRIEFING_ICON,
} from '@/constants/gii-briefing';
import { ROUTES } from '@/constants/routes';
import type { GiiJobCaseLink, GiiServerBriefing, GiiServerBriefingItem } from '@/lib/crossub-api/gii-client';
import { briefingSummaryWithTasks, briefingTaskDetail } from '@/lib/gii-server-briefing';
import type { TaskListV2Row } from '@/lib/task-list-v2';
import { cn } from '@/lib/utils';

const ASK_BUTTON =
  'inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2.5 text-[12px] font-medium text-primary transition hover:bg-primary/15';
const OPEN_BUTTON =
  'inline-flex h-7 items-center rounded-md border px-2.5 text-[12px] font-medium text-foreground/80 transition hover:bg-muted/40';

function BriefingRow({
  icon: Icon,
  urgent,
  title,
  detail,
  onAsk,
  onOpen,
}: {
  icon: LucideIcon;
  urgent: boolean;
  title: string;
  detail: string;
  onAsk: () => void;
  onOpen: (() => void) | null;
}) {
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg',
            urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">{title}</span>
          <span className="text-muted-foreground block truncate text-[11px]">{detail}</span>
        </span>
      </div>
      <div className="mt-2 flex gap-2 pl-[38px]">
        <button type="button" onClick={onAsk} className={ASK_BUTTON}>
          <CrosAssistantLogo size="xs" className="size-3" />
          Ask {CROS_ASSISTANT_NAME}
        </button>
        {onOpen ? (
          <button type="button" onClick={onOpen} className={OPEN_BUTTON}>
            Open
          </button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The list Cros opens with, from the server briefing (Jarvis 2.2): most urgent first, as the
 * server ordered it, then the Tasks page's "Needs My Action" rows the server does not list. Open
 * goes through the same record-link handler as the Open buttons under a Cros reply. Renders nothing
 * when there is nothing to do; the greeting carries that.
 */
export function GiiServerBriefingCard({
  briefing,
  tasks,
  title,
  onNavigate,
  onAsk,
  onOpen,
  onAskTask,
  onOpenTask,
}: {
  briefing: GiiServerBriefing;
  tasks: TaskListV2Row[];
  title: string;
  onNavigate?: () => void;
  onAsk: (item: GiiServerBriefingItem) => void;
  onOpen: (link: GiiJobCaseLink) => void;
  onAskTask: (row: TaskListV2Row) => void;
  onOpenTask: (row: TaskListV2Row) => void;
}) {
  const total = briefing.total + tasks.length;
  if (total === 0) return null;
  const items = briefing.items.slice(0, BRIEFING_MAX_ROWS);
  const taskRows = tasks.slice(0, BRIEFING_MAX_ROWS - items.length);
  const summary = briefingSummaryWithTasks(briefing.summary, tasks.length);
  const now = new Date();

  return (
    <div className="mr-auto w-[92%] overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold">
          <ListTodo className="size-3.5 shrink-0 text-primary" />
          {title}
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
          {total}
        </span>
      </div>

      {summary ? <p className="text-muted-foreground border-b px-3 py-1.5 text-[11px]">{summary}</p> : null}

      <ul className="divide-y">
        {items.map((item, index) => {
          const link = item.link;
          return (
            <BriefingRow
              key={`${item.category}-${link?.id ?? index}`}
              icon={SERVER_BRIEFING_ICON[item.category]}
              urgent={SERVER_BRIEFING_URGENT.includes(item.category)}
              title={item.title}
              detail={[item.detail, item.propertyAddress].filter(Boolean).join(' · ')}
              onAsk={() => onAsk(item)}
              onOpen={
                link ? () => onOpen({ kind: link.kind, id: link.id, reference: null, label: item.title }) : null
              }
            />
          );
        })}
        {taskRows.map((row) => (
          <BriefingRow
            key={`task-${row.id}`}
            icon={TASK_BRIEFING_ICON[row.category]}
            urgent={row.task.needAction?.priority === BRIEFING_URGENT_PRIORITY}
            title={row.task.title}
            detail={briefingTaskDetail(row, now)}
            onAsk={() => onAskTask(row)}
            onOpen={() => onOpenTask(row)}
          />
        ))}
      </ul>

      {total > items.length + taskRows.length ? (
        <Link
          href={ROUTES.TASKS}
          onClick={() => onNavigate?.()}
          className="text-muted-foreground hover:text-foreground flex items-center justify-center border-t px-3 py-2 text-[12px] font-medium transition"
        >
          View all {total} &rarr;
        </Link>
      ) : null}
    </div>
  );
}
