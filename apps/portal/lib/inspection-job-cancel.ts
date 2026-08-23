import {
  canCancelIngoingInspection,
  cancelIngoingInspectionJob,
} from '@/lib/ingoing-inspection-cancel';
import {
  canDeleteOpenInspection,
  cancelOpenInspectionJob,
} from '@/lib/open-inspection-delete';
import {
  canCancelOutgoingInspection,
  cancelOutgoingInspectionJob,
} from '@/lib/outgoing-inspection-cancel';
import type { Inspection } from '@/lib/types';

export function markInspectionCancelledLocally(inspection: Inspection): Inspection {
  return {
    ...inspection,
    apiStatus: 'CANCELLED',
    status: inspection.type === 'OPEN' ? 'Deleted' : 'Cancelled',
  };
}

export function canDeleteInspectionJob(inspection: Inspection): boolean {
  if (inspection.type === 'OPEN') return canDeleteOpenInspection(inspection);
  if (inspection.type === 'INGOING') return canCancelIngoingInspection(inspection, null);
  if (inspection.type === 'OUTGOING') return canCancelOutgoingInspection(inspection, null);
  return false;
}

export async function cancelInspectionJob(
  inspection: Inspection,
  reason: string,
): Promise<void> {
  if (inspection.type === 'OPEN') {
    await cancelOpenInspectionJob(inspection, reason);
    return;
  }
  if (inspection.type === 'INGOING') {
    await cancelIngoingInspectionJob(inspection, reason);
    return;
  }
  if (inspection.type === 'OUTGOING') {
    await cancelOutgoingInspectionJob(inspection, reason);
    return;
  }
  throw new Error('This inspection cannot be cancelled here');
}

export function inspectionJobDeleteCopy(inspection: Inspection): {
  title: string;
  description: string;
  confirmLabel: string;
  success: string;
} {
  if (inspection.type === 'INGOING') {
    return {
      title: 'Cancel ingoing inspection',
      description:
        'The ingoing order is cancelled. To inspect again later, add a new ingoing order from the property workflow. A reason is required.',
      confirmLabel: 'Cancel ingoing inspection',
      success: 'Ingoing inspection cancelled',
    };
  }
  if (inspection.type === 'OUTGOING') {
    return {
      title: 'Cancel outgoing inspection',
      description:
        'The outgoing order is cancelled. To inspect again later, add a new outgoing order from the property workflow. A reason is required.',
      confirmLabel: 'Cancel outgoing inspection',
      success: 'Outgoing inspection cancelled',
    };
  }
  return {
    title: 'Delete open inspection',
    description:
      'The open inspection is cancelled and removed from applicant browse. A reason is required.',
    confirmLabel: 'Delete open inspection',
    success: 'Open inspection deleted',
  };
}
