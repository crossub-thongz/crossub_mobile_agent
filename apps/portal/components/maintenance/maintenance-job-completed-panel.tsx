'use client';

import { MaintenanceCompletedCaseArchive } from '@/components/maintenance/maintenance-completed-case-archive';
import { MaintenanceCompletionGatesPanel } from '@/components/maintenance/maintenance-completion-gates-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import {
  getMaintenanceQuotationsForCase,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';

export function MaintenanceJobCompletedPanel({
  ctx,
  attachments = [],
  contractors = [],
  onCaseUpdated,
}: {
  ctx: MaintenanceWorkflowContext;
  attachments?: ApiMaintenanceAttachment[];
  contractors?: Array<{ id: string; name: string }>;
  onCaseUpdated?: () => Promise<void>;
}) {
  const { apiConnected } = useAgentData();

  const quotations = getMaintenanceQuotationsForCase(ctx.workspaceCase);
  const status = ctx.workspaceCase.status;
  const showArchive = status === 'completed' || status === 'closed';

  return (
    <div className="space-y-4">
      {showArchive ? (
        <MaintenanceCompletedCaseArchive
          requestId={ctx.item.id}
          quotations={quotations}
          contractors={contractors}
          invitedContractors={ctx.item.invitedContractors}
          assignedContractorId={ctx.workspaceCase.assignedContractorId}
          assignedContractorName={ctx.item.contractorName}
          quotationReviews={ctx.workspaceCase.quotationReviews}
        />
      ) : null}

      <MaintenanceCompletionGatesPanel
        ctx={ctx}
        attachments={attachments}
        apiConnected={apiConnected}
        onUpdated={onCaseUpdated}
      />
    </div>
  );
}
