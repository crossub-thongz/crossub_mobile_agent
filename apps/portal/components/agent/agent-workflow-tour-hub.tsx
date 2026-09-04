'use client';

import { PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  AGENT_WORKFLOW_TOUR_LABELS,
  AGENT_WORKFLOW_TOUR_ORDER,
  workflowTourEntryHref,
  type AgentWorkflowTourId,
} from '@/constants/agent-workflow-tour';
import { setPendingWorkflowTour } from '@/lib/agent-workflow-tour';
import { cn } from '@/lib/utils';

export function AgentWorkflowTourHub({ className }: { className?: string }) {
  const router = useRouter();

  const startTour = (id: AgentWorkflowTourId) => {
    setPendingWorkflowTour(id);
    router.push(workflowTourEntryHref(id));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm font-medium">Workflow demo tours</p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Interactive walkthroughs on live Tasks and job pages. Each tour shows every workflow stage and
        highlights where you take action — Need my action on Tasks, the case badge, and the Workflow panel.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {AGENT_WORKFLOW_TOUR_ORDER.map((id) => {
          const meta = AGENT_WORKFLOW_TOUR_LABELS[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => startTour(id)}
                className="hover:border-primary/35 hover:bg-primary/5 flex h-full w-full flex-col rounded-2xl border bg-card p-4 text-left transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <PlayCircle className="text-primary size-4 shrink-0" aria-hidden />
                  {meta.title}
                </span>
                <span className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                  {meta.description}
                </span>
                <span className="text-primary mt-3 text-xs font-semibold">Start demo tour</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Open any case from the list when prompted — the tour continues on the job detail page with
        the workflow rail and tabs.
      </p>
    </div>
  );
}
