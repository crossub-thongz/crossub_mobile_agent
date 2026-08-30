export type RoutineFlow = 'self' | 'in_person';

export function routineConductModeLabel(flow: RoutineFlow): string {
  return flow === 'self' ? 'Tenant self-inspection' : 'In-person inspector visit';
}

function isRoutineInspectionCompleteStatus(status?: string | null): boolean {
  const normalized = status?.toLowerCase() ?? '';
  return normalized.includes('completed') || normalized.includes('published');
}

export function resolveRoutineReportStatus(input: {
  flow: RoutineFlow;
  selfStatus?: string | null;
  inPersonStatus?: string | null;
  hasReport: boolean;
  inspectionStatus?: string;
  completedAt?: string | null;
}): { label: string; complete: boolean } {
  const { flow, selfStatus, inPersonStatus, hasReport, inspectionStatus, completedAt } = input;
  const cycleComplete =
    hasReport ||
    Boolean(completedAt) ||
    isRoutineInspectionCompleteStatus(inspectionStatus);

  if (flow === 'self') {
    switch (selfStatus) {
      case 'completed':
        return { label: 'Final report complete', complete: true };
      case 'submitted':
        return cycleComplete
          ? { label: 'Final report complete', complete: true }
          : { label: 'Submitted — awaiting your review', complete: false };
      case 'review_required':
        return { label: 'Declined — awaiting tenant resubmit', complete: false };
      case 'awaiting_tenant':
        return cycleComplete
          ? { label: 'Final report complete', complete: true }
          : { label: 'Awaiting tenant submission', complete: false };
      default:
        return cycleComplete
          ? { label: 'Final report complete', complete: true }
          : { label: 'Awaiting tenant submission', complete: false };
    }
  }

  if (cycleComplete || inPersonStatus === 'completed') {
    return { label: 'Final report complete', complete: true };
  }

  switch (inPersonStatus) {
    case 'report_review':
      return { label: 'Report submitted — in review', complete: false };
    case 'in_progress':
      return { label: 'Inspector visit in progress', complete: false };
    case 'inspector_assigned':
      return { label: 'Inspector assigned — visit pending', complete: false };
    case 'pending_assignment':
      return { label: 'Awaiting inspector assignment', complete: false };
    default:
      return { label: 'Awaiting inspector report', complete: false };
  }
}
