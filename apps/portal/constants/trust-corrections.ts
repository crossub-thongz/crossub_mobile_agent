import type { TrustRentPeriod } from '@/constants/trust';

/**
 * PRD phase 4 (Accounting PRD v1.0, docs/trustaccounting.md D153–D158 in crossub_web): rent rate
 * history, move-out, bank-neutral allocation corrections and rent reminders. Copy and enums for
 * the agent trust screens.
 */

/** The allocations a correction can move between (the API refuses Invoice and Other). */
export const TRUST_CORRECTION_ALLOCATION = {
  RENT: 'RENT',
  DEPOSIT: 'DEPOSIT',
} as const;
export type TrustCorrectionAllocation = (typeof TRUST_CORRECTION_ALLOCATION)[keyof typeof TRUST_CORRECTION_ALLOCATION];

export const TRUST_CORRECTION_ALLOCATION_OPTIONS: readonly { id: TrustCorrectionAllocation; label: string }[] = [
  { id: TRUST_CORRECTION_ALLOCATION.RENT, label: 'Rent' },
  { id: TRUST_CORRECTION_ALLOCATION.DEPOSIT, label: 'Deposit' },
];

/** Why a correction or move-out cannot be confirmed (the preview still shows). */
export const TRUST_CORRECTION_BLOCK = {
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  EXCEEDS_REMAINING: 'EXCEEDS_REMAINING',
  EXCEEDS_FINAL_LIABILITY: 'EXCEEDS_FINAL_LIABILITY',
} as const;
export type TrustCorrectionBlock = (typeof TRUST_CORRECTION_BLOCK)[keyof typeof TRUST_CORRECTION_BLOCK];

export const TRUST_CORRECTION_BLOCK_LABEL: Record<TrustCorrectionBlock, string> = {
  INSUFFICIENT_FUNDS: 'A folio the money comes from does not have that much available. Nothing can be posted until it does.',
  EXCEEDS_REMAINING: 'That is more than is left of this allocation on the receipt.',
  EXCEEDS_FINAL_LIABILITY: 'That is more rent than the tenant owes up to their move-out date. Put the rest to Deposit.',
};

/** The kinds of correction the list shows. */
export const TRUST_CORRECTION_KIND = {
  ALLOCATION: 'ALLOCATION',
  MOVE_OUT: 'MOVE_OUT',
} as const;
export type TrustCorrectionKind = (typeof TRUST_CORRECTION_KIND)[keyof typeof TRUST_CORRECTION_KIND];

export const TRUST_CORRECTION_KIND_LABEL: Record<TrustCorrectionKind, string> = {
  ALLOCATION: 'Allocation',
  MOVE_OUT: 'Move-out',
};

export const TRUST_CORRECTION_LIMITS = {
  reasonMax: 300,
  rentNoteMax: 300,
} as const;

export const TRUST_RENT_RATES_COPY = {
  title: 'Rent rates',
  description: 'Rent is charged each day at the rate in force that day. A change re-rates the current paid-to; old receipts never change.',
  empty: 'No rent rates yet.',
  from: 'From',
  amount: 'Rent',
  add: 'Add rent change',
  remove: 'Remove',
  dialogTitle: 'Add a rent change',
  dialogDescription: 'The new rent per period from this date. A date already on the list changes that rate.',
  effectiveFrom: 'From',
  amountLabel: (period: string) => `Rent per ${period} ($)`,
  note: 'Note (optional)',
  amountInvalid: 'Enter the rent in dollars, e.g. 680.00',
  dateRequired: 'Choose the date the rent changes',
  submit: 'Save rate',
  cancel: 'Cancel',
  saved: 'Rent rate saved',
  removed: 'Rent rate removed',
  removeConfirm: (date: string) => `Remove the rent change from ${date}?`,
} as const;

export const TRUST_MOVE_OUT_COPY = {
  title: 'Move-out',
  none: 'No move-out date. Rent keeps running.',
  current: (date: string) => `Rent is owed up to ${date}.`,
  remaining: (amount: string) => `${amount} still owed up to the move-out.`,
  set: 'Set move-out',
  change: 'Change',
  clear: 'Clear',
  dialogTitle: 'Move-out date',
  dialogDescription:
    'The last day rent is owed. Rent already paid past it goes back to the tenant deposit, moved from the owner in one step.',
  date: 'Move-out date',
  preview: 'Preview',
  paidTo: (before: string, after: string) => `Paid to ${before} → ${after}`,
  excess: (amount: string) => `${amount} rent paid past the move-out goes back to the tenant deposit.`,
  noExcess: 'No rent was paid past this date. Nothing moves.',
  submit: 'Confirm move-out',
  clearSubmit: 'Clear move-out',
  cancel: 'Cancel',
  saved: 'Move-out saved',
  cleared: 'Move-out cleared',
  dateRequired: 'Choose the move-out date',
} as const;

export const TRUST_CORRECTION_COPY = {
  action: 'Correct allocation',
  title: (auditNumber: number) => `Correct allocation of #${auditNumber}`,
  description:
    'Move money this receipt put in the wrong place. No money comes in or goes out of the bank; the original receipt stays as it was.',
  from: 'Move from',
  to: 'Move to',
  fromTenant: (name: string) => `${name}'s`,
  toTenant: 'Tenant',
  chooseTenant: 'Choose a tenant',
  amount: 'Amount ($)',
  reason: 'Reason',
  reasonRequired: 'Say why the money moves',
  amountInvalid: 'Enter the amount in dollars, e.g. 100.00',
  tenantRequired: 'Choose the tenant it should go to',
  preview: 'Preview',
  remaining: (amount: string) => `${amount} of this allocation is left on the receipt.`,
  legs: 'Money moves',
  available: (amount: string) => `Available ${amount}`,
  short: 'Not enough available',
  paidTo: 'Paid to',
  paidToChange: (before: string, after: string) => `${before} → ${after}`,
  managementFee: (amount: string) =>
    `Management fee taken on this rent: ${amount}. It is not refunded or recovered automatically; adjust it yourself if needed.`,
  noMove: 'Same owner folio: only the paid-to dates move.',
  submit: 'Confirm correction',
  cancel: 'Cancel',
  done: 'Allocation corrected. The correction advice is waiting in Pending mail.',
  listTitle: 'Corrections',
  listEmpty: 'No corrections.',
  journals: (numbers: string) => `Journals ${numbers}`,
  movedBetween: (from: string, to: string) => `From ${from} to ${to}`,
} as const;

export const TRUST_RECEIPT_LIABILITY_COPY = {
  over: (max: string) => `The tenant owes ${max} up to their move-out. The rest can't go to rent.`,
  restToDeposit: 'Put the rest to Deposit',
} as const;

export const TRUST_RENT_REMINDERS_COPY = {
  title: 'Rent reminders',
  description:
    'Every day, a tenant 1 or 3 days behind gets a reminder and you get an alert at 7 days. They wait in Pending mail unless this is on.',
  toggle: 'Send rent reminders automatically',
  saved: (on: boolean) => (on ? 'Rent reminders will send automatically' : 'Rent reminders will wait in Pending mail'),
} as const;

/** How a rent period reads in "Rent per week ($)". */
export const TRUST_RENT_PERIOD_WORD: Record<TrustRentPeriod, string> = {
  WEEKLY: 'week',
  FORTNIGHTLY: 'fortnight',
  MONTHLY: 'month',
};
