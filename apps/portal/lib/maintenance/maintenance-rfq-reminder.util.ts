import type {
  ApiMaintenanceRequest as MaintenanceRequest,
  ApiMaintenanceStatus as MaintenanceStatus,
  ApiQuotation as Quotation,
  QuotationReviewRecord,
} from '@/lib/crossub-api/types';

type MaintenanceReminder = {
  id: string;
  maintenanceRequestId: string;
  status?: MaintenanceStatus;
  dueAt: string;
  sentAt?: string;
  type: 'reminder' | 'escalation';
  contractorId?: string;
  rfqRound?: number;
};

/** Hours between contractor RFQ reminder sends. */
export const RFQ_REMINDER_INTERVAL_MS = 4 * 60 * 60 * 1000;

export const RFQ_MAX_REMINDERS_PER_CONTRACTOR = 3;

export const RFQ_AUTO_RESELECT_COUNT = 3;

export function contractorIdsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const na = a.trim();
  const nb = b.trim();
  if (na === nb) return true;
  const prefA = na.match(/^agency-pref-(.+)$/)?.[1];
  const prefB = nb.match(/^agency-pref-(.+)$/)?.[1];
  if (prefA && prefB) return prefA === prefB;
  if (prefA && prefA === nb) return true;
  if (prefB && prefB === na) return true;
  return false;
}

/** Agent approved a quote — stop the RFQ reminder / auto-reselect loop. */
export function shouldStopRfqReminderLoop(
  request: Pick<MaintenanceRequest, 'id' | 'status' | 'quotationReviews'>,
  quotations: Quotation[],
): boolean {
  if (request.status !== 'pending_quotation') return true;
  if (request.quotationReviews?.some((r) => r.decision === 'approved')) return true;
  return quotations.some(
    (q) => q.maintenanceRequestId === request.id && q.status === 'approved',
  );
}

export function contractorHasRfqResponse(
  contractorId: string,
  requestId: string,
  quotations: Quotation[],
): boolean {
  return quotations.some(
    (q) =>
      q.maintenanceRequestId === requestId &&
      contractorIdsMatch(q.contractorId, contractorId) &&
      (q.status === 'submitted' ||
        q.status === 'approved' ||
        (q.status === 'declined' && q.declinedBy === 'contractor')),
  );
}

export function rfqRoundKey(request: MaintenanceRequest): number {
  return request.rfqReminderRound ?? 0;
}

export function rfqRoundStartedAt(request: MaintenanceRequest): number {
  if (request.rfqRoundStartedAt) {
    return new Date(request.rfqRoundStartedAt).getTime();
  }
  const pendingEntry = request.timeline
    ?.filter((t) => t.status === 'pending_quotation')
    .sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime())[0];
  if (pendingEntry?.enteredAt) {
    return new Date(pendingEntry.enteredAt).getTime();
  }
  return new Date(request.createdAt).getTime();
}

export function remindersForContractorInRound(
  contractorId: string,
  request: MaintenanceRequest,
  existing: MaintenanceReminder[],
): MaintenanceReminder[] {
  const round = rfqRoundKey(request);
  return existing.filter(
    (r) =>
      r.maintenanceRequestId === request.id &&
      r.status === 'pending_quotation' &&
      r.type === 'reminder' &&
      (r.rfqRound ?? 0) === round &&
      r.contractorId &&
      contractorIdsMatch(r.contractorId, contractorId),
  );
}

export function remindersSentCountForContractor(
  contractorId: string,
  request: MaintenanceRequest,
  existing: MaintenanceReminder[],
): number {
  return remindersForContractorInRound(contractorId, request, existing).length;
}

export function nextRfqReminderDueAtMs(
  request: MaintenanceRequest,
  contractorId: string,
  existing: MaintenanceReminder[],
): number {
  const roundStart = rfqRoundStartedAt(request);
  const sent = remindersSentCountForContractor(contractorId, request, existing);
  return roundStart + (sent + 1) * RFQ_REMINDER_INTERVAL_MS;
}

export function formatRfqReminderCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function getContractorRfqReminderUiState(args: {
  contractorId: string;
  request: MaintenanceRequest;
  reminders: MaintenanceReminder[];
  quotations: Quotation[];
  now?: Date;
}): {
  responded: boolean;
  remindersSent: number;
  maxReminders: number;
  nextDueAtMs: number;
  countdownLabel: string;
  overdue: boolean;
} {
  const now = args.now ?? new Date();
  const responded = contractorHasRfqResponse(
    args.contractorId,
    args.request.id,
    args.quotations,
  );
  const remindersSent = remindersSentCountForContractor(
    args.contractorId,
    args.request,
    args.reminders,
  );
  const nextDueAtMs = nextRfqReminderDueAtMs(
    args.request,
    args.contractorId,
    args.reminders,
  );
  const msRemaining = nextDueAtMs - now.getTime();
  return {
    responded,
    remindersSent,
    maxReminders: RFQ_MAX_REMINDERS_PER_CONTRACTOR,
    nextDueAtMs,
    countdownLabel: responded
      ? 'Responded'
      : remindersSent >= RFQ_MAX_REMINDERS_PER_CONTRACTOR
        ? 'Max reminders sent'
        : msRemaining <= 0
          ? 'Sending reminder…'
          : formatRfqReminderCountdown(msRemaining),
    overdue: !responded && msRemaining <= 0 && remindersSent < RFQ_MAX_REMINDERS_PER_CONTRACTOR,
  };
}

export function getDueRfqReminders(args: {
  request: MaintenanceRequest;
  invitedContractorIds: string[];
  existing: MaintenanceReminder[];
  quotations: Quotation[];
  now?: Date;
}): MaintenanceReminder[] {
  const { request, invitedContractorIds, existing, quotations } = args;
  const now = args.now ?? new Date();

  if (request.status !== 'pending_quotation' || request.responsibility !== 'landlord') {
    return [];
  }
  if (shouldStopRfqReminderLoop(request, quotations)) {
    return [];
  }
  if (invitedContractorIds.length === 0) return [];

  const round = rfqRoundKey(request);
  const due: MaintenanceReminder[] = [];

  for (const contractorId of invitedContractorIds) {
    if (contractorHasRfqResponse(contractorId, request.id, quotations)) continue;

    const sent = remindersSentCountForContractor(contractorId, request, existing);
    if (sent >= RFQ_MAX_REMINDERS_PER_CONTRACTOR) continue;

    const nextDueAtMs = nextRfqReminderDueAtMs(request, contractorId, existing);
    if (now.getTime() < nextDueAtMs) continue;

    const slug = contractorId.replace(/[^a-zA-Z0-9_-]+/g, '_');
    due.push({
      id: `rem-${request.id}-pending_quotation-${slug}-r${round}-${sent + 1}`,
      maintenanceRequestId: request.id,
      status: 'pending_quotation',
      dueAt: new Date(nextDueAtMs).toISOString(),
      sentAt: now.toISOString(),
      type: 'reminder',
      contractorId,
      rfqRound: round,
    });
  }

  return due;
}

/** True when every invited contractor responded or received max reminders with zero responses. */
export function shouldAutoReselectRfqContractors(args: {
  request: MaintenanceRequest;
  invitedContractorIds: string[];
  existing: MaintenanceReminder[];
  quotations: Quotation[];
}): boolean {
  const { request, invitedContractorIds, existing, quotations } = args;
  if (invitedContractorIds.length === 0) return false;
  if (shouldStopRfqReminderLoop(request, quotations)) return false;

  let anyResponded = false;
  for (const contractorId of invitedContractorIds) {
    if (contractorHasRfqResponse(contractorId, request.id, quotations)) {
      anyResponded = true;
      break;
    }
  }
  if (anyResponded) return false;

  return invitedContractorIds.every(
    (contractorId) =>
      remindersSentCountForContractor(contractorId, request, existing) >=
      RFQ_MAX_REMINDERS_PER_CONTRACTOR,
  );
}

export function buildReminderId(
  requestId: string,
  status: MaintenanceStatus,
  contractorId: string,
  round: number,
  n: number,
): string {
  const slug = contractorId.replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `rem-${requestId}-${status}-${slug}-r${round}-${n}`;
}
