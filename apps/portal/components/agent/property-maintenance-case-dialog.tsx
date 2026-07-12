'use client';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { PropertyMaintenanceJobPanel } from '@/components/agent/property-maintenance-job-panel';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import type { MaintenanceRequest, Property } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export function PropertyMaintenanceCaseDialog({
  open,
  onClose,
  request,
  property,
  propertyId,
}: {
  open: boolean;
  onClose: () => void;
  request: MaintenanceRequest | null;
  property: Property;
  propertyId: string;
}) {
  if (!request) return null;

  const name = request.trackingNumber || workflowCaseReferenceLabel(request.id, 'maintenance');

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title="Maintenance"
      subtitle={`${name} · ${request.status}`}
      size={JOB_CASE_DIALOG_SIZE}
    >
      <PropertyMaintenanceJobPanel item={request} property={property} propertyId={propertyId} />
    </CaseDetailDialog>
  );
}
