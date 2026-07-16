'use client';

import { Trash2 } from 'lucide-react';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { PropertyMaintenanceJobPanel } from '@/components/agent/property-maintenance-job-panel';
import { Button } from '@/components/ui/button';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import type { MaintenanceRequest, Property } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export function PropertyMaintenanceCaseDialog({
  open,
  onClose,
  request,
  property,
  propertyId,
  canDelete = false,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  request: MaintenanceRequest | null;
  property: Property;
  propertyId: string;
  canDelete?: boolean;
  onDelete?: () => void;
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
      headerActions={
        canDelete && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-8"
            aria-label="Delete maintenance job"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null
      }
    >
      <PropertyMaintenanceJobPanel item={request} property={property} propertyId={propertyId} />
    </CaseDetailDialog>
  );
}
