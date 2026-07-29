'use client';

import { Trash2 } from 'lucide-react';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { PropertyMaintenanceJobPanel } from '@/components/agent/property-maintenance-job-panel';
import { Button } from '@/components/ui/button';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import {
  isTenantRejectedMaintenance,
  TENANT_REJECTED_BADGE_CLASS,
  TENANT_REJECTED_LABEL,
  tenantRejectionTitle,
} from '@/lib/maintenance/tenant-rejected';
import type { MaintenanceRequest, Property } from '@/lib/types';
import { cn } from '@/lib/utils';
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

  const orderRef =
    request.trackingNumber || workflowCaseReferenceLabel(request.id, 'maintenance');
  const tenantRejected = isTenantRejectedMaintenance(request);

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title="Maintenance"
      subtitle={
        <>
          <span className="text-primary font-medium tabular-nums">{orderRef}</span>
          {/* The dialog is where an officer lands off a rejected row — leading with "Closed"
              there loses the one thing that made them open it. */}
          {tenantRejected ? (
            <span className={cn('ml-2', TENANT_REJECTED_BADGE_CLASS)} title={tenantRejectionTitle(request)}>
              {TENANT_REJECTED_LABEL}
            </span>
          ) : (
            <span className="text-muted-foreground"> · {request.status}</span>
          )}
        </>
      }
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
