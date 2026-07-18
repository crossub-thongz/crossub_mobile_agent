'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn, formatDateTime } from '@/lib/utils';

export type MaintenanceStepAuditEntry = {
  id: string;
  message: string;
  actor: string;
  timestamp: string;
};

function humanizeAuditMessage(message: string): string {
  // Strip internal agency-pref / UUID keys from legacy audit copy.
  return message
    .replace(/\s*\(agency-pref-[0-9a-f-]+\)/gi, '')
    .replace(/\bagency-pref-[0-9a-f-]+\b/gi, 'contractor')
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      'contractor',
    );
}

function auditLabel(message: string): string {
  const firstLine =
    humanizeAuditMessage(message).split('\n').find((line) => line.trim())?.trim() ??
    message;
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
}

/** Collapsible stage audit matching the ingoing inspection Audit card. */
export function MaintenanceStepAudit({
  entries,
  title = 'Audit',
  emptyLabel = 'No audit events for this step yet.',
  defaultOpen = false,
}: {
  entries: MaintenanceStepAuditEntry[];
  title?: string;
  emptyLabel?: string;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium">{title}</span>
        <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
          {sorted.length} event{sorted.length === 1 ? '' : 's'}
          <ChevronDown
            className={cn('size-4 transition-transform', expanded && 'rotate-180')}
          />
        </span>
      </button>
      {expanded ? (
        <ul className="divide-y border-t px-4 py-1">
          {sorted.length === 0 ? (
            <li className="text-muted-foreground py-3 text-xs">{emptyLabel}</li>
          ) : (
            sorted.map((entry) => (
              <li key={entry.id} className="py-2.5 text-xs">
                <p className="font-medium">{auditLabel(entry.message)}</p>
                <p className="text-muted-foreground mt-0.5">
                  {entry.actor} · {formatDateTime(entry.timestamp)}
                </p>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
