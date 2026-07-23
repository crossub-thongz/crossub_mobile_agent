'use client';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { resolveContractorDisplayName } from '@/lib/maintenance/resolve-contractor-display';
import { cn, formatDateTime } from '@/lib/utils';

export function MaintenanceSchedulePanel({
  ctx,
  contractors = [],
}: {
  ctx: MaintenanceWorkflowContext;
  contractors?: Array<{ id: string; name: string }>;
}) {
  const proposal = ctx.item.scheduleProposal;
  const tenant = ctx.workspaceCase.tenant;
  const contractorName = proposal?.contractorId
    ? resolveContractorDisplayName(proposal.contractorId, {
        contractors,
        invitedContractors: ctx.workspaceCase.invitedContractors,
        assignedContractorId: ctx.workspaceCase.assignedContractorId,
        assignedContractorName: ctx.item.contractorName,
        auditEntries: ctx.workspaceCase.auditEntries,
        invitedContractorIds: ctx.workspaceCase.invitedContractorIds,
      })
    : (ctx.item.contractorName ?? 'Contractor');

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        The contractor submits available visit times. The tenant approves or declines in the
        tenant app before work starts.
      </p>

      {tenant ? (
        <div className="rounded-xl border bg-muted/30 p-4 text-xs space-y-1">
          <p className="font-semibold text-foreground">Tenant contact (shared with contractor)</p>
          {tenant.name ? <p>Name: {tenant.name}</p> : null}
          {tenant.phone ? <p>Phone: {tenant.phone}</p> : null}
          {tenant.email ? <p>Email: {tenant.email}</p> : null}
        </div>
      ) : null}

      {proposal?.availableTimes?.trim() ? (
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">Contractor availability</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{contractorName}</p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Proposed visit times
            </p>
            <p className="mt-2 whitespace-pre-wrap">{proposal.availableTimes}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              Submitted {formatDateTime(proposal.submittedAt)}
            </p>
          </div>

          <TenantScheduleDecision proposal={proposal} />
        </section>
      ) : (
        <div className="rounded-xl border border-dashed bg-card p-4">
          <p className="text-muted-foreground text-sm">
            No visit availability submitted yet. CROSSUB has emailed the contractor with tenant
            contact details — waiting for their proposed times.
          </p>
          {ctx.item.scheduleStepStartedAt ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Schedule step started {formatDateTime(ctx.item.scheduleStepStartedAt)}
            </p>
          ) : null}
        </div>
      )}

      {ctx.item.scheduleEscalated ? (
        <p className="text-destructive text-xs font-medium">
          Escalated — contractor has not submitted availability after reminders.
        </p>
      ) : null}
    </div>
  );
}

function TenantScheduleDecision({
  proposal,
}: {
  proposal: NonNullable<MaintenanceWorkflowContext['item']['scheduleProposal']>;
}) {
  if (!proposal.tenantDecision) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">Awaiting tenant response</p>
          <p className="mt-0.5 text-xs opacity-90">
            The tenant will approve or decline these times in the tenant app.
          </p>
        </div>
      </div>
    );
  }

  const approved = proposal.tenantDecision === 'approved';

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border p-3 text-sm',
        approved
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-destructive/30 bg-destructive/5 text-destructive',
      )}
    >
      {approved ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="font-medium">
          Tenant {approved ? 'approved' : 'declined'} visit time
          {proposal.tenantDecidedAt
            ? ` · ${formatDateTime(proposal.tenantDecidedAt)}`
            : ''}
        </p>
        {!approved && proposal.tenantDeclineReason ? (
          <p className="mt-1 text-xs">
            <span className="font-medium">Reason:</span> {proposal.tenantDeclineReason}
          </p>
        ) : null}
        {!approved && !proposal.tenantDeclineReason ? (
          <p className="mt-1 text-xs opacity-90">No decline reason provided.</p>
        ) : null}
      </div>
    </div>
  );
}
