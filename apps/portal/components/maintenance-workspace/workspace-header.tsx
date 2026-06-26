'use client';

import Link from 'next/link';
import { AlertTriangle, Bell, ChevronLeft, Clock, Flag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn, formatDateTime } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/maintenance-workspace/status-labels';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import { isCaseOverdue, getMinutesRemainingForCase } from '@/lib/maintenance-workspace/sla';

function SlaCountdown({ request }: { request: MaintenanceWorkspaceCase }) {
  const mins = getMinutesRemainingForCase(request);
  const overdue = isCaseOverdue(request);

  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
        <AlertTriangle className="size-3" />
        {Math.abs(mins)}m overdue
      </span>
    );
  }

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs tabular-nums">
      <Clock className="size-3" />
      {mins}m left
    </span>
  );
}

export function WorkspaceHeader({
  workspaceCase,
  caseFlagged,
  backHref,
  backLabel,
  onOpenChat,
  onToggleFlag,
}: {
  workspaceCase: MaintenanceWorkspaceCase;
  caseFlagged: boolean;
  backHref: string;
  backLabel: string;
  onOpenChat: () => void;
  onToggleFlag: () => void;
}) {
  const statusLabel = STATUS_LABELS[workspaceCase.status] ?? workspaceCase.status;
  const unreadCount = workspaceCase.notifications.filter((n) => !n.read).length;

  return (
    <header className="border-border shrink-0 border-b bg-gradient-to-br from-muted/70 via-background to-background px-4 py-5 text-left sm:px-6 sm:py-6">
      <div className="mb-3">
        <Link
          href={backHref}
          className="text-primary inline-flex items-center gap-0.5 text-sm font-medium"
        >
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-4 sm:items-center">
        <div className="min-w-0 flex-1 space-y-2 pr-2">
          <p className="text-primary text-[10px] font-semibold uppercase tracking-[0.2em]">
            Maintenance workspace
          </p>
          <h1 className="text-foreground text-xl font-semibold tracking-tight md:text-2xl">
            {workspaceCase.issueType}
          </h1>
          <p className="text-muted-foreground text-left text-sm leading-relaxed">{workspaceCase.address}</p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[11px]">
            <span>
              Case ref{' '}
              <kbd className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 tabular-nums tracking-tight">
                {workspaceCase.id}
              </kbd>
            </span>
            <span className="bg-border hidden h-4 w-px sm:inline-block" aria-hidden />
            <span className="tabular-nums">Opened {formatDateTime(workspaceCase.createdAt)}</span>
            <span className="bg-border hidden h-4 w-px sm:inline-block" aria-hidden />
            <span>Case = workflow · Chat = comms transcript</span>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-start justify-start gap-2 sm:w-auto sm:items-center sm:justify-end">
          <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
            <SlaCountdown request={workspaceCase} />
          </div>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={onOpenChat}
              className="border-amber-500/35 bg-amber-500/10 text-amber-600 inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-amber-500/15 dark:text-amber-400"
            >
              <Bell className="size-4" />
              {unreadCount} unread
            </button>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={caseFlagged}
            onClick={onToggleFlag}
            className={cn(
              'h-8 shrink-0 gap-1.5 rounded-full px-3 text-[11px] shadow-sm',
              caseFlagged &&
                'border-amber-400/55 bg-amber-500/[0.12] text-amber-950 hover:bg-amber-500/[0.16] dark:text-amber-50',
            )}
          >
            <Flag className={cn('size-3.5 shrink-0', caseFlagged && 'fill-current')} />
            {caseFlagged ? 'Flagged' : 'Flag case'}
          </Button>

          <span className="border-border shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
            {statusLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
