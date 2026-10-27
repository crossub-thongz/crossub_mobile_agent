import type { operations } from '@crossub-thongz/api-contract';

/**
 * Self-Manage trust: adding a further trust bank account, the audit log and a ledger's balance
 * check (D135). The audit wording mirrors the staff web's Audit Log (D80).
 */

type AuditEventsQuery = NonNullable<
  operations['AgentTrustAuditController_auditEvents']['parameters']['query']
>;
export type TrustAuditAction = NonNullable<AuditEventsQuery['action']>;
export type TrustAuditEntityType = NonNullable<AuditEventsQuery['entityType']>;

// --------------------------------------------------------------------------- Add bank account

export const TRUST_ADD_BANK_ACCOUNT_COPY = {
  add: 'Add account',
  title: 'Add trust bank account',
  description: 'Another trust bank account for this agency, with the details its ABA bank files use.',
  submit: 'Add account',
  cancel: 'Cancel',
  added: 'Trust bank account added',
} as const;

// --------------------------------------------------------------------------- Audit log

/** The API's audit actions (TrustAuditAction), worded as on the staff web. */
export const TRUST_AUDIT_ACTION_LABEL: Record<TrustAuditAction, string> = {
  WORKSPACE_CREATED: 'Workspace created',
  WORKSPACE_UPDATED: 'Workspace updated',
  AGENCY_LINKED: 'Agency linked',
  AGENCY_UNLINKED: 'Agency unlinked',
  BANK_ACCOUNT_CREATED: 'Trust account created',
  BANK_ACCOUNT_UPDATED: 'Trust account updated',
  ACCOUNT_CODE_CREATED: 'Account code created',
  ACCOUNT_CODE_UPDATED: 'Account code updated',
  LEDGER_OPENED: 'Folio opened',
  LEDGER_UPDATED: 'Folio updated',
  LEDGER_CLOSED: 'Folio closed',
  LEDGER_BALANCE_REBUILT: 'Folio balance rebuilt',
  TRANSACTION_POSTED: 'Transaction posted',
  TRANSACTION_REVERSED: 'Transaction reversed',
  STATEMENT_IMPORTED: 'Bank statement imported',
  BANK_LINE_PROCESSED: 'Bank line processed',
  BANK_LINE_UNLINKED: 'Bank line unlinked',
  BANK_LINE_DISMISSED: 'Bank line dismissed',
  BANK_LINE_RESTORED: 'Bank line restored',
  RENT_PROFILE_SET: 'Rent set',
  RENT_RESET: 'Rent reset',
  PAYER_RULE_CREATED: 'Payer remembered',
  BILL_CREATED: 'Bill created',
  BILL_UPDATED: 'Bill updated',
  BILL_PAID: 'Bill paid',
  BILL_CANCELLED: 'Bill cancelled',
  INVOICE_CREATED: 'Invoice created',
  INVOICE_CANCELLED: 'Invoice cancelled',
  INVOICE_PAYMENT_ALLOCATED: 'Invoice payment allocated',
  FEE_SETTING_SET: 'Fee setting saved',
  FEE_CHARGE_CREATED: 'Fee raised',
  FEE_CHARGE_POSTED: 'Fee posted',
  FEE_CHARGE_WAIVED: 'Fee waived',
  PAYOUT_METHOD_SET: 'Payment methods saved',
  PAYOUT_SCHEDULE_SET: 'Payout schedule saved',
  WITHHOLD_CREATED: 'Amount withheld',
  WITHHOLD_RELEASED: 'Withheld amount released',
  PAYMENT_RECORDED: 'Payment recorded',
  PAYMENT_BATCH_CREATED: 'Bank file created',
  DISBURSEMENT_RUN: 'Disbursement run',
  STATEMENT_ISSUED: 'Owner statement issued',
  RECONCILIATION_LOCKED: 'Month locked',
  RECONCILIATION_REVOKED: 'Month approval revoked',
  BOND_RECORD_SET: 'Bond record saved',
  OWNER_CHANGED: 'Owner changed',
  WORKSPACE_MEMBER_ADDED: 'Member added',
  WORKSPACE_MEMBER_REMOVED: 'Member removed',
  BANK_BALANCE_RECORDED: 'Bank balance recorded',
  BANK_BALANCE_REMOVED: 'Bank balance removed',
};

/** The action filter's order: as the API enum reads (setup, posting, bank, bills, money out, control). */
export const TRUST_AUDIT_ACTION_ORDER = Object.keys(TRUST_AUDIT_ACTION_LABEL) as TrustAuditAction[];

/** The audit row's `entityType` values the app acts on. */
export const TRUST_AUDIT_ENTITY = {
  TRANSACTION: 'TrustTransaction',
} as const satisfies Record<string, TrustAuditEntityType>;

export const TRUST_AUDIT_ENTITY_LABEL: Record<TrustAuditEntityType, string> = {
  TrustWorkspace: 'Workspace',
  TrustWorkspaceAgency: 'Workspace agency',
  TrustBankAccount: 'Trust account',
  TrustAccountCode: 'Account code',
  TrustLedger: 'Folio',
  TrustTransaction: 'Transaction',
  TrustTenantRentProfile: 'Rent profile',
  TrustBankStatementImport: 'Statement import',
  TrustBankStatementLine: 'Bank line',
  TrustPayerRule: 'Payer rule',
  TrustBill: 'Bill',
  TrustTenantInvoice: 'Tenant invoice',
  TrustFeeSetting: 'Fee setting',
  TrustFeeCharge: 'Fee charge',
  TrustPayoutMethod: 'Payment method',
  TrustWithhold: 'Withheld',
  TrustPayment: 'Payment',
  TrustPaymentBatch: 'Bank file',
  TrustDisbursementRun: 'Disbursement',
  TrustOwnerStatement: 'Owner statement',
  TrustReconciliationLock: 'Reconciliation',
  TrustWorkspaceMember: 'Workspace member',
  TrustBankBalance: 'Bank balance',
};

export const TRUST_AUDIT_ENTITY_ORDER = Object.keys(TRUST_AUDIT_ENTITY_LABEL) as TrustAuditEntityType[];

/** The "every value" choice of the audit filter selects (sends no filter). */
export const TRUST_AUDIT_FILTER_ALL = 'ALL';

/** Events per page, as on the staff web. */
export const TRUST_AUDIT_PAGE_SIZE = 50;

/** How much of an entity id a row shows; the full id is in its title. */
export const TRUST_AUDIT_ENTITY_ID_SHORT = 8;

/** How many changed field names a summary names before "+N more". */
export const TRUST_AUDIT_SUMMARY_KEYS_MAX = 3;

export const TRUST_AUDIT_EMPTY_DISPLAY = '—';

export const TRUST_AUDIT_COPY = {
  title: 'Audit log',
  subtitle: 'Every accounting change in this workspace, newest first',
  when: 'When',
  who: 'Who',
  action: 'Action',
  entity: 'Entity',
  summary: 'Summary',
  allActions: 'All actions',
  allEntities: 'All entities',
  everyone: 'Everyone',
  from: 'From',
  to: 'To',
  clear: 'Clear',
  emptyTitle: 'No audit events',
  empty: 'No audit events match these filters.',
  rangeInvalid: 'Pick a from date on or before the to date.',
  before: 'Before',
  after: 'After',
  nothing: 'Nothing recorded',
  recorded: 'Recorded',
  changed: 'Changed',
  more: 'more',
  system: 'System',
  previous: 'Previous',
  next: 'Next',
  page: (page: number, pages: number) => `Page ${page} of ${pages}`,
} as const;

// --------------------------------------------------------------------------- Balance check

export const TRUST_BALANCE_CHECK_COPY = {
  check: 'Check balance',
  matches: (entries: number) => `Balance matches its ${entries} ${entries === 1 ? 'entry' : 'entries'}`,
  differs: (computed: string, entries: number, cached: string) =>
    `Entries add up to ${computed} (${entries} ${entries === 1 ? 'entry' : 'entries'}), the balance shows ${cached}. Ask CROSSUB to rebuild the balance.`,
} as const;
