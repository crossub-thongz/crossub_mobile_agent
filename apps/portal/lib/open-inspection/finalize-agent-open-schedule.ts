import type { AgentWorkflowCreateResult } from '@/lib/crossub-api/agent-workflow-client';
import { fetchLeasingCycleView, invalidateLeasingCycleView } from '@/lib/leasing/fetch-leasing-cycle';
import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';
import { resolveOpenInspectionForCycle } from '@/lib/open-inspection-resolve';
import type { Inspection } from '@/lib/types';

/**
 * After scheduling / starting a CROSSUB open inspection on a letting cycle:
 * register the agent-facing case (viewing session), merge cycle state in the
 * background, and return the id to open in the inspections UI.
 */
export async function finalizeAgentOpenInspectionSchedule({
  propertyId,
  cycleId,
  result,
  registerInspection,
  applyCycleView,
  refresh,
}: {
  propertyId: string;
  cycleId: string;
  result: AgentWorkflowCreateResult;
  registerInspection: (inspection: Inspection) => void;
  applyCycleView: (propertyId: string, view: ServerLeasingCycleView) => void;
  refresh: (options?: { force?: boolean }) => Promise<void>;
}): Promise<string | undefined> {
  const inspection = await resolveOpenInspectionForCycle({
    propertyId,
    cycleId,
    inspectionId: result.openInspectionId,
  });

  if (inspection) {
    registerInspection(inspection);
  }

  invalidateLeasingCycleView(cycleId);
  void fetchLeasingCycleView(cycleId)
    .then((view) => applyCycleView(propertyId, view))
    .catch(() => undefined);
  void refresh();

  return inspection?.id ?? result.openInspectionId;
}
