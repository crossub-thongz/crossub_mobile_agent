import { maintenanceCurrentStepLabel } from '@/lib/case-workflows/maintenance';
import { pickPrimaryMaintenance } from '@/lib/property-maintenance-job';
import type { MaintenanceRequest } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export interface PropertyMaintenanceWorkflowCase {
  id: string;
  label: string;
  title: string;
  status: string;
  currentStep: string;
  detail?: string;
  request: MaintenanceRequest;
}

function maintenanceCaseLabel(request: MaintenanceRequest): string {
  return request.trackingNumber || workflowCaseReferenceLabel(request.id, 'maintenance');
}

export function buildPropertyMaintenanceWorkflowCases(
  requests: MaintenanceRequest[],
): PropertyMaintenanceWorkflowCase[] {
  const ordered = [...requests];
  const primary = pickPrimaryMaintenance(ordered);
  if (primary) {
    ordered.sort((a, b) => {
      if (a.id === primary.id) return -1;
      if (b.id === primary.id) return 1;
      return 0;
    });
  }

  return ordered.map((request) => ({
    id: request.id,
    label: maintenanceCaseLabel(request),
    title: request.title,
    status: request.status,
    currentStep: maintenanceCurrentStepLabel(request),
    detail: [
      request.title,
      request.contractorName ? `Contractor: ${request.contractorName}` : null,
      request.priority !== 'normal' ? request.priority : null,
    ]
      .filter(Boolean)
      .join(' · '),
    request,
  }));
}

export function pickPrimaryMaintenanceCase(
  cases: PropertyMaintenanceWorkflowCase[],
): PropertyMaintenanceWorkflowCase | undefined {
  if (cases.length === 0) return undefined;
  return cases[0];
}
