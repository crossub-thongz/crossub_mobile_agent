import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  type AgentIngoingGateStatus,
  inspectorHasAcceptedJob,
} from '@/lib/ingoing-inspection-display';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { isAssignedInspectorName } from '@/lib/leasing/open-inspection-display';
import { resolveOpenPoolInspectionId } from '@/lib/open-inspection/linked-case-history';
import type { RoutineFlow } from '@/lib/routine/routine-case-status';
import type { ServerRoutineScheduleView } from '@/lib/routine-inspection-api';
import type { Inspection } from '@/lib/types';

type FieldInspectionGateStatus = AgentIngoingGateStatus;

/** Ingoing / outgoing: inspector accepted, job still in progress. */
export function isFieldInspectionPlatformPaymentActive(args: {
  gateStatus: FieldInspectionGateStatus;
  record: InspectionRecord | null;
  inspection?: Inspection | null;
}): boolean {
  if (args.gateStatus === 'completed') return false;
  if (inspectorHasAcceptedJob(args.record, args.inspection ?? null)) return true;
  return args.gateStatus === 'scheduled';
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
    !args.routineCompletedAt &&
    !args.isCancelledRoutine &&
    inspectorHasAcceptedJob(args.routineInspectionRecord, args.inspection)
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

function openInspectorAcceptedForBilling(args: {
  poolInspectionRecord: InspectionRecord | null;
  inspection?: Inspection | null;
  leasingDetail?: LeasingPropertyDetail | null;
}): boolean {
  if (inspectorHasAcceptedJob(args.poolInspectionRecord, args.inspection ?? null)) {
    return true;
  }

  const oi = args.leasingDetail?.openInspection;
  if (
    oi &&
    !oi.agentConducted &&
    oi.scheduledTime &&
    isAssignedInspectorName(oi.inspectorName) &&
    Boolean(oi.inspectionId?.trim())
  ) {
    // Leasing cycle already mirrors the pool row; show payment while the pool record poll catches up.
    return args.poolInspectionRecord == null;
  }

  return false;
}

/** CROSSUB open inspections bill when the pool inspector accepts (not tenant self / agent-run). */
export function isOpenPlatformPaymentActive(args: {
  isCrossubOpen: boolean;
  isSelfOpen: boolean;
  isDone: boolean;
  poolInspectionId: string | null;
  poolInspectionRecord: InspectionRecord | null;
  inspection?: Inspection | null;
  leasingDetail?: LeasingPropertyDetail | null;
}): boolean {
  if (!args.isCrossubOpen || args.isSelfOpen || args.isDone) return false;
  if (!args.poolInspectionId) return false;
  return openInspectorAcceptedForBilling(args);
}
