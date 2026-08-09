'use client';

import { AgentFieldInspectionDetail } from '@/components/inspections/agent-field-inspection-detail';
import { IngoingInspectionAgentDetail } from '@/components/inspections/ingoing-inspection-agent-detail';
import { InspectionDetailView } from '@/components/inspections/inspection-detail-view';
import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { DetailNavContext } from '@/lib/detail-navigation';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';
import type { Inspection } from '@/lib/types';

export function InspectionDetailDialog({
  open,
  onClose,
  inspection,
  navContext,
  size = JOB_CASE_DIALOG_SIZE,
  canDelete = false,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  inspection: Inspection | null;
  navContext?: DetailNavContext;
  size?: 'default' | 'wide' | 'xl';
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const { apiConnected } = useAgentData();

  if (!inspection) return null;

  const isFieldInspection =
    inspection.type === 'INGOING' || inspection.type === 'OUTGOING';

  if (isFieldInspection) {
    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title={inspection.trackingNumber}
        subtitle={`${inspection.type} · ${inspection.propertyAddress}`}
        size={size}
      >
        {inspection.type === 'OUTGOING' ? (
          <AgentFieldInspectionDetail inspection={inspection} apiConnected={apiConnected} />
        ) : (
          <IngoingInspectionAgentDetail inspection={inspection} apiConnected={apiConnected} />
        )}
      </CaseDetailDialog>
    );
  }

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title={inspection.trackingNumber ?? inspectionReferenceLabel(inspection.id, inspection.type)}
      subtitle={`${inspection.type} · ${inspection.propertyAddress}`}
      size={size}
    >
      <InspectionDetailView
        inspectionId={inspection.id}
        embedded
        navContext={navContext}
        onClose={onClose}
      />
    </CaseDetailDialog>
  );
}
