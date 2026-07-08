import { MAINTENANCE_STATUS } from '@/constants/api-enums';
import type { MaintenanceRequest } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

const MAINTENANCE_AGENT_STEPS = [
  { id: 'open', label: 'Job opened' },
  { id: 'approved', label: 'Approved' },
  { id: 'quoting', label: 'Quote review' },
  { id: 'scheduled', label: 'Work scheduled' },
  { id: 'invoiced', label: 'Invoiced' },
  { id: 'completed', label: 'Completed' },
] as const;

function resolveMaintenanceStepId(apiStatus?: string): string {
  switch (apiStatus) {
    case MAINTENANCE_STATUS.OPEN:
      return 'open';
    case MAINTENANCE_STATUS.APPROVED:
      return 'approved';
    case MAINTENANCE_STATUS.QUOTING:
      return 'quoting';
    case MAINTENANCE_STATUS.SCHEDULED:
      return 'scheduled';
    case MAINTENANCE_STATUS.INVOICED:
      return 'invoiced';
    case MAINTENANCE_STATUS.COMPLETED:
      return 'completed';
    case MAINTENANCE_STATUS.CANCELLED:
      return 'open';
    default:
      return 'open';
  }
}

export function maintenanceWorkflowProgress(
  request: MaintenanceRequest,
): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'Maintenance workflow',
    MAINTENANCE_AGENT_STEPS,
    resolveMaintenanceStepId(request.apiStatus),
  );
}
