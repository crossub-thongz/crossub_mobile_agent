import type { components, operations } from '@crossub-thongz/api-contract';

import { TRUST_LEDGER_KIND, type TrustLedgerKind } from '@/constants/trust';

/**
 * Self-Manage manual trust transactions (Daniel 26 Oct 2026): the Transactions tab's "New
 * transaction" menu (receipt, withdrawal, journal) and the bank payments list, mirroring the staff
 * "Folio receipt / withdraw" and "Journal" dialogs (D101).
 */

type Schemas = components['schemas'];

export type TrustWithdrawalMethod = NonNullable<Schemas['ManualWithdrawalDto']['method']>;
export type TrustPaymentStatus = Schemas['TrustPaymentDto']['status'];
export type TrustPaymentStage = NonNullable<
  NonNullable<operations['AgentTrustTransactionsController_listPayments']['parameters']['query']>['stage']
>;

/** The API's limits on a manual transaction (TRUST_LIMITS on the API). */
export const TRUST_TRANSACTION_LIMITS = {
  descriptionMax: 200,
  partyNameMax: 160,
  referenceMax: 120,
  detailsMax: 200,
  payeeNameMax: 160,
  chequeNumberMax: 20,
  bpayBillerCodeMax: 10,
  bpayReferenceMax: 20,
} as const;

/** The "New transaction" menu: which dialog is showing. */
export const TRUST_NEW_TRANSACTION = {
  RECEIPT: 'RECEIPT',
  WITHDRAWAL: 'WITHDRAWAL',
  JOURNAL: 'JOURNAL',
} as const;
export type TrustNewTransaction = (typeof TRUST_NEW_TRANSACTION)[keyof typeof TRUST_NEW_TRANSACTION];

export const TRUST_NEW_TRANSACTION_OPTIONS: readonly {
  id: TrustNewTransaction;
  label: string;
  hint: string;
}[] = [
  { id: TRUST_NEW_TRANSACTION.RECEIPT, label: 'Receipt', hint: 'Money into the trust account, coded to one ledger' },
  { id: TRUST_NEW_TRANSACTION.WITHDRAWAL, label: 'Withdrawal', hint: 'Money out of one ledger by bank transfer, BPAY or cheque' },
  { id: TRUST_NEW_TRANSACTION.JOURNAL, label: 'Journal', hint: 'Move money between two ledgers; the bank balance does not change' },
];

/** D101: tenant money goes through Rent's receipt, so a receipt or withdrawal offers these ledgers. */
export const TRUST_FOLIO_MONEY_KINDS: readonly TrustLedgerKind[] = [
  TRUST_LEDGER_KIND.OWNER,
  TRUST_LEDGER_KIND.SUPPLIER,
  TRUST_LEDGER_KIND.AGENCY,
];

/** A journal moves money between any two open ledgers. */
export const TRUST_JOURNAL_KINDS: readonly TrustLedgerKind[] = [
  TRUST_LEDGER_KIND.OWNER,
  TRUST_LEDGER_KIND.TENANT,
  TRUST_LEDGER_KIND.SUPPLIER,
  TRUST_LEDGER_KIND.AGENCY,
];

export const TRUST_WITHDRAWAL_METHOD = {
  EFT: 'EFT',
  BPAY: 'BPAY',
  CHEQUE: 'CHEQUE',
} as const satisfies Record<string, TrustWithdrawalMethod>;

export const TRUST_WITHDRAWAL_METHODS: readonly TrustWithdrawalMethod[] = Object.values(TRUST_WITHDRAWAL_METHOD);

export const TRUST_WITHDRAWAL_METHOD_LABEL: Record<TrustWithdrawalMethod, string> = {
  EFT: 'Bank transfer',
  BPAY: 'BPAY',
  CHEQUE: 'Cheque',
};

export const TRUST_NEW_TRANSACTION_COPY = {
  button: 'New transaction',
  ledger: 'Ledger',
  chooseLedger: 'Choose a ledger',
  noLedgers: 'No open ledgers yet. Open one from Ledgers first.',
  balance: (amount: string) => `Balance ${amount}`,
  amount: 'Amount ($)',
  gst: 'GST included ($, optional)',
  accountCode: 'Account code (optional)',
  noAccountCode: 'No account code',
  date: 'Date',
  description: 'Description',
  details: 'Details (optional)',
  ledgerRequired: 'Choose the ledger',
  amountInvalid: 'Enter an amount above $0.00',
  gstInvalid: 'The GST must be a dollar amount no more than the amount',
  dateRequired: 'Pick the date',
  dateFuture: 'The date cannot be after today',
  descriptionRequired: 'Enter a description',
  tooLong: (field: string, max: number) => `Keep the ${field} to ${max} characters`,
  /** Field names inside `tooLong`. */
  field: {
    description: 'description',
    party: 'name it is from',
    details: 'details',
    payee: 'payee',
    chequeNumber: 'cheque number',
    note: 'note',
  },
  cancel: 'Cancel',
} as const;

export const TRUST_FOLIO_RECEIPT_COPY = {
  title: 'New receipt',
  description: 'Money into the trust account, coded to one owner, supplier or agency ledger. Tenant rent goes through Rent.',
  party: 'From (optional)',
  partyPlaceholder: 'Who the money is from',
  method: 'Method',
  descriptionPlaceholder: 'What this receipt is for',
  detailsPlaceholder: 'Shown on the ledger line',
  submit: 'Post receipt',
  done: (receiptNumber: number | null | undefined) =>
    receiptNumber != null ? `Receipt #${receiptNumber} posted` : 'Receipt posted',
} as const;

export const TRUST_FOLIO_WITHDRAWAL_COPY = {
  title: 'New withdrawal',
  description:
    'Money out of one ledger as one bank payment. Bank transfers and BPAY wait for the next bank file; a cheque is recorded with its number.',
  ledger: 'Withdraw from',
  overBalance: 'More than the ledger holds; the withdrawal will be refused.',
  useSaved: (payee: string, method: string, detail: string | null) =>
    `Pay to the saved payout details: ${payee}, ${method}${detail ? ` ${detail}` : ''}`,
  payee: 'Payee',
  payeePlaceholder: 'Name on the bank account',
  method: 'Pay by',
  bsb: 'BSB',
  accountNumber: 'Account number',
  billerCode: 'BPAY biller code',
  bpayReference: 'BPAY reference',
  chequeNumber: 'Cheque number',
  note: 'Note (optional)',
  notePlaceholder: 'Shown on the ledger line',
  payeeRequired: 'Enter the payee',
  bsbInvalid: 'Enter a 6-digit BSB, for example 062-000',
  accountNumberInvalid: 'Enter the account number (4 to 9 digits)',
  billerInvalid: 'The BPAY biller code is 3 to 10 digits',
  referenceInvalid: 'The BPAY reference is 2 to 20 digits',
  chequeRequired: 'Enter the cheque number',
  submit: (amount: string | null) => (amount ? `Withdraw ${amount}` : 'Withdraw'),
  done: (amount: string, status: string) => `Withdrawal of ${amount} recorded: ${status}`,
} as const;

export const TRUST_JOURNAL_COPY = {
  title: 'New journal',
  description: 'Move money from one ledger to another. The bank balance does not change.',
  from: 'From ledger',
  to: 'To ledger',
  chooseFrom: 'Choose the ledger the money comes from',
  chooseTo: 'Choose the ledger the money goes to',
  descriptionPlaceholder: 'What this journal is for',
  detailsPlaceholder: 'Shown on both ledger lines',
  bothRequired: 'Choose both ledgers',
  tooFew: 'A journal needs two open ledgers. Open them from Ledgers first.',
  sameLedger: 'The two ledgers must differ',
  submit: 'Post journal',
  done: (auditNumber: number) => `Journal #${auditNumber} posted`,
} as const;

export const TRUST_PAYMENT_STATUS = {
  POOLED: 'POOLED',
  FILED: 'FILED',
  RECORDED: 'RECORDED',
  REVERSED: 'REVERSED',
} as const satisfies Record<string, TrustPaymentStatus>;

export const TRUST_PAYMENT_STATUS_LABEL: Record<TrustPaymentStatus, string> = {
  POOLED: 'Waiting for bank file',
  FILED: 'In a bank file',
  RECORDED: 'Cheque recorded',
  REVERSED: 'Reversed',
};

export const TRUST_PAYMENT_STATUS_TONE: Record<TrustPaymentStatus, string> = {
  POOLED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  FILED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  RECORDED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  REVERSED: 'bg-muted text-muted-foreground',
};

export const TRUST_PAYMENT_STAGE = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const satisfies Record<string, TrustPaymentStage>;

/** The payments list's "every payment" chip. */
export const TRUST_PAYMENT_STAGE_ALL = 'ALL' as const;
export type TrustPaymentStageFilter = TrustPaymentStage | typeof TRUST_PAYMENT_STAGE_ALL;

export const TRUST_PAYMENT_STAGE_FILTERS: readonly { id: TrustPaymentStageFilter; label: string }[] = [
  { id: TRUST_PAYMENT_STAGE_ALL, label: 'All' },
  { id: TRUST_PAYMENT_STAGE.PENDING, label: 'Waiting' },
  { id: TRUST_PAYMENT_STAGE.COMPLETED, label: 'Done' },
];

export const TRUST_PAYMENTS_COPY = {
  title: 'Bank payments',
  empty: 'No bank payments here. Withdrawals, bill payments and disbursements are listed as they are made.',
  date: 'Date',
  payee: 'Payee',
  ledger: 'Ledger',
  method: 'Pay by',
  amount: 'Amount',
  status: 'Status',
  batch: (n: number) => `File #${n}`,
  cheque: (n: string) => `Cheque ${n}`,
  counts: (eft: number, bpay: number, cheque: number) =>
    `${eft} bank transfer${eft === 1 ? '' : 's'}, ${bpay} BPAY, ${cheque} cheque${cheque === 1 ? '' : 's'}`,
} as const;
