'use client';

import {
  filterAuditForTarget,
  previewSummaryForTarget,
  previewTitleForTarget,
  type QuickJumpTarget,
} from '@/lib/maintenance-workspace/quick-jump';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function WorkflowStepPreview({
  target,
  workspaceCase,
  aiAdvice,
}: {
  target: QuickJumpTarget;
  workspaceCase: MaintenanceWorkspaceCase;
  aiAdvice: string;
}) {
  const entries = filterAuditForTarget(workspaceCase.auditEntries, target).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const why =
    target === 'review' && aiAdvice.trim()
      ? aiAdvice
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 4)
          .join(' ')
      : previewSummaryForTarget(target, workspaceCase);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card space-y-2 p-3">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
          {previewTitleForTarget(target, workspaceCase)} summary
        </p>
        <p className="text-muted-foreground text-xs">
          <span className="text-foreground font-semibold">Summary:</span>{' '}
          {previewSummaryForTarget(target, workspaceCase)}
        </p>
        {target === 'review' && (
          <p className="text-muted-foreground text-xs">
            <span className="text-foreground font-semibold">Why:</span> {why}
          </p>
        )}
        <p className="text-muted-foreground text-[11px]">
          Email and message content is in <span className="text-foreground font-semibold">Chat</span>;
          workflow events for this stage are listed below and in the{' '}
          <span className="text-foreground font-semibold">Timeline</span>.
        </p>
      </div>

      {target === 'approval' && workspaceCase.quotations.length > 0 && (
        <div className="rounded-lg border border-border bg-background p-3 text-xs">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Quotation snapshot
          </p>
          {workspaceCase.quotations.map((q) => (
            <div key={q.id} className="mt-2 border-t border-border pt-2 first:mt-0 first:border-0 first:pt-0">
              <p className="font-medium">
                {formatCurrency(q.price)} AUD · {q.status}
              </p>
              <p className="text-muted-foreground mt-1">{q.scope}</p>
              <p className="text-muted-foreground mt-1">{formatDateTime(q.submittedAt)}</p>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 ? (
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Stage events
          </p>
          <ol className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="text-xs">
                <p className="font-medium">{entry.message}</p>
                <p className="text-muted-foreground mt-0.5">
                  {formatDateTime(entry.timestamp)} · {entry.actor}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
          No recorded events for this stage yet.
        </p>
      )}
    </div>
  );
}
