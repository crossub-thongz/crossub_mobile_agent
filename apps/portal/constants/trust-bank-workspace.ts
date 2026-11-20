import type { components } from '@crossub-thongz/api-contract';

/**
 * PRD phase 5 (D159–D165) for the agent trust screens: the saved bank import workspace, the
 * reconciliation adjustments and transit items, and the frozen daily check.
 */

type TrustBankLineView = components['schemas']['TrustBankWorkspaceLineDto']['view'];
type TrustTransitKind = NonNullable<components['schemas']['TrustReconciliationItemDto']['transitKind']>;

export const TRUST_BANK_LINE_VIEW = {
  UNMATCHED: 'UNMATCHED',
  MATCHED: 'MATCHED',
  DELETED: 'DELETED',
} as const satisfies Record<string, TrustBankLineView>;

export const TRUST_BANK_LINE_VIEW_LABEL: Record<TrustBankLineView, string> = {
  UNMATCHED: 'Unmatched',
  MATCHED: 'Matched',
  DELETED: 'Deleted',
};

export const TRUST_BANK_LINE_VIEW_ORDER: readonly TrustBankLineView[] = [
  TRUST_BANK_LINE_VIEW.UNMATCHED,
  TRUST_BANK_LINE_VIEW.MATCHED,
  TRUST_BANK_LINE_VIEW.DELETED,
];

/** Lines per page in the workspace. */
export const TRUST_BANK_LINES_PAGE_SIZE = 50;

export const TRUST_TRANSIT_KIND = {
  CASH_NOT_BANKED: 'CASH_NOT_BANKED',
  WITHDRAWAL_NOT_PROCESSED: 'WITHDRAWAL_NOT_PROCESSED',
} as const satisfies Record<string, TrustTransitKind>;

export const TRUST_TRANSIT_KIND_LABEL: Record<TrustTransitKind, string> = {
  CASH_NOT_BANKED: 'Cash not banked',
  WITHDRAWAL_NOT_PROCESSED: 'Not processed',
};

export const TRUST_BANK_WORKSPACE_COPY = {
  intro:
    'Import the bank statement as a QIF file. Every line is kept here until you match it to a posted transaction or delete it. Importing never posts anything.',
  choose: 'Import QIF file',
  tooLarge: 'The file is larger than 2 MB',
  imported: (newCount: number, duplicates: number) =>
    `${newCount} new line${newCount === 1 ? '' : 's'} imported${duplicates > 0 ? `, ${duplicates} already here` : ''}`,
  alreadyImported: 'This file was imported before; nothing new was added',
  skipped: (count: number) => `${count} before the account opened were left out`,
  importFailed: "Couldn't import the bank file",
  workspaceHint: 'Unmatched lines are a workspace count only; they never stop a month being locked.',
  empty: 'No lines here.',
  date: 'Date',
  memo: 'Statement text',
  amount: 'Amount',
  match: 'Match',
  file: 'File',
  suggestionTenant: (name: string, address: string | null) =>
    address ? `Receipt to ${name}, ${address}` : `Receipt to ${name}`,
  suggestionTransaction: (n: number, description: string) => `#${n} ${description}`,
  amountDiffers: 'Amount differs from the rent',
  suggestionBatch: (n: number, count: number) => `Batch #${n} (${count} payment${count === 1 ? '' : 's'})`,
  matchedTransaction: (n: number, description: string) => `#${n} ${description}`,
  matchedBatch: (n: number, count: number) => `Batch #${n}, ${count} payment${count === 1 ? '' : 's'}`,
  matchedBy: (name: string | null, when: string) => (name ? `${name}, ${when}` : when),
  deletedBy: (reason: string, name: string | null) => (name ? `${reason} (${name})` : reason),
  accept: 'Accept',
  pick: 'Match…',
  receipt: 'Receipt',
  delete: 'Delete',
  unmatch: 'Unmatch',
  lineInFuture: 'That line is dated after today, so it cannot be receipted yet',
  acceptAll: (count: number) => `Accept all suggested (${count})`,
  matched: 'Bank line matched',
  matchedCount: (count: number) => `${count} line${count === 1 ? '' : 's'} matched`,
  failedCount: (count: number) => `${count} line${count === 1 ? '' : 's'} could not be matched`,
  unmatched: 'Bank line unmatched',
  deleted: 'Bank line deleted',
  receiptThenMatch: 'Receipt posted and matched to the bank line',
  receiptNotMatched: 'Receipt posted. Match the bank line to it from the Unmatched list',
  deleteTitle: 'Delete bank line',
  deleteDescription:
    'The line leaves the workspace and is kept with your reason. The cash book is not changed.',
  deleteReason: 'Reason',
  deleteReasonRequired: 'Give a reason',
  deleteSubmit: 'Delete line',
  unmatchTitle: 'Unmatch bank line',
  unmatchDescription: 'The line goes back to Unmatched and the transaction reads Unreconciled again.',
  unmatchSubmit: 'Unmatch',
  cancel: 'Cancel',
  previous: 'Previous',
  next: 'Next',
  page: (page: number, pages: number) => `Page ${page} of ${pages}`,
} as const;

export const TRUST_MATCH_LINE_COPY = {
  title: 'Match bank line',
  description: (amount: string, date: string) =>
    `Unreconciled transactions of exactly ${amount}, around ${date}.`,
  empty: 'No unreconciled transaction of this amount. Post the receipt or payment first.',
  batch: 'Payment batch',
  batchHint: 'The bank paid the whole file as this one debit.',
  choose: 'Match',
  cancel: 'Cancel',
} as const;

export const TRUST_RECON_ADJUSTMENT_COPY = {
  title: 'Reconciliation adjustments',
  intro:
    'A signed amount added to the bank statement balance, by hand with a reason. It counts from its date until you remove it. Nothing is posted to the cash book.',
  empty: 'No adjustments.',
  add: 'Add adjustment',
  addTitle: 'Add reconciliation adjustment',
  date: 'From date',
  amount: 'Amount (negative to take off)',
  reason: 'Reason',
  save: 'Add',
  added: 'Adjustment added',
  amountInvalid: 'Enter an amount that is not zero',
  reasonRequired: 'Give a reason',
  remove: 'Remove',
  removeTitle: 'Remove adjustment',
  removeDescription:
    'It stops counting from the date you give. Earlier dates and locked months keep it.',
  removeOn: 'Stops counting from',
  removeReason: 'Reason',
  removeSubmit: 'Remove',
  removed: 'Adjustment removed',
  active: 'In effect',
  removedOn: (date: string) => `Removed from ${date}`,
  from: (date: string) => `From ${date}`,
  cancel: 'Cancel',
} as const;

export const TRUST_RECONCILIATION_PHASE5_COPY = {
  adjustments: 'Adjustments',
  ofWhichCash: 'of which cash not banked',
  ofWhichNotProcessed: 'of which not processed',
  unreconciledItems: 'Not yet matched to the bank',
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  noItems: 'Everything is matched.',
  checkedAt: 'At the check',
  checkedDifference: (amount: string) => `Bank − cash book then: ${amount}`,
} as const;
