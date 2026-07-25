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
import { mergeIntakePhotoAttachments } from '@/lib/maintenance/merge-intake-photo-attachments';
import {
  getContractorRfqReminderUiState,
  shouldStopRfqReminderLoop,
} from '@/lib/maintenance/maintenance-rfq-reminder.util';

export function mergeQuotationsForCase(
  ...lists: Array<ApiMaintenanceState['quotations']>
): ApiMaintenanceState['quotations'] {
  const byId = new Map<string, ApiMaintenanceState['quotations'][number]>();
  for (const list of lists) {
    for (const quote of list) {
      byId.set(quote.id, quote);
    }
  }
  return [...byId.values()];
}

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
  // quotations/audit from Postgres on the same instance that serves the slice.
  let req: ApiMaintenanceState['maintenanceRequests'][number] | null = null;
  let bundledQuotations: ApiMaintenanceState['quotations'] = [];
  let bundledReminders: ApiMaintenanceState['maintenanceReminders'] = [];
  let bundledAttachments: NonNullable<ApiMaintenanceState['maintenanceAttachments']> = [];
  let bundledAudit: ApiMaintenanceState['maintenanceAuditLog'] = [];
  let bundledNotifications: ApiMaintenanceState['maintenanceNotifications'] = [];
  try {
    const bundle = await fetchMaintenanceRequest(caseId);
    req = bundle.request;
    bundledQuotations = bundle.quotations;
    bundledReminders = bundle.maintenanceReminders;
    bundledAttachments = bundle.maintenanceAttachments;
    bundledAudit = bundle.maintenanceAuditLog;
    bundledNotifications = bundle.maintenanceNotifications;
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

  const quotations = mergeQuotationsForCase(
    bundledQuotations,
    state.quotations.filter((q) => q.maintenanceRequestId === caseId),
  );

  const mapped = mapApiMaintenanceRequest(
    req,
    state.contractors,
    quotations,
    mergeAuditForCase(bundledAudit, state.maintenanceAuditLog, caseId),
    mergeNotificationsForCase(bundledNotifications, state.maintenanceNotifications, caseId),
  );
  if (propertyId) {
    mapped.propertyId = propertyId;
    mapped.propertyAddress = req.address || mapped.propertyAddress;
  }

  const workflowRequest = workflowReq ?? req;
  const { sent, nextDueAt } = remindersForCase(
    { ...state, quotations, maintenanceReminders: mergeRemindersForCase(bundledReminders, state.maintenanceReminders, caseId) },
    workflowRequest,
  );
  const caseReminders = mergeRemindersForCase(
    bundledReminders,
    state.maintenanceReminders,
    caseId,
  );

  const mergedAttachments = mergeAttachmentsForCase(
    bundledAttachments,
    state.maintenanceAttachments ?? [],
    caseId,
  );
  const attachments = mergeIntakePhotoAttachments(
    caseId,
    req.intakePhotoUrls,
    mergedAttachments,
    req.createdAt,
    req.source === 'tenant_app' ? 'tenant' : req.source === 'staff_portal' ? 'admin' : 'agent',
  );

  return {
    mapped,
    remindersSent: sent,
    nextReminderDueAt: nextDueAt,
    maintenanceReminders: caseReminders,
    workflowRequest,
    quotations,
    attachments,
    contractors: state.contractors ?? [],
  };
}

function mergeAuditForCase(
  bundled: ApiMaintenanceState['maintenanceAuditLog'],
  state: ApiMaintenanceState['maintenanceAuditLog'],
  caseId: string,
): ApiMaintenanceState['maintenanceAuditLog'] {
  const byId = new Map<string, ApiMaintenanceState['maintenanceAuditLog'][number]>();
  for (const entry of state.filter((e) => e.maintenanceRequestId === caseId)) {
    byId.set(entry.id, entry);
  }
  for (const entry of bundled) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

function mergeNotificationsForCase(
  bundled: ApiMaintenanceState['maintenanceNotifications'],
  state: ApiMaintenanceState['maintenanceNotifications'],
  caseId: string,
): ApiMaintenanceState['maintenanceNotifications'] {
  const byId = new Map<string, ApiMaintenanceState['maintenanceNotifications'][number]>();
  for (const entry of state.filter((n) => n.maintenanceRequestId === caseId)) {
    byId.set(entry.id, entry);
  }
  for (const entry of bundled) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

function mergeRemindersForCase(
  bundled: ApiMaintenanceState['maintenanceReminders'],
  state: ApiMaintenanceState['maintenanceReminders'],
  caseId: string,
): ApiMaintenanceState['maintenanceReminders'] {
  const byId = new Map<string, ApiMaintenanceState['maintenanceReminders'][number]>();
  for (const entry of state.filter((r) => r.maintenanceRequestId === caseId)) {
    byId.set(entry.id, entry);
  }
  for (const entry of bundled) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

function mergeAttachmentsForCase(
  bundled: NonNullable<ApiMaintenanceState['maintenanceAttachments']>,
  state: NonNullable<ApiMaintenanceState['maintenanceAttachments']>,
  caseId: string,
): NonNullable<ApiMaintenanceState['maintenanceAttachments']> {
  const byId = new Map<string, NonNullable<ApiMaintenanceState['maintenanceAttachments']>[number]>();
  for (const entry of state.filter((a) => a.maintenanceRequestId === caseId)) {
    byId.set(entry.id, entry);
  }
  for (const entry of bundled) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
}
