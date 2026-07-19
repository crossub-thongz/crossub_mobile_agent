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
  // Hydrate the job on the API first — `/maintenance/requests/:id` rebuilds
  // quotations/audit from Postgres. A preceding `/maintenance/state` call would
  // miss quotes that only exist in the DB until that hydrate runs.
  let req: ApiMaintenanceState['maintenanceRequests'][number] | null = null;
  try {
    req = await fetchMaintenanceRequest(caseId);
  } catch {
    // Fall through — the case may still exist on the workflow board snapshot.
  }

  const state = await fetchMaintenanceState();
  const workflowReq = state.maintenanceRequests.find((r) => r.id === caseId);
  if (req && workflowReq) {
    req = mergeMaintenanceCaseForLiveSync(req, workflowReq);
  } else if (!req) {
    req = workflowReq ?? null;
  }
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
    contractors: state.contractors ?? [],
  };
}
