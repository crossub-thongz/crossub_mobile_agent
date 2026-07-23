import type {
  ApiMaintenanceRequest,
  ApiMaintenanceState,
  ApiQuotation,
} from '@/lib/crossub-api/types';

/** Hours between agent quotation-approval reminder emails. */
export const QUOTATION_APPROVAL_REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000;

type MaintenanceRequest = ApiMaintenanceRequest;
type MaintenanceReminder = ApiMaintenanceState['maintenanceReminders'][number];
type Quotation = ApiQuotation;
type MaintenanceStatus = ApiMaintenanceRequest['status'];

export function shouldStopQuotationApprovalReminderLoop(
  request: Pick<MaintenanceRequest, 'id' | 'status' | 'quotationReviews'>,
  quotations: Quotation[],
): boolean {
  if (request.status !== 'pending_approval') return true;
  if (request.quotationReviews?.some((r) => r.decision === 'approved')) return true;
  return quotations.some(
    (q) => q.maintenanceRequestId === request.id && q.status === 'approved',
  );
}

export function quotationApprovalReminderRound(request: MaintenanceRequest): number {
  return request.quotationApprovalReminderRound ?? 0;
}

export function quotationApprovalRoundStartedAtMs(request: MaintenanceRequest): number {
  if (request.quotationApprovalRoundStartedAt) {
    return new Date(request.quotationApprovalRoundStartedAt).getTime();
  }
  const pendingEntry = request.timeline
    ?.filter((t) => t.status === 'pending_approval')
    .sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime())[0];
  if (pendingEntry?.enteredAt) {
    return new Date(pendingEntry.enteredAt).getTime();
  }
  return new Date(request.createdAt).getTime();
}

export function agentApprovalRemindersInRound(
  request: MaintenanceRequest,
  existing: MaintenanceReminder[],
): MaintenanceReminder[] {
  const round = quotationApprovalReminderRound(request);
  return existing.filter(
    (r) =>
      r.maintenanceRequestId === request.id &&
      r.status === 'pending_approval' &&
      r.type === 'reminder' &&
      (r.quotationApprovalRound ?? 0) === round &&
      r.id.includes('-agent-approval-'),
  );
}

export function agentApprovalRemindersSentCount(
  request: MaintenanceRequest,
  existing: MaintenanceReminder[],
): number {
  return agentApprovalRemindersInRound(request, existing).length;
}

export function nextQuotationApprovalReminderDueAtMs(
  request: MaintenanceRequest,
  existing: MaintenanceReminder[],
): number {
  const roundStart = quotationApprovalRoundStartedAtMs(request);
  const sent = agentApprovalRemindersSentCount(request, existing);
  return roundStart + (sent + 1) * QUOTATION_APPROVAL_REMINDER_INTERVAL_MS;
}

export function formatQuotationApprovalReminderCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function getQuotationApprovalReminderUiState(args: {
  request: MaintenanceRequest;
  reminders: MaintenanceReminder[];
  quotations: Quotation[];
  now?: Date;
}): {
  active: boolean;
  remindersSent: number;
  nextDueAtMs: number;
  countdownLabel: string;
  overdue: boolean;
} {
  const now = args.now ?? new Date();
  const active = !shouldStopQuotationApprovalReminderLoop(args.request, args.quotations);
  const remindersSent = agentApprovalRemindersSentCount(args.request, args.reminders);
  const nextDueAtMs = nextQuotationApprovalReminderDueAtMs(args.request, args.reminders);
  const msRemaining = nextDueAtMs - now.getTime();

  let countdownLabel = '—';
  if (!active) {
    countdownLabel = 'Approved';
  } else if (msRemaining <= 0) {
    countdownLabel = 'Sending reminder…';
  } else {
    countdownLabel = formatQuotationApprovalReminderCountdown(msRemaining);
  }

  return {
    active,
    remindersSent,
    nextDueAtMs,
    countdownLabel,
    overdue: active && msRemaining <= 0,
  };
}

export function getDueQuotationApprovalReminders(args: {
  request: MaintenanceRequest;
  existing: MaintenanceReminder[];
  quotations: Quotation[];
  now?: Date;
}): MaintenanceReminder[] {
  const { request, existing, quotations } = args;
  const now = args.now ?? new Date();

  if (request.responsibility !== 'landlord') return [];
  if (shouldStopQuotationApprovalReminderLoop(request, quotations)) return [];

  const round = quotationApprovalReminderRound(request);
  const sent = agentApprovalRemindersSentCount(request, existing);
  const nextDueAtMs = nextQuotationApprovalReminderDueAtMs(request, existing);
  if (now.getTime() < nextDueAtMs) return [];

  return [
    {
      id: `rem-${request.id}-pending_approval-agent-approval-r${round}-${sent + 1}`,
      maintenanceRequestId: request.id,
      status: 'pending_approval' as MaintenanceStatus,
      dueAt: new Date(nextDueAtMs).toISOString(),
      sentAt: now.toISOString(),
      type: 'reminder',
      quotationApprovalRound: round,
    },
  ];
}
