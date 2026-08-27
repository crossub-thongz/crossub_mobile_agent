/** Agent-facing unpaid prepaid status — same wording as Open inspections. */
export const INSPECTION_AWAITING_PAYMENT_LABEL = 'Awaiting payment';

export const INSPECTION_AWAITING_PAYMENT_BADGE_CLASS =
  'bg-amber-500/15 text-amber-800 dark:text-amber-200';

export function isAwaitingAgentPayment(
  ...sources: Array<{ awaitingAgentPayment?: boolean | null } | null | undefined>
): boolean {
  return sources.some((source) => source?.awaitingAgentPayment === true);
}

export function withAwaitingPaymentStatus(
  awaiting: boolean,
  fallback: string,
): string {
  return awaiting ? INSPECTION_AWAITING_PAYMENT_LABEL : fallback;
}
