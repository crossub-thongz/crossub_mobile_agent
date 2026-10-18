import type { components, operations } from '@crossub-thongz/api-contract';

type Schemas = components['schemas'];

export type TrustLedgerKind = Schemas['TrustLedgerDto']['kind'];
export type TrustPaymentMethod = Schemas['PostTenantReceiptDto']['method'];
export type TrustReceiptAllocationKind = Schemas['TenantReceiptAllocationDto']['kind'];
export type TrustBillDisplayStatus = Schemas['TrustBillDto']['displayStatus'];
export type TrustBillStage = Schemas['TrustBillDto']['stage'];
export type TrustBillPriority = Schemas['CreateBillDto']['priority'];
export type TrustStatementEmailStatus = Schemas['AgentTrustStatementEmailDto']['status'];
export type TrustReconciliationStatus = Schemas['TrustReconciliationMonthDto']['status'];
export type TrustDisbursementBlockedReason = NonNullable<
  Schemas['TrustDisbursementCandidateDto']['blockedReason']
>;
export type TrustDisbursementKind = Schemas['DisburseDto']['kind'];
export type TrustDisbursementTab = NonNullable<
  NonNullable<
    operations['AgentTrustController_disbursementCandidates']['parameters']['query']
  >['tab']
>;

/** The API's 404 message when CROSSUB has not created the agency's trust workspace yet. */
export const TRUST_NOT_SET_UP_MARKER = 'not set up';

/** The API caps every trust list at this page size. */
export const TRUST_PAGE_SIZE_MAX = 100;

export const TRUST_TAB = {
  OVERVIEW: 'overview',
  LEDGERS: 'ledgers',
  RENT: 'rent',
  BILLS: 'bills',
  DISBURSE: 'disburse',
  RECONCILIATION: 'reconciliation',
} as const;

export type TrustTab = (typeof TRUST_TAB)[keyof typeof TRUST_TAB];

export const TRUST_TABS: readonly { id: TrustTab; label: string }[] = [
  { id: TRUST_TAB.OVERVIEW, label: 'Overview' },
  { id: TRUST_TAB.LEDGERS, label: 'Ledgers' },
  { id: TRUST_TAB.RENT, label: 'Rent' },
  { id: TRUST_TAB.BILLS, label: 'Bills' },
  { id: TRUST_TAB.DISBURSE, label: 'Disburse' },
  { id: TRUST_TAB.RECONCILIATION, label: 'Reconciliation' },
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
} as const satisfies Record<string, TrustDisbursementTab>;

export const TRUST_DISBURSEMENT_TABS: readonly { id: TrustDisbursementTab; label: string }[] = [
  { id: TRUST_DISBURSEMENT_TAB.DUE_OWNERS, label: 'Due owners' },
  { id: TRUST_DISBURSEMENT_TAB.ALL_OWNERS, label: 'All owners' },
];

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
  noSuppliers: 'No supplier ledgers yet. Ask CROSSUB to add the supplier.',
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

export const TRUST_DISBURSE_COPY = {
  searchPlaceholder: 'Search owner, code or address',
  empty: 'No owners to pay.',
  owner: 'Owner',
  property: 'Property',
  balance: 'Balance',
  billsDue: 'Bills due',
  available: 'To pay',
  nextDue: 'Next due',
  date: 'Disbursement date',
  selectAll: 'Select all payable',
  disburse: (count: number) => `Disburse ${count} owner${count === 1 ? '' : 's'}`,
  confirmTitle: 'Disburse to owners',
  confirmBody: (count: number) =>
    `Posts fees, pays due bills, pays out ${count} owner${count === 1 ? '' : 's'} and emails each owner their statement.`,
  confirm: 'Disburse',
  cancel: 'Cancel',
  noneSelected: 'Select at least one owner',
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
