import { INSPECTION_STATUS } from '@/constants/api-enums';
import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import { hasLeftTaskPool } from '@/lib/inspection-approval';
import type { Inspection } from '@/lib/types';

export const INSPECTION_TYPE_LABEL: Record<Inspection['type'], string> = {
  OPEN: 'Open inspection',
  INGOING: 'Ingoing',
  OUTGOING: 'Outgoing',
  ROUTINE: 'Routine',
};

export const INSPECTION_TYPE_SHORT: Record<Inspection['type'], string> = {
  OPEN: 'Open',
  INGOING: 'Ingoing',
  OUTGOING: 'Outgoing',
  ROUTINE: 'Routine',
};

export type InspectionListGroup = 'action' | 'upcoming' | 'done';

export type InspectionNextAction = {
  title: string;
  description: string;
  tone: 'default' | 'warning' | 'success' | 'info';
};

function isDoneStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('complete') || s.includes('published') || s.includes('closed');
}

export function isInspectionCancelled(inspection: Inspection): boolean {
  const api = (inspection.apiStatus ?? '').toLowerCase();
  if (api === SessionStatusEnum.CANCELLED) return true;
  if (api === INSPECTION_STATUS.CANCELLED.toLowerCase()) return true;
  return inspection.status.toLowerCase().includes('cancelled');
}

export function isInspectionDone(inspection: Inspection): boolean {
  const api = (inspection.apiStatus ?? '').toLowerCase();
  if (api === SessionStatusEnum.CLOSED) return true;
  if (isInspectionCancelled(inspection)) return true;
  if (api === INSPECTION_STATUS.PUBLISHED.toLowerCase()) return true;
  if (
    api === INSPECTION_STATUS.COMPLETED.toLowerCase() ||
    api === 'completed'
  ) {
    if (inspection.type === 'INGOING' || inspection.type === 'OUTGOING') {
      return hasLeftTaskPool({
        completedAt: inspection.completedAt,
        approvedAt: inspection.approvedAt,
      });
    }
    return true;
  }
  // Open report generated / review finished ⇒ case is done even if session status lagging.
  if (
    (inspection.type === 'OPEN' || inspection.source === 'open_viewing') &&
    (inspection.reportStatus === 'sent' ||
      inspection.reportStatus === 'approved' ||
      Boolean(inspection.reportUrl))
  ) {
    return true;
  }
  return isDoneStatus(inspection.status);
}

export function inspectionNeedsAction(inspection: Inspection): boolean {
  if (isInspectionDone(inspection)) return false;

  if (inspection.type === 'ROUTINE' && inspection.apiStatus === INSPECTION_STATUS.FIRST_REVIEW) {
    return true;
  }

  if (
    inspection.type === 'OPEN' &&
    inspection.openConductedBy === 'agent' &&
    inspection.openListingContext === 'occupied' &&
    !inspection.agentTenantNotifiedConfirmed
  ) {
    return true;
  }

  if (inspection.reportStatus === 'sent' || inspection.reportUrl) return true;

  if (inspection.apiStatus === SessionStatusEnum.OPEN) return true;

  if (
    inspection.type === 'OUTGOING' &&
    !isDoneStatus(inspection.status) &&
    inspection.reportStatus !== 'pending'
  ) {
    return true;
  }

  return false;
}

export function groupInspection(inspection: Inspection): InspectionListGroup {
  if (inspectionNeedsAction(inspection)) return 'action';
  if (isInspectionDone(inspection)) return 'done';
  return 'upcoming';
}

export const INSPECTION_GROUP_LABEL: Record<InspectionListGroup, string> = {
  action: 'Needs your attention',
  upcoming: 'Upcoming',
  done: 'Completed',
};

export function inspectionNextAction(inspection: Inspection): InspectionNextAction | null {
  if (isInspectionCancelled(inspection)) {
    return {
      title: 'Cancelled',
      description:
        inspection.cancelReason?.trim() || 'This inspection was cancelled.',
      tone: 'info',
    };
  }

  if (isInspectionDone(inspection)) {
    return {
      title: 'Completed',
      description: 'This routine inspection cycle is complete.',
      tone: 'success',
    };
  }

  if (
    inspection.type === 'OPEN' &&
    inspection.openConductedBy === 'agent' &&
    inspection.openListingContext === 'occupied' &&
    !inspection.agentTenantNotifiedConfirmed
  ) {
    return {
      title: 'Notify the tenant',
      description: 'Confirm the open inspection date and time with the current tenant before the viewing.',
      tone: 'warning',
    };
  }

  if (inspection.apiStatus === SessionStatusEnum.SCHEDULED) {
    return {
      title: 'Scheduled',
      description: 'The inspection is booked. Check back closer to the viewing time for updates.',
      tone: 'info',
    };
  }

  if (inspection.apiStatus === SessionStatusEnum.STAFF_EN_ROUTE) {
    return {
      title: 'Inspector en route',
      description: 'The assigned inspector is on the way to the property.',
      tone: 'info',
    };
  }

  if (inspection.apiStatus === SessionStatusEnum.OPEN) {
    return {
      title: 'Open now',
      description: 'The property is open for viewings. Monitor visitor registrations below.',
      tone: 'success',
    };
  }

  if (inspection.reportStatus === 'sent' || (inspection.reportUrl && inspection.reportStatus !== 'pending')) {
    return {
      title: 'Report ready',
      description: 'Open the inspection report to review findings and share with the owner if needed.',
      tone: 'success',
    };
  }

  if (inspection.type === 'OPEN' && inspection.openConductedBy === 'crossub' && !isInspectionDone(inspection)) {
    return {
      title: 'CROSSUB is arranging this',
      description: 'CROSSUB will schedule the open inspection and contact the tenant or listing contacts.',
      tone: 'info',
    };
  }

  if (!isInspectionDone(inspection)) {
    return {
      title: 'In progress',
      description: 'This job is moving through the inspection workflow. Check the steps below for status.',
      tone: 'default',
    };
  }

  return null;
}

export function inspectionSummaryCounts(inspections: Inspection[]) {
  const open = inspections.filter((i) => i.type === 'OPEN' && !isInspectionDone(i)).length;
  const upcoming = inspections.filter((i) => groupInspection(i) === 'upcoming').length;
  const action = inspections.filter((i) => groupInspection(i) === 'action').length;
  const done = inspections.filter((i) => groupInspection(i) === 'done').length;
  return { open, upcoming, action, done, total: inspections.length };
}
