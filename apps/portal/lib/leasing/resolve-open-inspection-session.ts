import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

function matchSessionBySchedule(
  sessions: Awaited<ReturnType<typeof openViewingsApi.list>>,
  detail: LeasingPropertyDetail,
  scheduledTime: string,
): string | null {
  const target = new Date(scheduledTime).getTime();
  if (Number.isNaN(target)) return null;

  const addressNeedle = detail.propertyAddress.toLowerCase().trim();
  const addressHead = addressNeedle.split(',')[0]?.trim() ?? addressNeedle;

  const match = sessions.find((session) => {
    const sameTime = Math.abs(new Date(session.startTime).getTime() - target) < 60_000;
    if (!sameTime) return false;
    if (session.propertyId && session.propertyId === detail.propertyId) return true;
    const propertyLabel = session.property.toLowerCase();
    const fullAddress = session.address.toLowerCase();
    return propertyLabel === addressNeedle || fullAddress.includes(addressHead);
  });

  return match?.id ?? null;
}

/**
 * Resolve the open-viewing session id for a leasing cycle's open inspection step.
 * Mirrors crossub_web `resolveOpenInspectionSessionId`.
 */
export async function resolveOpenInspectionSessionId(
  detail: LeasingPropertyDetail,
  options?: {
    cycleId?: string;
    onCycleView?: (view: ServerLeasingCycleView) => void;
  },
): Promise<string | null> {
  if (detail.openInspection.viewingSessionId) {
    return detail.openInspection.viewingSessionId;
  }

  if (options?.cycleId) {
    try {
      const view = await leasingOpsApi.get(options.cycleId);
      options.onCycleView?.(view);
      if (view.viewingSessionId) return view.viewingSessionId;
    } catch {
      // fall through to session list lookup
    }
  }

  const scheduled = detail.openInspection.scheduledTime;
  if (!scheduled) return null;

  try {
    const sessions = await openViewingsApi.list();
    return matchSessionBySchedule(sessions, detail, scheduled);
  } catch {
    return null;
  }
}
