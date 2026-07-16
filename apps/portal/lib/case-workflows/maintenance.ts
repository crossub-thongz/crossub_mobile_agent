import {
  MAINTENANCE_AGENT_STEP_LABEL,
  MAINTENANCE_AGENT_STEP_TITLE,
  buildMaintenanceAgentWorkflow,
  type MaintenanceAgentStep,
} from '@/lib/maintenance/agent-workflow-model';
import { buildWorkspaceCaseFromRequest } from '@/lib/maintenance-workspace/adapter';
import { isDeletedMaintenance } from '@/lib/property-maintenance-history';
import type { MaintenanceRequest } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

/** Five-stage maintenance flow (manager Excel spec). */
const MAINTENANCE_AGENT_STEPS = [
  { id: 'job_created', label: 'Job created' },
  { id: 'review', label: 'Review' },
  { id: 'get_quote', label: 'Get quote' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'job_completed', label: 'Completed' },
] as const;

function resolveMaintenanceStepId(request: MaintenanceRequest): string {
  const workspaceCase = buildWorkspaceCaseFromRequest(request);
  const workflow = buildMaintenanceAgentWorkflow({ item: request, workspaceCase });
  return workflow.liveStepId;
}

export function maintenanceWorkflowProgress(
  request: MaintenanceRequest,
): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'Maintenance workflow',
    MAINTENANCE_AGENT_STEPS,
    resolveMaintenanceStepId(request),
  );
}

export function maintenanceCurrentStepLabel(request: MaintenanceRequest): string {
  if (isDeletedMaintenance(request)) return 'Deleted';
  const workspaceCase = buildWorkspaceCaseFromRequest(request);
  const workflow = buildMaintenanceAgentWorkflow({ item: request, workspaceCase });
  return MAINTENANCE_AGENT_STEP_TITLE[workflow.liveStepId];
}

export function maintenanceStepShortLabel(stepId: string, fallback?: string): string {
  const labels = MAINTENANCE_AGENT_STEP_LABEL as Record<string, string>;
  return labels[stepId] ?? fallback ?? stepId;
}

export type { MaintenanceAgentStep };
