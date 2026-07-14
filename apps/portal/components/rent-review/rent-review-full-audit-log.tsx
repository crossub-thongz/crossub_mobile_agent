'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
  defaultExpanded = false,
}: {
  detail: RentReviewWorkflowDetail;
  onNavigateToStep?: (step: RentReviewAgentStep) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const entries = fullWorkflowAuditEntries(detail);
  if (entries.length === 0) return null;

  return (
    <section className="rounded-xl border bg-muted/20 p-4">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <p className="text-sm font-semibold">Full workflow audit</p>
          <p className="text-muted-foreground text-xs">
            {entries.length} event{entries.length === 1 ? '' : 's'} ·{' '}
            {expanded ? 'Click to collapse' : 'Click to expand'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground size-5 shrink-0 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <>
          {onNavigateToStep ? (
            <p className="text-muted-foreground mt-3 text-[11px]">
              Tap an event to open the step where it was recorded.
            </p>
          ) : null}
          <ul className="mt-3 space-y-1">
            {entries.map((e) => {
              const step = resolveRentReviewStepForAuditKind(e.kind);
              const stepLabel = RENT_REVIEW_AGENT_STEP_LABEL[step];
              const clickable = onNavigateToStep != null;
              const auditDetail = formatRentReviewAuditDetail(e);

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
                  {auditDetail ? (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2">{auditDetail}</p>
                  ) : null}
                </>
              );

              if (!clickable) {
                return (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border/60 bg-background px-3 py-2.5 text-xs"
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
                      'hover:bg-muted/40 flex w-full items-start justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-left text-xs transition-colors',
                      'hover:border-border',
                    )}
                  >
                    <span className="min-w-0 flex-1">{body}</span>
                    <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
