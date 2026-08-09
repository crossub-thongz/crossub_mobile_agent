import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { inspectorHasAcceptedJob } from '@/lib/ingoing-inspection-display';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { resolveOpenPoolInspectionId } from '@/lib/open-inspection/linked-case-history';
import type { RoutineFlow } from '@/lib/routine/routine-case-status';
import type { ServerRoutineScheduleView } from '@/lib/routine-inspection-api';
import type { Inspection } from '@/lib/types';

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
  leasingDetail?: LeasingPropertyDetail | null;
  openSession?: OpenInspectionSession | null;
  focusInspectionId?: string | null;
  isViewingSessionSource?: boolean;
}): string | null {
  return resolveOpenPoolInspectionId(args);
}

/** CROSSUB open inspections bill when the pool inspector accepts (not tenant self / agent-run). */
export function isOpenPlatformPaymentActive(args: {
  isCrossubOpen: boolean;
  isSelfOpen: boolean;
  isDone: boolean;
  poolInspectionId: string | null;
  poolInspectionRecord: InspectionRecord | null;
  inspection?: Inspection | null;
}): boolean {
  if (!args.isCrossubOpen || args.isSelfOpen || args.isDone) return false;
  if (!args.poolInspectionId) return false;
  return inspectorHasAcceptedJob(args.poolInspectionRecord, args.inspection ?? null);
}
