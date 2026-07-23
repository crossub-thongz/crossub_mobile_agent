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
import {
  getContractorRfqReminderUiState,
  shouldStopRfqReminderLoop,
} from '@/lib/maintenance/maintenance-rfq-reminder.util';

export type MaintenanceCaseSnapshot = {
  mapped: MappedMaintenance;
  remindersSent: number;
  nextReminderDueAt: string | null;
  maintenanceReminders: ApiMaintenanceState['maintenanceReminders'];
  workflowRequest: ApiMaintenanceState['maintenanceRequests'][number] | null;
  quotations: ApiMaintenanceState['quotations'];
  attachments: NonNullable<ApiMaintenanceState['maintenanceAttachments']>;
  contractors: ApiMaintenanceState['contractors'];
};

export function remindersForCase(
  state: ApiMaintenanceState,
  request: ApiMaintenanceState['maintenanceRequests'][number],
): { sent: number; nextDueAt: string | null } {
  const rows = state.maintenanceReminders.filter(
    (r) => r.maintenanceRequestId === request.id && r.type === 'reminder',
  );
  const sent = rows.length;

  const requestQuotations = state.quotations.filter((q) => q.maintenanceRequestId === request.id);
  if (shouldStopRfqReminderLoop(request, requestQuotations)) {
    return { sent, nextDueAt: null };
  }

  const invitedIds = request.invitedContractorIds ?? [];
  let earliestNext: number | null = null;
  const now = new Date();
  for (const contractorId of invitedIds) {
    const ui = getContractorRfqReminderUiState({
      contractorId,
      request,
      reminders: state.maintenanceReminders,
      quotations: requestQuotations,
      now,
    });
    if (ui.responded || ui.remindersSent >= ui.maxReminders) continue;
    if (earliestNext == null || ui.nextDueAtMs < earliestNext) {
      earliestNext = ui.nextDueAtMs;
    }
  }

  return {
    sent,
    nextDueAt: earliestNext != null ? new Date(earliestNext).toISOString() : null,
  };
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

  const workflowRequest = workflowReq ?? req;
  const { sent, nextDueAt } = remindersForCase(state, workflowRequest);
  const caseReminders = state.maintenanceReminders.filter(
    (r) => r.maintenanceRequestId === caseId,
  );

  return {
    mapped,
    remindersSent: sent,
    nextReminderDueAt: nextDueAt,
    maintenanceReminders: caseReminders,
    workflowRequest,
    quotations: state.quotations.filter((q) => q.maintenanceRequestId === caseId),
    attachments: state.maintenanceAttachments ?? [],
    contractors: state.contractors ?? [],
  };
}
