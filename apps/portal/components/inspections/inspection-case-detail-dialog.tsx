'use client';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { InspectionDetailView } from '@/components/inspections/inspection-detail-view';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { DetailNavContext } from '@/lib/detail-navigation';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';

export function InspectionCaseDetailDialog({
  open,
  onClose,
  inspectionId,
  navContext,
  size = JOB_CASE_DIALOG_SIZE,
}: {
  open: boolean;
  onClose: () => void;
  inspectionId: string | null;
  navContext?: DetailNavContext;
  size?: 'default' | 'wide' | 'xl';
}) {
  const { inspections } = useAgentData();
  if (!open || !inspectionId) return null;

  const inspection = inspections.find((item) => item.id === inspectionId);

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title={inspection?.trackingNumber ?? inspectionReferenceLabel(inspectionId, 'OPEN')}
      subtitle={
        inspection
          ? `${inspection.type} · ${inspection.propertyAddress}`
          : 'Open inspection job case'
      }
      size={size}
    >
      <InspectionDetailView
        inspectionId={inspectionId}
        embedded
        navContext={navContext}
        onClose={onClose}
      />
    </CaseDetailDialog>
  );
}
