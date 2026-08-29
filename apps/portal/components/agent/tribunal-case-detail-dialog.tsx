'use client';

import { useState } from 'react';
import { FileText, Gavel, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { TribunalRentChasingDetail } from '@/components/agent/tribunal-rent-chasing-detail';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { AGENT_CASE_INTERACTIONS_ENABLED } from '@/lib/agent-case-mode';
import { deleteAgentTribunalCase } from '@/lib/crossub-api/agent-workflow-client';
import type { TribunalCase } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { isRentChasingTribunalCase } from '@/lib/tribunal-case-kind';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export function TribunalCaseDetailDialog({
  open,
  onClose,
  caseId,
  tribunalCase,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string | null;
  tribunalCase?: TribunalCase | null;
  onDeleted?: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { refresh: refreshPortfolio } = useAgentData();

  if (!open || !caseId) return null;

  const rentChasing = tribunalCase
    ? isRentChasingTribunalCase(tribunalCase.matter, tribunalCase.tribunalType)
    : true;

  const titleRef =
    tribunalCase?.caseNumber ??
    workflowCaseReferenceLabel(caseId, 'tribunal');

  return (
    <>
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title="Tribunal case"
        subtitle={titleRef}
        size="2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Delete case
            </Button>
          </div>

          {rentChasing || !tribunalCase ? (
            <TribunalRentChasingDetail caseId={caseId} />
          ) : (
            <>
              {AGENT_CASE_INTERACTIONS_ENABLED &&
              tribunalCase.requiresAction &&
              tribunalCase.status === 'active' ? (
                <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    CROSSUB recommends a tribunal matter — your review required
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => toast.success('Tribunal case approved')}
                    >
                      Approve case
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => toast.info('Case returned to CROSSUB for review')}
                    >
                      Request changes
                    </Button>
                  </div>
                </div>
              ) : null}

              <InfoPanel title="Case summary" icon={Gavel}>
                {tribunalCase.caseNumber ? (
                  <InfoRow label="Case number" value={tribunalCase.caseNumber} />
                ) : null}
                <InfoRow label="Property" value={tribunalCase.propertyAddress} />
                <InfoRow label="Tenant" value={tribunalCase.tenantName} />
                <InfoRow label="Matter" value={tribunalCase.matter} />
                <InfoRow label="Status" value={tribunalCase.status} />
                {tribunalCase.hearingDate ? (
                  <InfoRow
                    label="Hearing date"
                    value={formatDateTime(tribunalCase.hearingDate)}
                  />
                ) : null}
                {tribunalCase.inspector ? (
                  <InfoRow label="Member / inspector" value={tribunalCase.inspector} />
                ) : null}
                {tribunalCase.orders ? (
                  <InfoRow label="Orders" value={tribunalCase.orders} />
                ) : null}
              </InfoPanel>

              {tribunalCase.evidence && tribunalCase.evidence.length > 0 ? (
                <InfoPanel title="Evidence" icon={FileText}>
                  <ul className="space-y-2 text-sm">
                    {tribunalCase.evidence.map((doc) => (
                      <li
                        key={doc}
                        className="rounded-lg border bg-secondary/30 px-3 py-2"
                      >
                        {doc}
                      </li>
                    ))}
                  </ul>
                </InfoPanel>
              ) : null}
            </>
          )}
        </div>
      </CaseDetailDialog>

      <WorkflowCaseDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete tribunal case?"
        description={`Remove ${titleRef} from your tribunal list. This cannot be undone.`}
        confirmLabel="Delete case"
        onConfirm={async (reason) => {
          await deleteAgentTribunalCase(caseId, reason);
          await refreshPortfolio({ force: true });
          toast.success('Tribunal case deleted');
        }}
        onSuccess={() => {
          onClose();
          onDeleted?.();
        }}
      />
    </>
  );
}
