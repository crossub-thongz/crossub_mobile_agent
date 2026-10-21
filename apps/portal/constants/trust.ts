import type { components, operations } from '@crossub-thongz/api-contract';

type Schemas = components['schemas'];

export type TrustLedgerKind = Schemas['TrustLedgerDto']['kind'];
export type TrustPaymentMethod = Schemas['PostTenantReceiptDto']['method'];
export type TrustReceiptAllocationKind = Schemas['TenantReceiptAllocationDto']['kind'];
export type TrustBillDisplayStatus = Schemas['TrustBillDto']['displayStatus'];
export type TrustBillStage = Schemas['TrustBillDto']['stage'];
export type TrustBillPriority = Schemas['CreateBillDto']['priority'];
export type TrustRentPeriod = Schemas['SetRentProfileDto']['rentPeriod'];
export type TrustStatementEmailStatus = Schemas['AgentTrustStatementEmailDto']['status'];
export type TrustReconciliationStatus = Schemas['TrustReconciliationMonthDto']['status'];
export type TrustDisbursementBlockedReason = NonNullable<
  Schemas['TrustDisbursementCandidateDto']['blockedReason']
>;
export type TrustDisbursementKind = Schemas['DisburseDto']['kind'];
export type TrustTransactionKind = Schemas['TrustTransactionDto']['kind'];
export type TrustTransactionDisplayStatus = Schemas['TrustTransactionDto']['displayStatus'];
export type TrustTransactionCategory = NonNullable<
  NonNullable<
    operations['AgentTrustController_listTransactions']['parameters']['query']
  >['category']
>;
export type TrustFeeChargeStatus = Schemas['TrustFeeChargeDto']['status'];
export type TrustBatchMethod = Schemas['CreatePaymentBatchDto']['method'];
export type TrustBankLineStatus = Schemas['TrustBankFileLineDto']['status'];
export type TrustReportKind =
  operations['AgentTrustController_reportCsv']['parameters']['path']['kind'];
export type TrustLedgerFileFormat =
  operations['AgentTrustController_ledgerFile']['parameters']['path']['format'];
export type TrustDisbursementTab = NonNullable<
  NonNullable<
    operations['AgentTrustController_disbursementCandidates']['parameters']['query']
  >['tab']
>;

/** The API's 404 message when CROSSUB has not created the agency's trust workspace yet. */
export const TRUST_NOT_SET_UP_MARKER = 'not set up';

/** The API caps every trust list at this page size. */
export const TRUST_PAGE_SIZE_MAX = 100;

/** The API's limits on what the agent app types into trust records. */
export const TRUST_INPUT_LIMITS = {
  ledgerNameMax: 160,
  rentNoteMax: 300,
} as const;

export const TRUST_TAB = {
  OVERVIEW: 'overview',
  LEDGERS: 'ledgers',
  TRANSACTIONS: 'transactions',
  RENT: 'rent',
  BILLS: 'bills',
  DISBURSE: 'disburse',
  BANK_FILES: 'bank-files',
  BANK_STATEMENT: 'bank-statement',
  RECONCILIATION: 'reconciliation',
  REPORTS: 'reports',
  SETTINGS: 'settings',
} as const;

export type TrustTab = (typeof TRUST_TAB)[keyof typeof TRUST_TAB];

export const TRUST_TABS: readonly { id: TrustTab; label: string }[] = [
  { id: TRUST_TAB.OVERVIEW, label: 'Overview' },
  { id: TRUST_TAB.LEDGERS, label: 'Ledgers' },
  { id: TRUST_TAB.TRANSACTIONS, label: 'Transactions' },
  { id: TRUST_TAB.RENT, label: 'Rent' },
  { id: TRUST_TAB.BILLS, label: 'Bills' },
  { id: TRUST_TAB.DISBURSE, label: 'Disburse' },
  { id: TRUST_TAB.BANK_FILES, label: 'Bank files' },
  { id: TRUST_TAB.BANK_STATEMENT, label: 'Bank statement' },
  { id: TRUST_TAB.RECONCILIATION, label: 'Reconciliation' },
  { id: TRUST_TAB.REPORTS, label: 'Reports' },
  { id: TRUST_TAB.SETTINGS, label: 'Settings' },
];

/** Chart-of-accounts code kinds: a bill takes an EXPENSE code. */
export const TRUST_ACCOUNT_CODE_KIND = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export const TRUST_LEDGER_KIND = {
  OWNER: 'OWNER',
  TENANT: 'TENANT',
  SUPPLIER: 'SUPPLIER',
  AGENCY: 'AGENCY',
} as const satisfies Record<string, TrustLedgerKind>;

export const TRUST_LEDGER_KIND_LABEL: Record<TrustLedgerKind, string> = {
  OWNER: 'Owner',
  TENANT: 'Tenant',
  SUPPLIER: 'Supplier',
  AGENCY: 'Agency',
};

/** The "every kind" chip on the ledgers list. */
export const TRUST_LEDGER_KIND_ALL = 'ALL' as const;
export type TrustLedgerKindFilter = TrustLedgerKind | typeof TRUST_LEDGER_KIND_ALL;

export const TRUST_LEDGER_KIND_FILTERS: readonly { id: TrustLedgerKindFilter; label: string }[] = [
  { id: TRUST_LEDGER_KIND_ALL, label: 'All' },
  { id: TRUST_LEDGER_KIND.OWNER, label: 'Owners' },
  { id: TRUST_LEDGER_KIND.TENANT, label: 'Tenants' },
  { id: TRUST_LEDGER_KIND.SUPPLIER, label: 'Suppliers' },
  { id: TRUST_LEDGER_KIND.AGENCY, label: 'Agency' },
];

export const TRUST_LEDGER_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const satisfies Record<string, Schemas['TrustLedgerDto']['status']>;

export const TRUST_PAYMENT_METHOD = {
  EFT: 'EFT',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  CARD: 'CARD',
  BPAY: 'BPAY',
} as const satisfies Record<string, TrustPaymentMethod>;

export const TRUST_PAYMENT_METHOD_LABEL: Record<TrustPaymentMethod, string> = {
  EFT: 'Bank transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  BPAY: 'BPAY',
};

export const TRUST_PAYMENT_METHODS: readonly TrustPaymentMethod[] = [
  TRUST_PAYMENT_METHOD.EFT,
  TRUST_PAYMENT_METHOD.CASH,
  TRUST_PAYMENT_METHOD.CHEQUE,
  TRUST_PAYMENT_METHOD.CARD,
  TRUST_PAYMENT_METHOD.BPAY,
];

export const TRUST_RECEIPT_ALLOCATION_KIND = {
  RENT: 'RENT',
  DEPOSIT: 'DEPOSIT',
  OTHER: 'OTHER',
  INVOICE: 'INVOICE',
} as const satisfies Record<string, TrustReceiptAllocationKind>;

/** What the receipt dialog offers: OTHER needs an income code, INVOICE an open invoice. */
export const TRUST_RECEIPT_KINDS: readonly { id: TrustReceiptAllocationKind; label: string }[] = [
  { id: TRUST_RECEIPT_ALLOCATION_KIND.RENT, label: 'Rent' },
  { id: TRUST_RECEIPT_ALLOCATION_KIND.DEPOSIT, label: 'Deposit (held on the tenant ledger)' },
];

export const TRUST_BILL_DISPLAY_STATUS = {
  PENDING: 'PENDING',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const satisfies Record<string, TrustBillDisplayStatus>;

export const TRUST_BILL_DISPLAY_STATUS_LABEL: Record<TrustBillDisplayStatus, string> = {
  PENDING: 'Pending',
  INSUFFICIENT_FUNDS: 'Not enough funds',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

export const TRUST_BILL_DISPLAY_STATUS_TONE: Record<TrustBillDisplayStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  INSUFFICIENT_FUNDS: 'bg-destructive/15 text-destructive',
  PAID: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  CANCELLED: 'bg-muted text-muted-foreground',
};

/** Bills tabs: the API's stage filter, plus every bill. */
export const TRUST_BILL_STAGE = {
  DUE: 'DUE',
  FUTURE: 'FUTURE',
  PAID: 'PAID',
} as const satisfies Record<string, TrustBillStage>;

export const TRUST_BILL_STAGE_ALL = 'ALL' as const;
export type TrustBillStageFilter =
  | (typeof TRUST_BILL_STAGE)[keyof typeof TRUST_BILL_STAGE]
  | typeof TRUST_BILL_STAGE_ALL;

export const TRUST_BILL_PRIORITY = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const satisfies Record<string, TrustBillPriority>;

export const TRUST_BILL_PRIORITY_LABEL: Record<TrustBillPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const TRUST_BILL_PRIORITIES: readonly TrustBillPriority[] = [
  TRUST_BILL_PRIORITY.NORMAL,
  TRUST_BILL_PRIORITY.HIGH,
  TRUST_BILL_PRIORITY.URGENT,
];

export const TRUST_DISBURSEMENT_KIND = {
  OWNER: 'OWNER',
  SUPPLIER: 'SUPPLIER',
} as const satisfies Record<string, TrustDisbursementKind>;

export const TRUST_DISBURSEMENT_TAB = {
  DUE_OWNERS: 'DUE_OWNERS',
  ALL_OWNERS: 'ALL_OWNERS',
  ALL_SUPPLIERS: 'ALL_SUPPLIERS',
} as const satisfies Record<string, TrustDisbursementTab>;

export const TRUST_DISBURSEMENT_TABS: readonly { id: TrustDisbursementTab; label: string }[] = [
  { id: TRUST_DISBURSEMENT_TAB.DUE_OWNERS, label: 'Due owners' },
  { id: TRUST_DISBURSEMENT_TAB.ALL_OWNERS, label: 'All owners' },
  { id: TRUST_DISBURSEMENT_TAB.ALL_SUPPLIERS, label: 'Suppliers' },
];

/** The run each Disburse tab starts: owner tabs pay owners, the supplier tab pays paid bills out to tradies. */
export const TRUST_DISBURSEMENT_KIND_FOR_TAB: Record<TrustDisbursementTab, TrustDisbursementKind> = {
  DUE_OWNERS: TRUST_DISBURSEMENT_KIND.OWNER,
  ALL_OWNERS: TRUST_DISBURSEMENT_KIND.OWNER,
  ALL_SUPPLIERS: TRUST_DISBURSEMENT_KIND.SUPPLIER,
};

export const TRUST_DISBURSEMENT_BLOCKED_LABEL: Record<TrustDisbursementBlockedReason, string> = {
  NO_PAYOUT_METHOD: 'No payout method',
  NOTHING_TO_PAY: 'Nothing to pay',
  LEDGER_CLOSED: 'Ledger closed',
  WRONG_KIND: 'Not an owner ledger',
  POSTING_FAILED: 'Posting failed',
};

export const TRUST_STATEMENT_EMAIL_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  NO_OWNER_EMAIL: 'NO_OWNER_EMAIL',
} as const satisfies Record<string, TrustStatementEmailStatus>;

export const TRUST_STATEMENT_EMAIL_STATUS_LABEL: Record<TrustStatementEmailStatus, string> = {
  SENT: 'Sent',
  FAILED: 'Failed',
  NO_OWNER_EMAIL: 'No owner email',
};

export const TRUST_STATEMENT_EMAIL_STATUS_TONE: Record<TrustStatementEmailStatus, string> = {
  SENT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  FAILED: 'bg-destructive/15 text-destructive',
  NO_OWNER_EMAIL: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

export const TRUST_BANK_ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const satisfies Record<string, Schemas['TrustBankAccountDto']['status']>;

/** A bank account's reconciliation as at its latest recorded bank balance. */
export const TRUST_BANK_RECONCILIATION_STATUS = {
  RECONCILED: 'RECONCILED',
  UNRECONCILED: 'UNRECONCILED',
} as const satisfies Record<string, Schemas['TrustBankAccountReconciliationDto']['status']>;

export const TRUST_RECONCILIATION_STATUS = {
  OPEN: 'OPEN',
  LOCKED: 'LOCKED',
} as const satisfies Record<string, TrustReconciliationStatus>;

export const TRUST_RECONCILIATION_STATUS_LABEL: Record<TrustReconciliationStatus, string> = {
  OPEN: 'Open',
  LOCKED: 'Locked',
};

export const TRUST_RECONCILIATION_STATUS_TONE: Record<TrustReconciliationStatus, string> = {
  OPEN: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  LOCKED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};

export const TRUST_PAGE_COPY = {
  title: 'Trust',
  agencyLabel: 'Agency',
  bankAccountLabel: 'Trust account',
  archived: 'archived',
  notSetUpTitle: "Trust isn't set up for this agency yet",
  notSetUpDescription: 'Ask CROSSUB to create the trust account.',
  loadFailed: "Couldn't load the trust account",
  retry: 'Try again',
  loading: 'Loading…',
  noMatches: 'Nothing matches.',
  pdfFailed: "Couldn't download the statement",
} as const;

export const TRUST_OVERVIEW_COPY = {
  cashBook: 'Cash book',
  ledgers: 'Ledger total',
  difference: 'Difference',
  reconciliation: 'Reconciliation',
  reconciled: 'Reconciled',
  unreconciled: 'Unreconciled',
  noBankBalance: 'No bank balance recorded',
  outBy: (amount: string) => `Out by ${amount}`,
  asAt: (date: string) => `As at ${date}`,
  lastLocked: (label: string) => `Last locked: ${label}`,
  nothingLocked: 'No month locked yet',
  monthsToLock: (count: number) => `${count} month${count === 1 ? '' : 's'} to lock`,
  today: 'Today',
  moneyIn: 'Money in',
  moneyOut: 'Money out',
  billsDue: 'Bills due',
  billsInsufficient: (count: number) => `${count} without enough funds`,
  ownersDue: 'Owners due a payout',
  ownersWithoutPayout: (count: number) => `${count} without a payout method`,
  invoicesOutstanding: 'Tenant invoices owing',
  invoicesOverdue: (count: number) => `${count} overdue`,
  ledgerCounts: 'Ledgers',
  recent: 'Recent transactions',
  noRecent: 'No transactions yet.',
} as const;

export const TRUST_LEDGERS_COPY = {
  searchPlaceholder: 'Search code, name or address',
  empty: 'No ledgers yet.',
  code: 'Code',
  name: 'Name',
  kind: 'Kind',
  property: 'Property',
  balance: 'Balance',
  back: 'All ledgers',
  entries: 'Entries',
  noEntries: 'No entries yet.',
  date: 'Date',
  details: 'Details',
  amount: 'Amount',
  runningBalance: 'Balance',
  statements: 'Owner statements',
  noStatements: 'No statements issued yet.',
  statementNumber: (n: number) => `Statement #${n}`,
  period: (from: string, to: string) => `${from} to ${to}`,
  closing: 'Closing',
  downloadPdf: 'PDF',
  emailOwner: 'Email owner',
  showing: (shown: number, total: number) => `Showing ${shown} of ${total}`,
  downloadCsv: 'CSV',
  downloadLedgerPdf: 'PDF',
  downloadFailed: "Couldn't download the ledger",
} as const;

export const TRUST_RENT_COPY = {
  searchPlaceholder: 'Search tenant, code or address',
  arrearsOnly: 'Arrears only',
  empty: 'No tenant ledgers yet.',
  collectedThisMonth: 'Collected this month',
  inArrears: 'In arrears',
  paidInAdvance: 'Paid in advance',
  noRentSetup: 'No rent set up',
  tenant: 'Tenant',
  property: 'Property',
  rent: 'Rent',
  paidTo: 'Paid to',
  arrears: 'Arrears',
  lastReceipt: 'Last receipt',
  receipt: 'Receipt',
  rentPer: (amount: string, period: string) => `${amount} ${period}`,
} as const;

export const TRUST_RENT_PERIOD_LABEL: Record<
  NonNullable<Schemas['TrustRentListRowDto']['rentPeriod']>,
  string
> = {
  WEEKLY: '/ wk',
  FORTNIGHTLY: '/ fn',
  MONTHLY: '/ mth',
};

export const TRUST_RENT_PERIOD = {
  WEEKLY: 'WEEKLY',
  FORTNIGHTLY: 'FORTNIGHTLY',
  MONTHLY: 'MONTHLY',
} as const satisfies Record<string, TrustRentPeriod>;

export const TRUST_RENT_PERIODS: readonly TrustRentPeriod[] = Object.values(TRUST_RENT_PERIOD);

export const TRUST_RENT_PERIOD_NAME: Record<TrustRentPeriod, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
};

export const TRUST_RENT_PROFILE_COPY = {
  setUp: 'Set rent',
  edit: 'Edit rent',
  title: (tenant: string) => `Rent for ${tenant}`,
  description:
    'Rent amount, how often it is due and the date it is paid to. Receipts move the paid-to date on from here.',
  amount: 'Rent ($)',
  period: 'Every',
  paidTo: 'Paid to',
  paidToHint: 'For a new tenancy, the day before move-in.',
  partPayment: 'Part payment held ($)',
  partPaymentHint: 'Money already received toward the next day. Leave 0 if none.',
  newRentAmount: 'New rent ($, optional)',
  newRentFrom: 'New rent from',
  note: 'Note (optional)',
  amountInvalid: 'Enter a rent amount above $0.00',
  paidToRequired: 'Pick the paid-to date',
  partPaymentInvalid: 'Enter a part payment of $0.00 or more',
  newRentIncomplete: 'Enter both the new rent and the date it starts, or neither',
  newRentAfterPaidTo: 'The new rent must start after the paid-to date',
  submit: 'Save rent',
  cancel: 'Cancel',
  saved: 'Rent saved',
} as const;

export const TRUST_SUPPLIER_COPY = {
  add: 'Add supplier',
  title: 'Add supplier',
  description: 'A tradie or utility you pay bills to from owner ledgers. Payout details are set up by CROSSUB.',
  name: 'Supplier name',
  nameRequired: 'Enter the supplier name',
  submit: 'Add supplier',
  cancel: 'Cancel',
  added: (name: string) => `${name} added`,
} as const;

export const TRUST_RECEIPT_COPY = {
  title: 'Receipt money',
  description: (tenant: string) => `From ${tenant}. Rent goes to the owner ledger.`,
  kind: 'What for',
  amount: 'Amount ($)',
  date: 'Date received',
  method: 'Method',
  reference: 'Reference (optional)',
  amountInvalid: 'Enter an amount above $0.00',
  dateRequired: 'Pick the date received',
  submit: 'Receipt',
  cancel: 'Cancel',
  done: (receiptNumber: number | null | undefined) =>
    receiptNumber != null ? `Receipt #${receiptNumber} posted` : 'Receipt posted',
} as const;

export const TRUST_BILLS_COPY = {
  searchPlaceholder: 'Search bill, supplier, owner or property',
  newBill: 'New bill',
  empty: 'No bills here.',
  all: 'All',
  due: 'Due',
  future: 'Future',
  paid: 'Paid',
  number: 'Bill',
  supplier: 'Supplier',
  owner: 'Owner',
  dueDate: 'Due',
  amount: 'Amount',
  status: 'Status',
  pay: 'Pay',
  shortfall: (amount: string) => `Short ${amount}`,
} as const;

export const TRUST_NEW_BILL_COPY = {
  title: 'New bill',
  description: "Enter a supplier's bill against an owner ledger. It is paid on the next disbursement, or now with Pay.",
  owner: 'Owner ledger',
  supplier: 'Supplier',
  category: 'Category',
  chooseOwner: 'Choose an owner',
  chooseSupplier: 'Choose a supplier',
  chooseCategory: 'Choose a category',
  noSuppliers: 'No supplier ledgers yet. Add the supplier first.',
  noCategories: 'No expense categories are set up on this trust account. Ask CROSSUB to add them.',
  billDate: 'Bill date',
  dueDate: 'Due date (optional)',
  details: 'Details',
  invoiceReference: 'Supplier invoice no. (optional)',
  amount: 'Amount incl. GST ($)',
  priority: 'Priority',
  incomplete: 'Fill in the owner, supplier, category, details and amount',
  submit: 'Save bill',
  cancel: 'Cancel',
  saved: (billNumber: number) => `Bill #${billNumber} saved`,
} as const;

export const TRUST_PAY_BILL_COPY = {
  title: (billNumber: number) => `Pay bill #${billNumber}`,
  description: (amount: string, supplier: string) => `${amount} to ${supplier} from the owner ledger.`,
  date: 'Payment date',
  submit: 'Pay now',
  cancel: 'Cancel',
  paid: (billNumber: number) => `Bill #${billNumber} paid`,
} as const;

/** Disburse copy that names who is paid. Suppliers are paid out with no statement. */
export const TRUST_DISBURSE_PARTY_COPY: Record<
  TrustDisbursementKind,
  {
    party: string;
    searchPlaceholder: string;
    empty: string;
    disburse: (count: number) => string;
    confirmTitle: string;
    confirmBody: (count: number) => string;
    noneSelected: string;
  }
> = {
  OWNER: {
    party: 'Owner',
    searchPlaceholder: 'Search owner, code or address',
    empty: 'No owners to pay.',
    disburse: (count) => `Disburse ${count} owner${count === 1 ? '' : 's'}`,
    confirmTitle: 'Disburse to owners',
    confirmBody: (count) =>
      `Posts fees, pays due bills, pays out ${count} owner${count === 1 ? '' : 's'} and emails each owner their statement.`,
    noneSelected: 'Select at least one owner',
  },
  SUPPLIER: {
    party: 'Supplier',
    searchPlaceholder: 'Search supplier or code',
    empty: 'No suppliers to pay.',
    disburse: (count) => `Pay ${count} supplier${count === 1 ? '' : 's'}`,
    confirmTitle: 'Pay suppliers',
    confirmBody: (count) =>
      `Pays out the paid bills held for ${count} supplier${count === 1 ? '' : 's'}. They go on the next bank file.`,
    noneSelected: 'Select at least one supplier',
  },
};

export const TRUST_DISBURSE_COPY = {
  property: 'Property',
  balance: 'Balance',
  billsDue: 'Bills due',
  available: 'To pay',
  nextDue: 'Next due',
  date: 'Disbursement date',
  selectAll: 'Select all payable',
  confirm: 'Disburse',
  cancel: 'Cancel',
  resultTitle: (runNumber: number) => `Disbursement run #${runNumber}`,
  resultSummary: (paid: number, skipped: number, payout: string) =>
    `${paid} paid, ${skipped} skipped, ${payout} paid out.`,
  statementEmails: 'Owner statements',
  noStatements: 'No statements were issued in this run.',
  dismiss: 'Dismiss',
} as const;

export const TRUST_STATEMENT_EMAIL_COPY = {
  resend: 'Resend',
  sent: (email: string | null) => (email ? `Statement emailed to ${email}` : 'Statement emailed'),
  noOwnerEmail: 'The owner has no email address. Download the PDF and send it yourself.',
  failed: "The email didn't send. Try again.",
} as const;

export const TRUST_RECONCILIATION_COPY = {
  months: 'Months',
  noMonths: 'No months yet.',
  monthToLock: (label: string) => `Next to lock: ${label}`,
  lockedBy: (name: string | null | undefined, at: string) =>
    name ? `Locked by ${name} on ${at}` : `Locked on ${at}`,
  asAt: (date: string) => `As at ${date}`,
  bank: 'Bank',
  statementBalance: 'Bank statement balance',
  suggested: (amount: string) => `Balances at ${amount}`,
  unpresentedDeposits: 'Deposits not yet on the statement',
  unpresentedWithdrawals: 'Withdrawals not yet on the statement',
  reconciledBalance: 'Reconciled bank balance',
  cashBook: 'Cash book',
  broughtForward: 'Brought forward',
  receipts: (count: number) => `Receipts (${count})`,
  withdrawals: (count: number) => `Withdrawals (${count})`,
  closing: 'Closing',
  folios: 'Ledger total',
  result: 'Result',
  reconciled: 'Reconciled',
  outBy: (amount: string) => `Out by ${amount}`,
  bankVsCashBook: 'Bank vs cash book',
  cashBookVsFolios: 'Cash book vs ledgers',
  enterBalance: 'Enter the statement balance to check',
  recordTitle: 'Record bank balance',
  recordDate: 'Statement date',
  recordAmount: 'Balance ($, may be negative)',
  recordNote: 'Note (optional)',
  record: 'Record balance',
  recorded: 'Bank balance recorded',
  recordedBalance: (amount: string) => `Recorded balance: ${amount}`,
  lock: 'Lock month',
  lockTitle: (label: string) => `Lock ${label}`,
  lockBody:
    'Locking freezes these figures and stops anything being posted on or before the month end.',
  lockNote: 'Note (optional)',
  locked: (label: string) => `${label} locked`,
  balanceInvalid: 'Enter the balance in dollars, e.g. 1250.00',
  dateRequired: 'Pick the statement date',
  cancel: 'Cancel',
} as const;

// --------------------------------------------------------------------------- Transactions

export const TRUST_TRANSACTION_KIND_LABEL: Record<TrustTransactionKind, string> = {
  RECEIPT: 'Receipt',
  WITHDRAWAL: 'Withdrawal',
  JOURNAL: 'Journal',
  OPENING: 'Opening balance',
};

export const TRUST_TRANSACTION_DISPLAY_STATUS = {
  POSTED: 'POSTED',
  REVERSED: 'REVERSED',
} as const satisfies Record<string, TrustTransactionDisplayStatus>;

export const TRUST_TRANSACTION_DISPLAY_STATUS_LABEL: Record<TrustTransactionDisplayStatus, string> = {
  POSTED: 'Posted',
  REVERSED: 'Reversed',
};

export const TRUST_TRANSACTION_DISPLAY_STATUS_TONE: Record<TrustTransactionDisplayStatus, string> = {
  POSTED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  REVERSED: 'bg-muted text-muted-foreground',
};

export const TRUST_TRANSACTION_CATEGORY = {
  MONEY_IN: 'MONEY_IN',
  MONEY_OUT: 'MONEY_OUT',
  JOURNALS_AND_REVERSALS: 'JOURNALS_AND_REVERSALS',
} as const satisfies Record<string, TrustTransactionCategory>;

export const TRUST_TRANSACTION_CATEGORY_ALL = 'ALL' as const;
export type TrustTransactionCategoryFilter =
  | TrustTransactionCategory
  | typeof TRUST_TRANSACTION_CATEGORY_ALL;

export const TRUST_TRANSACTION_CATEGORY_FILTERS: readonly {
  id: TrustTransactionCategoryFilter;
  label: string;
}[] = [
  { id: TRUST_TRANSACTION_CATEGORY_ALL, label: 'All' },
  { id: TRUST_TRANSACTION_CATEGORY.MONEY_IN, label: 'Money in' },
  { id: TRUST_TRANSACTION_CATEGORY.MONEY_OUT, label: 'Money out' },
  { id: TRUST_TRANSACTION_CATEGORY.JOURNALS_AND_REVERSALS, label: 'Journals and reversals' },
];

export const TRUST_TRANSACTIONS_COPY = {
  searchPlaceholder: 'Search description, party or reference',
  from: 'From',
  to: 'To',
  empty: 'No transactions here.',
  audit: 'No.',
  date: 'Date',
  kind: 'Type',
  description: 'Description',
  method: 'Method',
  amount: 'Amount',
  status: 'Status',
  reconciled: 'On statement',
  notReconciled: 'Not on statement',
  receiptNumber: (n: number) => `Receipt #${n}`,
  auditNumber: (n: number) => `#${n}`,
  detailTitle: (n: number) => `Transaction #${n}`,
  entries: 'Ledger entries',
  ledger: 'Ledger',
  details: 'Details',
  party: 'Party',
  reference: 'Reference',
  postedBy: 'Posted by',
  bankLine: 'Bank statement line',
  bill: (n: number) => `Bill #${n}`,
  reversalOf: 'Reverses an earlier transaction',
  reversedReason: (reason: string) => `Reversed: ${reason}`,
  reverse: 'Reverse',
  close: 'Close',
} as const;

export const TRUST_REVERSE_COPY = {
  title: (n: number) => `Reverse transaction #${n}`,
  description:
    'Posts the opposite entries, rolls back any rent paid-to date and unmatches its bank line. This cannot be undone.',
  reason: 'Reason',
  reasonRequired: 'Give a reason',
  submit: 'Reverse',
  cancel: 'Cancel',
  done: (n: number) => `Transaction #${n} reversed`,
} as const;

// --------------------------------------------------------------------------- Fee charges

export const TRUST_FEE_CHARGE_STATUS = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  REVERSED: 'REVERSED',
  WAIVED: 'WAIVED',
} as const satisfies Record<string, TrustFeeChargeStatus>;

export const TRUST_FEE_CHARGE_STATUS_LABEL: Record<TrustFeeChargeStatus, string> = {
  PENDING: 'Pending',
  POSTED: 'Posted',
  REVERSED: 'Reversed',
  WAIVED: 'Waived',
};

export const TRUST_FEE_CHARGE_STATUS_TONE: Record<TrustFeeChargeStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  POSTED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  REVERSED: 'bg-muted text-muted-foreground',
  WAIVED: 'bg-muted text-muted-foreground',
};

export const TRUST_FEES_COPY = {
  title: 'Fees',
  empty: 'No fees charged yet.',
  charge: 'Charge fee',
  postPending: 'Post pending',
  pending: (amount: string, count: number) => `${amount} pending (${count})`,
  postedThisMonth: (amount: string) => `${amount} posted this month`,
  postedResult: (posted: number, stillPending: number) =>
    `${posted} posted, ${stillPending} still pending`,
  waive: 'Waive',
  date: 'Date',
  fee: 'Fee',
  amount: 'Amount',
  status: 'Status',
} as const;

export const TRUST_NEW_FEE_COPY = {
  title: 'Charge a fee',
  description: 'A one-off fee on this owner ledger. It posts now if the owner has the funds, otherwise it waits.',
  name: 'Fee name',
  amount: 'Amount ($)',
  gstInclusive: 'Amount includes GST',
  category: 'Income category',
  chooseCategory: 'Choose a category',
  noCategories: 'No income categories are set up on this trust account. Ask CROSSUB to add them.',
  date: 'Charge date',
  incomplete: 'Fill in the name, amount, category and date',
  submit: 'Charge fee',
  cancel: 'Cancel',
  done: 'Fee charged',
} as const;

export const TRUST_WAIVE_FEE_COPY = {
  title: (name: string) => `Waive ${name}`,
  description: 'The owner will not be charged this fee.',
  reason: 'Reason',
  reasonRequired: 'Give a reason',
  submit: 'Waive fee',
  cancel: 'Cancel',
  done: 'Fee waived',
} as const;

// --------------------------------------------------------------------------- Bank files (ABA)

export const TRUST_BATCH_METHOD = {
  EFT: 'EFT',
  BPAY: 'BPAY',
} as const satisfies Record<string, TrustBatchMethod>;

export const TRUST_BATCH_METHOD_LABEL: Record<TrustBatchMethod, string> = {
  EFT: 'ABA (bank transfer)',
  BPAY: 'BPAY',
};

export const TRUST_BANK_FILES_COPY = {
  pool: 'Waiting for a bank file',
  poolCount: (count: number, amount: string) =>
    `${count} payment${count === 1 ? '' : 's'}, ${amount}`,
  lastFile: (n: number, date: string) => `Last file #${n} on ${date}`,
  chequeCount: (count: number) => `${count} cheque${count === 1 ? '' : 's'} recorded`,
  abaNotReady: 'An ABA file cannot be built yet. Ask CROSSUB to complete:',
  createAba: 'Create ABA file',
  createBpay: 'Create BPAY file',
  processingDate: 'Processing date',
  created: (n: number) => `Bank file #${n} created`,
  batches: 'Bank files',
  empty: 'No bank files yet. Disbursements and bill payments by bank transfer wait here until you create one.',
  number: 'File',
  method: 'Type',
  payments: 'Payments',
  total: 'Total',
  createdAt: 'Created',
  file: 'File',
  report: 'Report',
  downloadFailed: "Couldn't download the file",
  detailTitle: (n: number) => `Bank file #${n}`,
  payee: 'Payee',
  ledger: 'Ledger',
  account: 'Account',
  amount: 'Amount',
  close: 'Close',
} as const;

// --------------------------------------------------------------------------- Bank statement

export const TRUST_BANK_FILE = {
  /** QIF is the format the staff bank file read supports. */
  ACCEPT: '.qif,application/qif,text/plain',
  DEFAULT_MIME_TYPE: 'application/qif',
  MAX_BYTES: 2 * 1024 * 1024,
} as const;

export const TRUST_BANK_LINE_STATUS = {
  UNMATCHED: 'UNMATCHED',
  MATCHED: 'MATCHED',
  PROCESSED: 'PROCESSED',
  DISMISSED: 'DISMISSED',
} as const satisfies Record<string, TrustBankLineStatus>;

export const TRUST_BANK_LINE_STATUS_LABEL: Record<TrustBankLineStatus, string> = {
  UNMATCHED: 'Unmatched',
  MATCHED: 'Suggested match',
  PROCESSED: 'Reconciled',
  DISMISSED: 'Dismissed',
};

export const TRUST_BANK_LINE_STATUS_TONE: Record<TrustBankLineStatus, string> = {
  UNMATCHED: 'bg-destructive/15 text-destructive',
  MATCHED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  PROCESSED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  DISMISSED: 'bg-muted text-muted-foreground',
};

export const TRUST_BANK_LINE_FILTER_ALL = 'ALL' as const;
export type TrustBankLineFilter = TrustBankLineStatus | typeof TRUST_BANK_LINE_FILTER_ALL;

export const TRUST_BANK_STATEMENT_COPY = {
  intro:
    'Import the bank statement as a QIF file. Nothing in the file is stored: only the lines you reconcile are kept.',
  choose: 'Import QIF file',
  reread: 'Read again',
  tooLarge: 'The file is larger than 2 MB',
  readFailed: "Couldn't read the bank statement",
  summary: (lines: number, from: string, to: string) => `${lines} lines, ${from} to ${to}`,
  skipped: (count: number) => `${count} before the account opened were left out`,
  all: 'All',
  unmatched: 'Unmatched',
  matched: 'Suggested',
  reconciled: 'Reconciled',
  empty: 'No lines here.',
  date: 'Date',
  memo: 'Statement text',
  amount: 'Amount',
  status: 'Status',
  match: 'Match',
  suggestionTenant: (name: string, address: string | null) =>
    address ? `Rent from ${name}, ${address}` : `Rent from ${name}`,
  suggestionTransaction: (n: number, description: string) => `#${n} ${description}`,
  amountDiffers: 'Amount differs from the rent',
  reconciledTo: (n: number, description: string) => `#${n} ${description}`,
  processOne: 'Accept',
  link: 'Match',
  unlink: 'Unmatch',
  processAll: (count: number) => `Accept all suggested (${count})`,
  processed: (count: number) => `${count} line${count === 1 ? '' : 's'} reconciled`,
  failed: (count: number) => `${count} line${count === 1 ? '' : 's'} could not be reconciled`,
  unlinked: 'Bank line unmatched',
  linked: 'Bank line matched',
} as const;

export const TRUST_LINK_LINE_COPY = {
  title: 'Match bank line',
  description: (amount: string, date: string) =>
    `Posted transactions of ${amount} not yet on a statement, around ${date}.`,
  empty: 'No posted transaction of this amount is waiting. Post the receipt or payment first.',
  choose: 'Match',
  cancel: 'Cancel',
} as const;

/** How many days either side of a bank line to look for its transaction. */
export const TRUST_LINK_LINE_WINDOW_DAYS = 31;

// --------------------------------------------------------------------------- Reports

export const TRUST_REPORT_KIND = {
  RECEIPTS: 'receipts',
  WITHDRAWALS: 'withdrawals',
  FOLIO_BALANCES: 'folio-balances',
  UNPRESENTED_PAYMENTS: 'unpresented-payments',
} as const satisfies Record<string, TrustReportKind>;

export const TRUST_REPORT_KINDS: readonly { id: TrustReportKind; label: string }[] = [
  { id: TRUST_REPORT_KIND.RECEIPTS, label: 'Receipts' },
  { id: TRUST_REPORT_KIND.WITHDRAWALS, label: 'Withdrawals' },
  { id: TRUST_REPORT_KIND.FOLIO_BALANCES, label: 'Ledger balances' },
  { id: TRUST_REPORT_KIND.UNPRESENTED_PAYMENTS, label: 'Unpresented payments' },
];

/** Reports over a period (from and to); the rest are as at one date. */
export const TRUST_PERIOD_REPORT_KINDS: readonly TrustReportKind[] = [
  TRUST_REPORT_KIND.RECEIPTS,
  TRUST_REPORT_KIND.WITHDRAWALS,
];

export const TRUST_REPORTS_COPY = {
  from: 'From',
  to: 'To',
  asOf: 'As at',
  downloadCsv: 'Download CSV',
  downloadFailed: "Couldn't download the report",
  total: 'Total',
  rows: (count: number) => `${count} row${count === 1 ? '' : 's'}`,
  truncated: 'Too many rows to show. Download the CSV for the full report.',
  empty: 'Nothing in this report.',
  date: 'Date',
  audit: 'No.',
  description: 'Description',
  party: 'Party',
  method: 'Method',
  reference: 'Reference',
  amount: 'Amount',
  reversal: 'Reversal',
  code: 'Code',
  name: 'Name',
  kind: 'Kind',
  property: 'Property',
  balance: 'Balance',
  payee: 'Payee',
  days: 'Days',
} as const;

export const TRUST_LEDGER_FILE_FORMAT = {
  CSV: 'csv',
  PDF: 'pdf',
} as const satisfies Record<string, TrustLedgerFileFormat>;

// --------------------------------------------------------------------------- Settings summary

export const TRUST_SETTINGS_SUMMARY_COPY = {
  title: 'Trust account settings',
  description:
    'CROSSUB sets up and maintains your trust bank accounts and account codes. Contact CROSSUB to change them.',
  bankAccounts: 'Trust bank accounts',
  noBankAccounts: 'No trust bank account yet.',
  accountCodes: 'Account codes',
  noAccountCodes: 'No account codes yet.',
  bsb: 'BSB',
  account: 'Account',
  status: 'Status',
  code: 'Code',
  name: 'Name',
  kind: 'Kind',
  gst: 'GST',
  gstApplies: 'Yes',
  gstNone: 'No',
  inactive: 'inactive',
  openTrust: 'Open Trust',
} as const;

export const TRUST_ACCOUNT_CODE_KIND_LABEL: Record<
  Schemas['TrustAccountCodeDto']['kind'],
  string
> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
};
