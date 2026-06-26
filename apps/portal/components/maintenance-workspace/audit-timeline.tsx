'use client';

import { History } from 'lucide-react';

import type { ApiMaintenanceAuditLogEntry } from '@/lib/crossub-api/types';
import { formatDateTime } from '@/lib/utils';

import { SectionShell } from './section-shell';

const EVENT_LABEL: Record<string, string> = {
  status_transition: 'Status changed',
  contractor_created: 'Contractor created',
  contractor_assigned: 'Contractor assigned',
  quotation_created: 'Quotation requested',
  responsibility_set: 'Review set',
  quotation_approved: 'Quotation approved',
  quotation_declined: 'Quotation declined',
  quotation_resubmitted: 'Quotation resubmitted',
  sla_reminder_generated: 'SLA reminder sent',
  transition_rejected: 'Step rejected',
};

export function WorkspaceAuditTimeline({
  entries,
}: {
  entries: ApiMaintenanceAuditLogEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
        <History className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No workflow events yet.</p>
      </div>
    );
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <ol className="space-y-0">
      {sorted.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
          {index < sorted.length - 1 && (
            <span
              aria-hidden
              className="bg-border absolute top-3 left-[7px] h-[calc(100%-4px)] w-px"
            />
          )}
          <span className="bg-card border-muted-foreground/40 relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {EVENT_LABEL[entry.action] ?? entry.action}
            </p>
            <p className="text-sm font-medium">{entry.message}</p>
            <p className="text-muted-foreground text-[11px]">
              {formatDateTime(entry.timestamp)} · {entry.actor}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WorkspaceTimelinePanel({
  entries,
}: {
  entries: ApiMaintenanceAuditLogEntry[];
}) {
  return (
    <SectionShell title="Timeline" defaultOpen>
      <WorkspaceAuditTimeline entries={entries} />
    </SectionShell>
  );
}
