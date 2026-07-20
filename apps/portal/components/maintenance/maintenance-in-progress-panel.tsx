'use client';

import { MaintenanceCompletionGatesPanel } from '@/components/maintenance/maintenance-completion-gates-panel';
import { MaintenanceStrataContactsPanel } from '@/components/maintenance/maintenance-strata-contacts-panel';
import { MaintenanceTenantAcknowledgementPanel } from '@/components/maintenance/maintenance-tenant-acknowledgement-panel';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import {
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { resolveMaintenanceStrataContacts } from '@/lib/maintenance/resolve-strata-contacts';
import type { Property } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export function MaintenanceInProgressPanel({
  ctx,
  property,
  attachments = [],
  onCaseUpdated,
  apiConnected = true,
}: {
  ctx: MaintenanceWorkflowContext;
  property?: Property;
  attachments?: ApiMaintenanceAttachment[];
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
}) {
  const landlordFlow = requiresContractorFlow(ctx);
  const showCompletionGates = ['in_progress', 'completed', 'closed'].includes(
    ctx.workspaceCase.status,
  );

  if (ctx.workspaceCase.responsibility === 'tenant') {
    return (
      <MaintenanceTenantAcknowledgementPanel
        ctx={ctx}
        onCaseUpdated={onCaseUpdated}
        apiConnected={apiConnected}
      />
    );
  }

  if (!landlordFlow) {
    const strataContacts = resolveMaintenanceStrataContacts(ctx.workspaceCase, property);
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-muted-foreground mb-3 text-sm">
            Strata is responsible for this repair. CROSSUB will coordinate with the strata body.
          </p>
          <MaintenanceStrataContactsPanel {...strataContacts} />
        </div>

        {showCompletionGates ? (
          <MaintenanceCompletionGatesPanel
            ctx={ctx}
            attachments={attachments}
            apiConnected={apiConnected}
            onUpdated={onCaseUpdated}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status) ? (
        <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Contractor</dt>
            <dd className="font-medium">{ctx.item.contractorName ?? '—'}</dd>
          </div>
          {ctx.item.quoteAmount != null ? (
            <div>
              <dt className="text-muted-foreground">Approved quote</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(ctx.item.quoteAmount)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">On-site status</dt>
            <dd className="font-medium">
              {ctx.workspaceCase.status === 'in_progress' ? 'Repair in progress' : 'Work complete'}
            </dd>
          </div>
        </dl>
      ) : null}

      {showCompletionGates ? (
        <MaintenanceCompletionGatesPanel
          ctx={ctx}
          attachments={attachments}
          apiConnected={apiConnected}
          onUpdated={onCaseUpdated}
        />
      ) : null}
    </div>
  );
}
