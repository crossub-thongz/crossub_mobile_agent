'use client';

import { History } from 'lucide-react';
import { useState } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatInspectorReassignmentLabel } from '@/lib/inspector-reassignment-label';
import { cn, formatDateTime } from '@/lib/utils';

export type InspectorHistoryAuditEntry = {
  id: string;
  label: string;
  actor: string;
  at: string;
};

function isAssignmentAudit(label: string): boolean {
  return /staff-(assigned|reassigned|unassigned)|→|reassigned|cancelled|assigned to|pending inspector/i.test(
    label,
  );
}

function buildHistoryLines(args: {
  currentName: string | null;
  previousName: string | null;
  auditEntries?: InspectorHistoryAuditEntry[];
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  const push = (line: string | null | undefined) => {
    const text = line?.trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(text);
  };

  const trail = formatInspectorReassignmentLabel(
    args.currentName,
    args.previousName,
  );
  push(trail);

  const audits = [...(args.auditEntries ?? [])]
    .filter((row) => isAssignmentAudit(row.label))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  for (const row of audits) {
    const when = row.at ? formatDateTime(row.at) : '';
    push(when ? `${row.label} · ${when}` : row.label);
  }

  if (args.previousName?.trim() && !trail?.includes(args.previousName.trim())) {
    push(`Previous: ${args.previousName.trim()}`);
  }

  return lines;
}

/**
 * Inspector name with hover/focus history (cancel → reassign trail + case audit).
 */
export function InspectorNameWithHistory({
  currentName,
  previousName,
  auditEntries,
  className,
}: {
  currentName: string | null | undefined;
  previousName?: string | null;
  auditEntries?: InspectorHistoryAuditEntry[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = currentName?.trim() || null;
  const previous = previousName?.trim() || null;
  const display =
    formatInspectorReassignmentLabel(current, previous) ??
    current ??
    'Unassigned';
  const history = buildHistoryLines({
    currentName: current,
    previousName: previous,
    auditEntries,
  });
  const hasHistory =
    Boolean(previous) ||
    history.length > 1 ||
    (auditEntries?.some((row) => isAssignmentAudit(row.label)) ?? false);

  if (!hasHistory) {
    return <span className={cn('text-sm font-medium', className)}>{display}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group inline-flex max-w-full items-start gap-1.5 text-left text-sm font-medium',
            'decoration-primary/40 hover:underline underline-offset-2',
            className,
          )}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <span className="min-w-0 break-words">{display}</span>
          <History className="text-muted-foreground group-hover:text-primary mt-0.5 size-3.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-3"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Inspector history
        </p>
        <ul className="mt-2 space-y-2">
          {history.map((line) => (
            <li
              key={line}
              className="text-foreground border-border/70 border-l-2 pl-2 text-xs leading-relaxed"
            >
              {line}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
