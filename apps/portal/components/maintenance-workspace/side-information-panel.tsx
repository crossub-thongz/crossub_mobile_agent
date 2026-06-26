'use client';

import type { ReactNode } from 'react';

import { PriorityBadge, ResponsibilityBadge } from './badges';

export function WorkspaceSideInformationPanel({
  tenantName,
  tenantEmail,
  tenantPhone,
  agentName,
  agentEmail,
  agentContact,
  priority,
  responsibility,
  sourceLabel,
  statusBoxClassName,
  statusBoxContent,
}: {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  agentName: string;
  agentEmail?: string;
  agentContact?: string;
  priority: string | null;
  responsibility: string | null;
  sourceLabel: string;
  statusBoxClassName: string;
  statusBoxContent: ReactNode;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tenant Information
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-foreground">{tenantName || '—'}</p>
          <div className="mt-1 space-y-1">
            {tenantEmail ? (
              <p className="text-xs break-words text-muted-foreground">{tenantEmail}</p>
            ) : null}
            {tenantPhone ? (
              <p className="text-xs break-words text-muted-foreground">{tenantPhone}</p>
            ) : null}
            {!tenantEmail && !tenantPhone ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Agent Information
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm font-semibold text-foreground">{agentName || '—'}</p>
            {agentEmail ? (
              <p className="text-xs break-words text-muted-foreground">{agentEmail}</p>
            ) : null}
            {agentContact ? (
              <p className="text-xs break-words text-muted-foreground">{agentContact}</p>
            ) : null}
            {!agentEmail && !agentContact ? (
              <p className="text-xs break-words text-muted-foreground">—</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={`rounded-lg border bg-background p-2 ${
            priority === 'critical' ? 'border-destructive/40 bg-destructive/5' : 'border-border'
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Priority
          </p>
          <div className="mt-1.5">
            <PriorityBadge priority={priority ?? 'low'} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Responsibility
          </p>
          <div className="mt-1.5">
            <ResponsibilityBadge responsibility={responsibility} />
          </div>
        </div>

        <div className={`rounded-lg border bg-background p-2 ${statusBoxClassName}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <div className="mt-1.5">{statusBoxContent}</div>
        </div>

        <div className="rounded-lg border border-border bg-background p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Source
          </p>
          <p className="mt-1.5 text-[11px] font-semibold text-foreground">{sourceLabel}</p>
        </div>
      </div>
    </>
  );
}
