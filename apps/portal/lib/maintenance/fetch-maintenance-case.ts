import {
  fetchMaintenanceRequest,
  fetchMaintenanceState,
} from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceState } from '@/lib/crossub-api/types';
import {
  mapApiMaintenanceRequest,
  type MappedMaintenance,
} from '@/lib/data/map-maintenance';
import { mergeMaintenanceCaseForLiveSync } from '@/lib/maintenance/merge-maintenance-case';

export type MaintenanceCaseSnapshot = {
  mapped: MappedMaintenance;
  remindersSent: number;
  nextReminderDueAt: string | null;
  attachments: NonNullable<ApiMaintenanceState['maintenanceAttachments']>;
  contractors: ApiMaintenanceState['contractors'];
};

export function remindersForCase(
  state: ApiMaintenanceState,
  requestId: string,
): { sent: number; nextDueAt: string | null } {
  const rows = state.maintenanceReminders.filter(
    (r) => r.maintenanceRequestId === requestId,
  );
  const sent = rows.filter((r) => r.type === 'reminder').length;
  const upcoming = rows
    .map((r) => r.dueAt)
    .filter((d) => new Date(d).getTime() > Date.now())
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return { sent, nextDueAt: upcoming[0] ?? null };
}

/** Load one maintenance case — Prisma row merged with the live workflow board. */
export async function fetchMaintenanceCase(
  caseId: string,
  propertyId?: string,
): Promise<MaintenanceCaseSnapshot | null> {
  const state = await fetchMaintenanceState();
  const workflowReq = state.maintenanceRequests.find((r) => r.id === caseId);

  let req = workflowReq ?? null;
  try {
    const prismaReq = await fetchMaintenanceRequest(caseId);
    req = workflowReq
      ? mergeMaintenanceCaseForLiveSync(prismaReq, workflowReq)
      : prismaReq;
  } catch {
    if (!req) return null;
  }

  const mapped = mapApiMaintenanceRequest(
    req,
    state.contractors,
    state.quotations,
    state.maintenanceAuditLog,
    state.maintenanceNotifications,
  );
  if (propertyId) {
    mapped.propertyId = propertyId;
    mapped.propertyAddress = req.address || mapped.propertyAddress;
  }

  const { sent, nextDueAt } = remindersForCase(state, caseId);
  return {
    mapped,
    remindersSent: sent,
    nextReminderDueAt: nextDueAt,
    attachments: state.maintenanceAttachments ?? [],
    contractors: state.contractors ?? [],
  };
}
