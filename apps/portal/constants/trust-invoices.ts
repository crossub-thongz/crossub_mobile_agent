import type { components, operations } from '@crossub-thongz/api-contract';

import { TRUST_RECEIPT_ALLOCATION_KIND, type TrustReceiptAllocationKind } from '@/constants/trust';

type Schemas = components['schemas'];

/**
 * Self-Manage tenant invoices and the rent extras (the agent Trust page): tenant invoices on
 * Bills, the Bills tiles, the open-invoice picker on a receipt, a tenant's history, a folio's
 * month summary and moving a held deposit to rent.
 */

export type TrustInvoiceStatus = Schemas['TrustTenantInvoiceDto']['status'];
export type TrustInvoiceDisplayStatus = Schemas['TrustTenantInvoiceDto']['displayStatus'];
export type TrustInvoiceFilter = NonNullable<
  NonNullable<operations['AgentTrustInvoicesController_listInvoices']['parameters']['query']>['status']
>;
export type TrustTenantHistoryRowKind = Schemas['TrustTenantHistoryRowDto']['rowKind'];
export type TrustTenantHistoryStatus = NonNullable<Schemas['TrustTenantHistoryRowDto']['displayStatus']>;
export type TrustAttachmentMimeType = Schemas['TrustAttachmentBodyDto']['mimeType'];

export const TRUST_INVOICE_STATUS = {
  UNPAID: 'UNPAID',
  PART_PAID: 'PART_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const satisfies Record<string, TrustInvoiceStatus>;

export const TRUST_INVOICE_DISPLAY_STATUS_LABEL: Record<TrustInvoiceDisplayStatus, string> = {
  UNPAID: 'Unpaid',
  PART_PAID: 'Part paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  OVERDUE: 'Overdue',
};

export const TRUST_INVOICE_DISPLAY_STATUS_TONE: Record<TrustInvoiceDisplayStatus, string> = {
  UNPAID: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  PART_PAID: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  PAID: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  CANCELLED: 'bg-muted text-muted-foreground',
  OVERDUE: 'bg-destructive/15 text-destructive',
};

/** The API's invoice filters this app uses: the Bills tabs, and Cancelled on a tenant folio. */
export const TRUST_INVOICE_FILTER = {
  DUE: 'DUE',
  FUTURE: 'FUTURE',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const satisfies Record<string, TrustInvoiceFilter>;

export const TRUST_INVOICE_FILTER_ALL = 'ALL' as const;
export type TrustInvoiceStageFilter =
  | typeof TRUST_INVOICE_FILTER.DUE
  | typeof TRUST_INVOICE_FILTER.FUTURE
  | typeof TRUST_INVOICE_FILTER.PAID
  | typeof TRUST_INVOICE_FILTER_ALL;

/** A tenant folio's invoices: the open ones (the receipt picker), or the cancelled ones. */
export const TRUST_FOLIO_INVOICE_VIEW = {
  OPEN: 'OPEN',
  CANCELLED: 'CANCELLED',
} as const;
export type TrustFolioInvoiceView = (typeof TRUST_FOLIO_INVOICE_VIEW)[keyof typeof TRUST_FOLIO_INVOICE_VIEW];

/** The Bills tab shows owner bills or tenant invoices. */
export const TRUST_BILLS_VIEW = {
  BILLS: 'BILLS',
  INVOICES: 'INVOICES',
} as const;
export type TrustBillsView = (typeof TRUST_BILLS_VIEW)[keyof typeof TRUST_BILLS_VIEW];

export const TRUST_BILLS_VIEWS: readonly { id: TrustBillsView; label: string }[] = [
  { id: TRUST_BILLS_VIEW.BILLS, label: 'Owner bills' },
  { id: TRUST_BILLS_VIEW.INVOICES, label: 'Tenant invoices' },
];

/** Who a tenant invoice pays: the property's owner, or a supplier. */
export const TRUST_INVOICE_FROM = {
  OWNER: 'OWNER',
  SUPPLIER: 'SUPPLIER',
} as const;
export type TrustInvoiceFrom = (typeof TRUST_INVOICE_FROM)[keyof typeof TRUST_INVOICE_FROM];

export const TRUST_INVOICE_FROM_OPTIONS: readonly { id: TrustInvoiceFrom; label: string }[] = [
  { id: TRUST_INVOICE_FROM.OWNER, label: 'From owner' },
  { id: TRUST_INVOICE_FROM.SUPPLIER, label: 'From supplier' },
];

/** D123: a new invoice is dated today and due this many days later unless changed. */
export const TRUST_INVOICE_DUE_DAYS = 21;

/** The API's limits on a tenant invoice. */
export const TRUST_INVOICE_LIMITS = {
  detailsMax: 300,
  periodMax: 120,
  attachmentBytesMax: 10 * 1024 * 1024,
} as const;

export const TRUST_ATTACHMENT_MIME_TYPES: readonly TrustAttachmentMimeType[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

/** The receipt dialog's kinds once invoices are offered: an INVOICE pays one open invoice. */
export const TRUST_RECEIPT_KINDS_WITH_INVOICE: readonly { id: TrustReceiptAllocationKind; label: string }[] = [
  { id: TRUST_RECEIPT_ALLOCATION_KIND.RENT, label: 'Rent' },
  { id: TRUST_RECEIPT_ALLOCATION_KIND.DEPOSIT, label: 'Deposit (held on the tenant ledger)' },
  { id: TRUST_RECEIPT_ALLOCATION_KIND.INVOICE, label: 'An open invoice' },
];

export const TRUST_TENANT_HISTORY_ROW_KIND = {
  RENT_RECEIPT: 'RENT_RECEIPT',
  DEPOSIT_RECEIPT: 'DEPOSIT_RECEIPT',
  DEPOSIT_TRANSFER: 'DEPOSIT_TRANSFER',
  OTHER_RECEIPT: 'OTHER_RECEIPT',
  RENT_EVENT: 'RENT_EVENT',
  INVOICE_PAYMENT: 'INVOICE_PAYMENT',
} as const satisfies Record<string, TrustTenantHistoryRowKind>;

export const TRUST_TENANT_HISTORY_STATUS = {
  POSTED: 'POSTED',
  REVERSED: 'REVERSED',
} as const satisfies Record<string, TrustTenantHistoryStatus>;

export const TRUST_TENANT_HISTORY_STATUS_LABEL: Record<TrustTenantHistoryStatus, string> = {
  POSTED: 'Posted',
  REVERSED: 'Reversed',
};

export const TRUST_TENANT_HISTORY_STATUS_TONE: Record<TrustTenantHistoryStatus, string> = {
  POSTED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  REVERSED: 'bg-muted text-muted-foreground',
};

/** Wait this long after typing before asking the API for a preview. */
export const TRUST_PREVIEW_DEBOUNCE_MS = 300;

// --------------------------------------------------------------------------- Copy

export const TRUST_BILLS_SUMMARY_COPY = {
  readyToPay: 'Ready to pay',
  insufficient: 'Not enough funds',
  billsDue: 'Bills due',
  invoicesOutstanding: 'Invoices outstanding',
  invoicesOverdue: 'Overdue invoices',
  invoicesNotYetDue: 'Not yet due',
} as const;

export const TRUST_INVOICES_COPY = {
  searchPlaceholder: 'Search invoice, tenant, owner or supplier',
  newInvoice: 'New invoice',
  empty: 'No invoices here.',
  all: 'All',
  due: 'Due',
  future: 'Future',
  paid: 'Paid',
  number: 'Invoice',
  tenant: 'Tenant',
  from: 'From',
  dueDate: 'Due',
  amount: 'Amount',
  outstanding: 'Owing',
  status: 'Status',
  view: 'View',
  attachment: 'Attachment',
  attachmentFailed: "Couldn't open the attachment",
  owingOf: (outstanding: string, amount: string) => `${outstanding} of ${amount}`,
} as const;

export const TRUST_NEW_INVOICE_COPY = {
  title: 'New invoice',
  description: 'Money the tenant owes the owner or a supplier. The tenant pays it through a receipt, part payments allowed.',
  tenant: 'Tenant ledger',
  chooseTenant: 'Choose a tenant',
  noTenants: 'No open tenant ledgers yet.',
  from: 'Paid to',
  owner: 'Owner ledger',
  chooseOwner: 'Choose the owner',
  noOwnerOnProperty: 'No open owner ledger on this property.',
  supplier: 'Supplier',
  chooseSupplier: 'Choose a supplier',
  noSuppliers: 'No supplier ledgers yet. Add one from Bills, New bill.',
  type: 'Type',
  chooseType: 'Choose a type',
  noTypes: 'No income types are set up on this trust account. Add one in Trust, Settings.',
  dueDate: 'Due date',
  period: 'Invoice period (optional)',
  periodPlaceholder: 'e.g. 01/07/2026 to 30/09/2026',
  details: 'Details',
  detailsPlaceholder: 'e.g. Water usage 01/07/2026 to 30/09/2026',
  amount: 'Total incl. GST ($)',
  gst: 'GST included ($)',
  gstHint: 'Leave blank for 1/11 of the total.',
  noGst: 'This type carries no GST.',
  attachment: 'Attachment (optional)',
  attachmentHint: 'PDF, JPEG or PNG, up to 10 MB.',
  attachmentRemove: 'Remove',
  tenantRequired: 'Pick the tenant ledger',
  beneficiaryRequired: (from: TrustInvoiceFrom) =>
    from === TRUST_INVOICE_FROM.SUPPLIER ? 'Pick the supplier' : 'Pick the owner ledger',
  typeRequired: 'Pick the invoice type',
  detailsRequired: 'Enter the invoice details',
  amountInvalid: 'Enter a total above $0.00',
  gstInvalid: 'GST must be $0.00 or more and no more than the total',
  dueRequired: 'Pick the due date',
  dueBeforeToday: 'The due date cannot be before today',
  attachmentType: 'Attach a PDF, JPEG or PNG',
  attachmentTooBig: 'The attachment must be 10 MB or less',
  submit: 'Create invoice',
  cancel: 'Cancel',
  created: (invoiceNumber: number) => `Invoice #${invoiceNumber} created`,
} as const;

export const TRUST_INVOICE_DETAIL_COPY = {
  title: (invoiceNumber: number) => `Invoice #${invoiceNumber}`,
  amount: 'Total',
  paid: 'Paid',
  outstanding: 'Owing',
  tenant: 'Tenant',
  fromOwner: 'From owner',
  fromSupplier: 'From supplier',
  type: 'Type',
  gst: 'GST',
  date: 'Date',
  dueDate: 'Due',
  period: 'Period',
  property: 'Property',
  createdBy: 'Created by',
  details: 'Details',
  fromBill: (billNumber: number | null | undefined) =>
    billNumber != null ? `On-charged from bill #${billNumber}` : 'On-charged from a bill',
  payments: 'Payments',
  noPayments: 'No payments yet.',
  receiptNumber: (receiptNumber: number | null | undefined, auditNumber: number) =>
    receiptNumber != null ? `Receipt #${receiptNumber} · audit ${auditNumber}` : `Audit ${auditNumber}`,
  cancelled: 'Cancelled',
  close: 'Close',
  cancelInvoice: 'Cancel invoice',
  cancelTitle: (invoiceNumber: number) => `Cancel invoice #${invoiceNumber}`,
  cancelDescription: 'The invoice stays on record as Cancelled and the tenant no longer owes it.',
  cancelReason: 'Why',
  cancelReasonRequired: 'Enter why the invoice is cancelled',
  cancelSubmit: 'Cancel invoice',
  cancelKeep: 'Keep invoice',
  cancelledToast: (invoiceNumber: number) => `Invoice #${invoiceNumber} cancelled`,
} as const;

export const TRUST_RECEIPT_INVOICE_COPY = {
  invoice: 'Invoice',
  chooseInvoice: 'Choose an open invoice',
  noOpenInvoices: 'This tenant has no open invoices.',
  option: (invoiceNumber: number, details: string, outstanding: string) =>
    `#${invoiceNumber} · ${details} · ${outstanding} owing`,
  invoiceRequired: 'Pick the invoice being paid',
  overOutstanding: (outstanding: string) => `This invoice has ${outstanding} owing; receipt no more than that.`,
  previewTitle: 'This receipt will',
  previewPaidTo: (paidTo: string, effective: string) => `Pay rent to ${paidTo} (effective ${effective})`,
  previewFee: (name: string, amount: string) => `Charge ${name}: ${amount}`,
  previewFeePending: (name: string, amount: string) => `Leave ${name} pending: ${amount}`,
  previewPendingFees: (count: number, amount: string) =>
    `Post ${count} earlier pending fee${count === 1 ? '' : 's'}: ${amount}`,
  previewOwnerNet: (amount: string) => `Owner receives ${amount}`,
} as const;

export const TRUST_TENANT_EXTRAS_COPY = {
  invoicesTitle: 'Invoices',
  open: 'Open',
  cancelled: 'Cancelled',
  noOpen: 'No open invoices.',
  noCancelled: 'No cancelled invoices.',
  newInvoice: 'Create invoice',
  invoiceLine: (invoiceNumber: number, details: string) => `#${invoiceNumber} · ${details}`,
  invoiceMeta: (type: string, due: string) => `${type} · due ${due}`,
  owingOf: (amount: string) => `of ${amount}`,
  owing: 'Invoices owing',
  invoiceArrears: 'Overdue',
  historyTitle: 'Payments',
  noHistory: 'No payments yet.',
  date: 'Date',
  receiptNumber: 'Receipt',
  type: 'Type',
  details: 'Details',
  amount: 'Amount',
  arrears: 'Arrears before',
  status: 'Status',
  invoiceType: 'Invoice',
  totals: 'Tenancy totals',
  rentPaid: 'Rent paid',
  invoicesPaid: 'Invoices paid',
  depositHeld: 'Deposit held',
  receipts: (count: number) => `${count} receipt${count === 1 ? '' : 's'}`,
  showing: (shown: number, total: number) => `Showing ${shown} of ${total}`,
} as const;

export const TRUST_TRANSFER_DEPOSIT_COPY = {
  action: 'Transfer deposit',
  title: 'Transfer deposit to rent',
  description: (held: string) => `Deposit held: ${held}. This journals it to the owner and moves the paid-to date on.`,
  amount: 'Amount ($)',
  date: 'Date',
  amountInvalid: 'Enter an amount above $0.00',
  overHeld: (held: string) => `The amount cannot be more than the deposit held (${held}).`,
  dateRequired: 'Pick the date',
  previewPaidTo: (paidTo: string, effective: string) => `Paid to ${paidTo} · effective ${effective}`,
  submit: 'Transfer',
  cancel: 'Cancel',
  done: 'Deposit moved to rent',
} as const;

export const TRUST_LEDGER_SUMMARY_COPY = {
  title: 'This month',
  moneyIn: 'Money in',
  moneyOut: 'Money out',
  net: 'Net',
  reserved: 'Reserved for bills',
  withheld: 'Withheld',
  availableToPay: 'Available to pay',
  pendingBills: (count: number) => `${count} bill${count === 1 ? '' : 's'} waiting`,
  pendingFees: (count: number, amount: string) => `${count} fee${count === 1 ? '' : 's'} pending: ${amount}`,
  nextPayout: (date: string) => `Next payout ${date}`,
} as const;
