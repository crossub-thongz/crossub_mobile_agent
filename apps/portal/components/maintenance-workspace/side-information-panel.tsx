'use client';

import type { ReactNode } from 'react';

import { PriorityBadge, ResponsibilityBadge } from './badges';

type PeopleProps = {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  agentName: string;
  agentEmail?: string;
  agentContact?: string;
};

type MetaProps = {
  priority: string | null;
  responsibility: string | null;
  sourceLabel: string;
  statusBoxClassName: string;
  statusBoxContent: ReactNode;
};

type Props = PeopleProps & MetaProps;

export function WorkspacePeoplePanel({
  tenantName,
  tenantEmail,
  tenantPhone,
  agentName,
  agentEmail,
  agentContact,
}: PeopleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="min-w-0 rounded-lg border border-border bg-background p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Tenant Information
        </p>
        <p className="mt-1.5 text-sm font-semibold text-foreground">{tenantName || '—'}</p>
        <div className="mt-1 space-y-0.5">
          {tenantEmail ? (
            <p className="text-[11px] break-words text-muted-foreground">{tenantEmail}</p>
          ) : null}
          {tenantPhone ? (
            <p className="text-[11px] break-words text-muted-foreground">{tenantPhone}</p>
          ) : null}
          {!tenantEmail && !tenantPhone ? (
            <p className="text-[11px] text-muted-foreground">—</p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-background p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Agent Information
        </p>
        <p className="mt-1.5 text-sm font-semibold text-foreground">{agentName || '—'}</p>
        <div className="mt-1 space-y-0.5">
          {agentEmail ? (
            <p className="text-[11px] break-words text-muted-foreground">{agentEmail}</p>
          ) : null}
          {agentContact ? (
            <p className="text-[11px] break-words text-muted-foreground">{agentContact}</p>
          ) : null}
          {!agentEmail && !agentContact ? (
            <p className="text-[11px] text-muted-foreground">—</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function WorkspaceMetaPanel({
  priority,
  responsibility,
  sourceLabel,
  statusBoxClassName,
  statusBoxContent,
}: MetaProps) {
  return (
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
  );
}

export function WorkspaceSideInformationPanel(props: Props) {
  return (
    <div className="space-y-3">
      <WorkspacePeoplePanel
        tenantName={props.tenantName}
        tenantEmail={props.tenantEmail}
        tenantPhone={props.tenantPhone}
        agentName={props.agentName}
        agentEmail={props.agentEmail}
        agentContact={props.agentContact}
      />
      <WorkspaceMetaPanel
        priority={props.priority}
        responsibility={props.responsibility}
        sourceLabel={props.sourceLabel}
        statusBoxClassName={props.statusBoxClassName}
        statusBoxContent={props.statusBoxContent}
      />
    </div>
  );
}
