'use client';

import { FileText, Gavel } from 'lucide-react';
import { toast } from 'sonner';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { TribunalRentChasingDetail } from '@/components/agent/tribunal-rent-chasing-detail';
import { Button } from '@/components/ui/button';
import { AGENT_CASE_INTERACTIONS_ENABLED } from '@/lib/agent-case-mode';
import type { TribunalCase } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

function isRentChasingCase(matter: string, tribunalType?: string): boolean {
  const matterLower = matter.trim().toLowerCase();
  if (matterLower.includes('rent chasing') || matterLower.includes('rental arrears')) {
    return true;
  }
  return (tribunalType ?? '').toUpperCase() === 'RENTAL_ARREARS';
}

export function TribunalCaseDetailDialog({
  open,
  onClose,
  caseId,
  tribunalCase,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string | null;
  tribunalCase?: TribunalCase | null;
}) {
  if (!open || !caseId) return null;

  const rentChasing = tribunalCase
    ? isRentChasingCase(tribunalCase.matter, tribunalCase.tribunalType)
    : true;

  const titleRef =
    tribunalCase?.caseNumber ??
    workflowCaseReferenceLabel(caseId, 'tribunal');
  const subtitle = tribunalCase
    ? `${titleRef} · ${tribunalCase.propertyAddress}`
    : titleRef;

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title="Tribunal case"
      subtitle={subtitle}
      size="2xl"
    >
      <div className="space-y-4">
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
  );
}
