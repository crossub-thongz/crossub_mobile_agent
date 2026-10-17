import {
  INSPECTION_LANES,
  LEASING_LANES,
  MAINTENANCE_LANES,
  type ModuleLaneDefinition,
} from '@/constants/module-workspace';
import { OWNER_DECISION_MODULE, type OwnerDecisionModule } from '@/constants/owner-decision';
import { inspectionDetail, leasingCycleHref, maintenanceDetail } from '@/constants/routes';
import { leasingLifecycleProgress } from '@/lib/case-workflows/leasing';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import {
  findLaneDefinition,
  inspectionLane,
  leasingCycleLane,
  maintenanceLane,
} from '@/lib/module-workspace-lanes';
import type { Inspection, LeasingCycle, MaintenanceRequest, MessageThread } from '@/lib/types';
import { inspectionRefSourceId, workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { leasingCycleStatusLabel } from '@/utils/leasing-relet-decision';

/** The job a conversation is linked to, for the Conversations job-context pane. */
export type ConversationJobContext = {
  module: OwnerDecisionModule;
  caseId: string;
  reference: string;
  title: string;
  lane: ModuleLaneDefinition<string>;
  href: string;
};

/**
 * Resolve `thread.relatedCaseId` against the jobs the portfolio already loaded. Null when the
 * thread has no linked job, or links one this pane does not show (rent review, tribunal…).
 */
export function resolveConversationJob(
  thread: MessageThread,
  jobs: {
    maintenance: readonly MaintenanceRequest[];
    inspections: readonly Inspection[];
    leasingCycles: readonly LeasingCycle[];
  },
  isV2: boolean,
): ConversationJobContext | null {
  const caseId = thread.relatedCaseId;
  if (!caseId) return null;

  const maintenance = jobs.maintenance.find((m) => m.id === caseId);
  if (maintenance) {
    return {
      module: OWNER_DECISION_MODULE.MAINTENANCE,
      caseId: maintenance.id,
      reference: maintenance.trackingNumber,
      title: maintenance.title,
      lane: findLaneDefinition(MAINTENANCE_LANES, maintenanceLane(maintenance)),
      href: maintenanceDetail(maintenance.id),
    };
  }

  const inspection = jobs.inspections.find(
    (i) => i.id === caseId || i.inspectionRecordId === caseId,
  );
  if (inspection) {
    return {
      module: OWNER_DECISION_MODULE.INSPECTIONS,
      caseId: inspectionRefSourceId(inspection),
      reference: inspection.trackingNumber,
      title: INSPECTION_TYPE_LABEL[inspection.type],
      lane: findLaneDefinition(INSPECTION_LANES, inspectionLane(inspection)),
      href: inspectionDetail(inspection.id),
    };
  }

  const cycle = jobs.leasingCycles.find((c) => c.id === caseId);
  if (cycle) {
    return {
      module: OWNER_DECISION_MODULE.LEASING,
      caseId: cycle.id,
      reference: workflowCaseReferenceLabel(cycle.id, 'leasing'),
      title: leasingCycleStatusLabel(cycle) ?? leasingLifecycleProgress(cycle).currentStepLabel,
      lane: findLaneDefinition(LEASING_LANES, leasingCycleLane(cycle)),
      href: leasingCycleHref(cycle, isV2),
    };
  }

  return null;
}
