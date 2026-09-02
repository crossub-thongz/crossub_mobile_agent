'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { TribunalAwaitingAccountManagerPanel } from '@/components/agent/tribunal-awaiting-account-manager';
import { TribunalRentChasingDetail } from '@/components/agent/tribunal-rent-chasing-detail';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { deleteAgentTribunalCase } from '@/lib/crossub-api/agent-workflow-client';
import type { TribunalCase } from '@/lib/types';
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
            <TribunalAwaitingAccountManagerPanel kind="tribunal" />
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
