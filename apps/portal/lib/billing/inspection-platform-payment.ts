import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  type AgentIngoingGateStatus,
  inspectorHasAcceptedJob,
  inspectorIsAssigned,
} from '@/lib/ingoing-inspection-display';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { isCrossubManagedOpenInspection } from '@/lib/open-inspection/open-conducted-by';
import { resolveOpenPoolInspectionId } from '@/lib/open-inspection/linked-case-history';
import type { RoutineFlow } from '@/lib/routine/routine-case-status';
import type { ServerRoutineScheduleView } from '@/lib/routine-inspection-api';
import type { Inspection } from '@/lib/types';

type FieldInspectionGateStatus = AgentIngoingGateStatus;

/**
 * Mirrors backend billing trigger — pool accept **or** staff/admin assign.
 * Level 1 pay-now must appear as soon as an inspector is on the job.
 */
export function inspectorBillingEligible(
  record: InspectionRecord | null,
  inspection?: Inspection | null,
): boolean {
  if (inspectorHasAcceptedJob(record, inspection ?? null)) return true;
  if (record?.assignedInspectorId && record?.inspectorAssignedAt) return true;
  if (inspectorIsAssigned(record?.inspectorName ?? inspection?.inspector)) {
    return true;
  }
  return false;
}

/**
 * Ingoing / outgoing: show payment after an inspector is assigned/accepted until paid.
 * Completion does not dismiss the prompt — only a successful payment does.
 */
export function isFieldInspectionPlatformPaymentActive(args: {
  gateStatus: FieldInspectionGateStatus;
  record: InspectionRecord | null;
  inspection?: Inspection | null;
}): boolean {
  const status = (args.record?.status ?? args.inspection?.apiStatus ?? args.inspection?.status ?? '')
    .toString()
    .toLowerCase();
  if (status.includes('cancel')) return false;
  if (inspectorBillingEligible(args.record, args.inspection ?? null)) return true;
  return args.gateStatus === 'scheduled' || args.gateStatus === 'awaiting_approval';
}

export function resolveRoutinePlatformPaymentInspectionId(args: {
  inspection: Inspection;
  routineSchedule: ServerRoutineScheduleView | null;
  routineInspectionRecord: InspectionRecord | null;
}): string {
  return (
    args.routineInspectionRecord?.id ??
    args.routineSchedule?.currentInspectionId ??
    args.inspection.id
  );
}

/** In-person CROSSUB routine only — stays until paid (completion does not clear it). */
export function isRoutinePlatformPaymentActive(args: {
  inspection: Inspection;
  routineFlow: RoutineFlow | null;
  routineCompletedAt: string | null | undefined;
  isCancelledRoutine: boolean;
  routineInspectionRecord: InspectionRecord | null;
}): boolean {
  return (
    args.inspection.type === 'ROUTINE' &&
    args.routineFlow === 'in_person' &&
    !args.isCancelledRoutine &&
    inspectorBillingEligible(args.routineInspectionRecord, args.inspection)
  );
}

export function resolveOpenPlatformPaymentInspectionId(args: {
  poolInspectionId?: string | null;
  leasingDetail?: LeasingPropertyDetail | null;
  openSession?: OpenInspectionSession | null;
  focusInspectionId?: string | null;
  isViewingSessionSource?: boolean;
}): string | null {
  const fromHook = args.poolInspectionId?.trim();
  if (fromHook) return fromHook;
  return resolveOpenPoolInspectionId(args);
}

/**
 * CROSSUB open in-case billing for leftover unpaid jobs. New orders are paid when
 * created; this gate still covers staff-created jobs and older unpaid accepts.
 */
export function isOpenPlatformPaymentActiveForCase(args: {
  inspection: Inspection;
  isDone: boolean;
  poolInspectionRecord: InspectionRecord | null;
  leasingDetail?: LeasingPropertyDetail | null;
  openSession?: OpenInspectionSession | null;
}): boolean {
  if (args.inspection.type !== 'OPEN') return false;
  if (
    args.inspection.status?.toLowerCase().includes('cancel') ||
    args.inspection.apiStatus === 'CANCELLED'
  ) {
    return false;
  }
  if (
    !isCrossubManagedOpenInspection({
      session: args.openSession,
      leasingDetail: args.leasingDetail,
      inspection: args.inspection,
    })
  ) {
    return false;
  }
  return inspectorBillingEligible(args.poolInspectionRecord, args.inspection);
}

/** CROSSUB open inspections — agent-run / self open are not billed. */
export function isOpenPlatformPaymentActive(args: {
  isCrossubOpen: boolean;
  isSelfOpen: boolean;
  isDone: boolean;
  poolInspectionRecord: InspectionRecord | null;
  inspection?: Inspection | null;
  leasingDetail?: LeasingPropertyDetail | null;
  openSession?: OpenInspectionSession | null;
}): boolean {
  if (args.isSelfOpen) return false;
  if (!args.isCrossubOpen) return false;
  return inspectorBillingEligible(args.poolInspectionRecord, args.inspection ?? null);
}
