import type { PropertyJobKind, PropertyJobRow } from '@/lib/property-job-rows';
import {
  leasingWorkflowCaseId,
  type AgentWorkflowCaseModule,
} from '@/lib/workflow-case-new-highlight';
import { useWorkflowCaseNewStore } from '@/lib/workflow-case-new-store';

function jobKindToModule(kind: PropertyJobKind): AgentWorkflowCaseModule | null {
  switch (kind) {
    case 'maintenance':
    case 'inspection':
    case 'rent_review':
    case 'leasing':
    case 'end_leasing':
      return kind;
    default:
      return null;
  }
}

export function markAgentWorkflowCaseOpenedFromJob(job: PropertyJobRow): void {
  const module = jobKindToModule(job.kind);
  if (!module) return;
  useWorkflowCaseNewStore.getState().markOpened(module, job.id);
}

export function markAgentLeasingCycleOpened(propertyId: string, cycleId: string): void {
  useWorkflowCaseNewStore
    .getState()
    .markOpened('leasing', leasingWorkflowCaseId(propertyId, cycleId));
}
