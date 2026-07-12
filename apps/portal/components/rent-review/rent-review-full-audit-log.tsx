'use client';

import { ChevronRight } from 'lucide-react';

import { formatRentReviewAuditDetail } from '@/lib/rent-review/audit-detail-display';
import {
  RENT_REVIEW_AGENT_STEP_LABEL,
  resolveRentReviewStepForAuditKind,
  type RentReviewAgentStep,
} from '@/lib/rent-review/agent-workflow-model';
import { fullWorkflowAuditEntries } from '@/lib/rent-review/tenant-decision-display';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { cn, formatDateTime } from '@/lib/utils';

export function RentReviewFullAuditLog({
  detail,
  onNavigateToStep,
}: {
  detail: RentReviewWorkflowDetail;
  onNavigateToStep?: (step: RentReviewAgentStep) => void;
}) {
  const entries = fullWorkflowAuditEntries(detail);
  if (entries.length === 0) return null;

  return (
    <section className="rounded-xl border bg-muted/20 p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide">
        Full workflow audit ({entries.length} events)
      </p>
      {onNavigateToStep ? (
        <p className="text-muted-foreground mb-3 text-[11px]">
          Tap an event to open the step where it was recorded.
        </p>
      ) : null}
      <ul className="space-y-1">
        {entries.map((e) => {
          const step = resolveRentReviewStepForAuditKind(e.kind);
          const stepLabel = RENT_REVIEW_AGENT_STEP_LABEL[step];
          const clickable = onNavigateToStep != null;
          const detail = formatRentReviewAuditDetail(e);

          const body = (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-muted-foreground tabular-nums">{formatDateTime(e.at)}</span>
                <span className="text-muted-foreground capitalize">· {e.actor}</span>
                <span className="bg-background rounded border px-1.5 py-0.5 text-[10px] font-medium">
                  {stepLabel}
                </span>
              </div>
              <p className="mt-1 font-medium">{e.message}</p>
              {detail ? <p className="text-muted-foreground mt-0.5 line-clamp-2">{detail}</p> : null}
            </>
          );

          if (!clickable) {
            return (
              <li
                key={e.id}
                className="border-b border-border/50 px-1 py-2 text-xs last:border-0"
              >
                {body}
              </li>
            );
          }

          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onNavigateToStep(step)}
                className={cn(
                  'hover:bg-muted/40 flex w-full items-start justify-between gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-xs transition-colors',
                  'hover:border-border/60',
                )}
              >
                <span className="min-w-0 flex-1">{body}</span>
                <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
