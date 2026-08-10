import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  type AgentIngoingGateStatus,
  inspectorHasAcceptedJob,
} from '@/lib/ingoing-inspection-display';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { isAssignedInspectorName } from '@/lib/leasing/open-inspection-display';
import { isCrossubManagedOpenInspection } from '@/lib/open-inspection/open-conducted-by';
import { resolveOpenPoolInspectionId } from '@/lib/open-inspection/linked-case-history';
import type { RoutineFlow } from '@/lib/routine/routine-case-status';
import type { ServerRoutineScheduleView } from '@/lib/routine-inspection-api';
import type { Inspection } from '@/lib/types';

type FieldInspectionGateStatus = AgentIngoingGateStatus;

/** Mirrors backend inspectorAcceptanceTriggersBilling — assign or accept. */
export function inspectorBillingEligible(
  record: InspectionRecord | null,
  inspection?: Inspection | null,
): boolean {
  if (inspectorHasAcceptedJob(record, inspection ?? null)) return true;
  if (record?.assignedInspectorId && record?.inspectorAssignedAt) return true;
  return false;
}

/**
 * Ingoing / outgoing: show payment after CROSSUB inspector accept until paid.
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

function openInspectorBillingEligible(args: {
  poolInspectionRecord: InspectionRecord | null;
  inspection?: Inspection | null;
  leasingDetail?: LeasingPropertyDetail | null;
  openSession?: OpenInspectionSession | null;
}): boolean {
  if (inspectorBillingEligible(args.poolInspectionRecord, args.inspection ?? null)) {
    return true;
  }

  const oi = args.leasingDetail?.openInspection;
  if (
    oi &&
    !oi.agentConducted &&
    oi.scheduledTime &&
    isAssignedInspectorName(oi.inspectorName)
  ) {
    return true;
  }

  if (
    args.openSession &&
    isAssignedInspectorName(
      args.leasingDetail?.openInspection?.inspectorName ??
        args.poolInspectionRecord?.inspectorName ??
        args.inspection?.inspector,
    ) &&
    Boolean(args.openSession.startTime)
  ) {
    return true;
  }

  if (
    isAssignedInspectorName(args.poolInspectionRecord?.inspectorName) &&
    Boolean(args.poolInspectionRecord?.assignedInspectorId ?? args.poolInspectionRecord?.inspectorAssignedAt)
  ) {
    return true;
  }

  return false;
}

/** CROSSUB open in-case billing — stays until paid (report done does not clear it). */
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
  return openInspectorBillingEligible(args);
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
  return openInspectorBillingEligible(args);
}
