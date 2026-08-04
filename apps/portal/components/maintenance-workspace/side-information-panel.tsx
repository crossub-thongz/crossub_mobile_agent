'use client';

import type { ReactNode } from 'react';

import { PriorityBadge, ResponsibilityBadge } from './badges';

type TenantProps = {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
};

type MetaProps = {
  priority: string | null;
  responsibility: string | null;
  sourceLabel: string;
  statusBoxClassName: string;
  statusBoxContent: ReactNode;
};

type Props = TenantProps & MetaProps;

export function WorkspacePeoplePanel({
  tenantName,
  tenantEmail,
  tenantPhone,
}: TenantProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
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
  );
}

function isUrgentPriority(priority: string | null): boolean {
  return (
    priority === 'critical' ||
    priority === 'high' ||
    priority === 'urgent'
  );
}

export function WorkspaceMetaPanel({
  priority,
  responsibility,
  sourceLabel,
  statusBoxClassName,
  statusBoxContent,
}: MetaProps) {
  const urgent = isUrgentPriority(priority);
  return (
    <div className="grid grid-cols-2 gap-2">
      <div
        className={`rounded-lg border bg-background p-2 ${
          urgent ? 'border-destructive/40 bg-destructive/5' : 'border-border'
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Priority
        </p>
        <div className="mt-1.5">
          <PriorityBadge priority={priority ?? 'normal'} />
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
