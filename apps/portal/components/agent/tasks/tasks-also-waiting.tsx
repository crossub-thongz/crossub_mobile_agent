'use client';

import { CrosAssistantLogo } from '@/components/brand/cros-assistant-logo';
import { useCrosToday } from '@/components/providers/cros-today-provider';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { SERVER_BRIEFING_ICON, SERVER_BRIEFING_URGENT } from '@/constants/gii-briefing';
import { TASKS_ALSO_WAITING_COPY } from '@/constants/cros-panel';
import { briefingItemQuestion } from '@/lib/gii-server-briefing';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { cn } from '@/lib/utils';

/**
 * What needs the agent that is not a task (money owed, unanswered messages, leases ending), so
 * the Tasks badge, which counts everything waiting, adds up on this page too. Ask hands the row to
 * Cros. Renders nothing when every waiting item is a task.
 */
export function TasksAlsoWaiting() {
  const { notOnTasks } = useCrosToday();
  const openGii = useShellDockStore((s) => s.openGii);
  if (notOnTasks.length === 0) return null;

  return (
    <section className="v2-dashboard__card p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <CrosAssistantLogo size="xs" />
        <h2 className="text-sm font-semibold">{TASKS_ALSO_WAITING_COPY.TITLE}</h2>
        <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
          {notOnTasks.length}
        </span>
      </div>
      <p className="text-muted-foreground mt-0.5 text-xs">{TASKS_ALSO_WAITING_COPY.SUBTITLE}</p>
      <ul className="mt-2 divide-y">
        {notOnTasks.map((item, index) => {
          const Icon = SERVER_BRIEFING_ICON[item.category];
          return (
            <li key={`${item.category}-${item.link?.id ?? index}`} className="flex items-center gap-2.5 py-2">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg',
                  SERVER_BRIEFING_URGENT.includes(item.category)
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary',
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {[item.detail, item.propertyAddress].filter(Boolean).join(' · ')}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  openGii({
                    propertyId: item.propertyId ?? undefined,
                    propertyAddress: item.propertyAddress ?? undefined,
                    initialPrompt: briefingItemQuestion(item),
                  })
                }
                className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold"
              >
                Ask {CROS_ASSISTANT_NAME}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
