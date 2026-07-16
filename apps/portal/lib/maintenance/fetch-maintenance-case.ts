import { fetchMaintenanceState } from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceAttachment, ApiMaintenanceState } from '@/lib/crossub-api/types';
import {
  mapApiMaintenanceRequest,
  type MappedMaintenance,
} from '@/lib/data/map-maintenance';

export type MaintenanceCaseSnapshot = {
  mapped: MappedMaintenance;
  remindersSent: number;
  nextReminderDueAt: string | null;
  attachments: ApiMaintenanceAttachment[];
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

/** Load one maintenance case from the live ops state (`GET /maintenance/state`). */
export async function fetchMaintenanceCase(
  caseId: string,
  propertyId?: string,
): Promise<MaintenanceCaseSnapshot | null> {
  const state = await fetchMaintenanceState();
  const req = state.maintenanceRequests.find((r) => r.id === caseId);
  if (!req) return null;

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
  };
}
