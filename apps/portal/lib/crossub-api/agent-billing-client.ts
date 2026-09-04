import { apiV1 } from '@/lib/api';
import { agentFetch } from './agent-client';

export type AgentBillingCharge = {
  id: string;
  serviceType: string;
  collectionMode: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  propertyId?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  createdAt: string;
  createdByName?: string | null;
  calculationDetail?: string | null;
  calculationSummary?: string | null;
  /** Present when this postpaid charge was rolled into a monthly invoice (Level 2). */
  monthlyInvoiceId?: string | null;
  /** Linked job case reference, e.g. RI-6148518 or OP-3561029. */
  jobCaseName?: string | null;
  /** Case id to open — viewing session id for CROSSUB-conducted opens. */
  jobCaseId?: string | null;
  /** True when this Level 2 job used a yearly included allowance slot. */
  includedInAllowance?: boolean;
  /** Yearly included allowance for this inspection type. */
  allowanceLimit?: number | null;
  /** Completed jobs that have used an included slot this year. */
  allowanceUsed?: number | null;
  /** Included slots still remaining (deducted only after completion). */
  allowanceRemaining?: number | null;
};

export const PREPAID_INSPECTION_SERVICE_TYPES = new Set([
  'open_inspection',
  'routine_inspection',
  'ingoing_inspection',
  'outgoing_inspection',
]);

/** Monthly tax invoice lines: management fee, letting fee (legacy), tribunal. */
export const MONTHLY_INVOICE_SERVICE_TYPES = new Set([
  'service_fee',
  'letting_fee',
  'tribunal',
]);

export function isPrepaidInspectionServiceType(serviceType: string): boolean {
  return PREPAID_INSPECTION_SERVICE_TYPES.has(serviceType);
}

export function isMonthlyInvoiceServiceType(serviceType: string): boolean {
  return MONTHLY_INVOICE_SERVICE_TYPES.has(serviceType);
}

const LEVEL2_ALLOWANCE_SERVICE_TYPES = new Set([
  'routine_inspection',
  'ingoing_inspection',
  'outgoing_inspection',
]);

const LEVEL2_ALLOWANCE_LIMITS: Record<string, number> = {
  routine_inspection: 3,
  ingoing_inspection: 1,
  outgoing_inspection: 1,
};

export function platformChargeShowsAllowanceRemaining(
  row: Pick<
    AgentBillingCharge,
    | 'serviceType'
    | 'status'
    | 'amount'
    | 'includedInAllowance'
    | 'allowanceLimit'
    | 'allowanceRemaining'
  >,
): boolean {
  if (!LEVEL2_ALLOWANCE_SERVICE_TYPES.has(row.serviceType)) return false;
  if (row.allowanceLimit == null && row.allowanceRemaining == null) return false;
  if (row.includedInAllowance === true || row.status === 'included') return true;
  if (row.allowanceRemaining != null) return row.allowanceRemaining > 0;
  return Number(row.amount) === 0;
}

export type PlatformChargeAllowanceUsage = {
  used: number;
  included: number;
  remaining: number;
};

/** Yearly included-slot usage for a routine / ingoing / outgoing charge. */
export function platformChargeAllowanceUsage(
  row: Pick<
    AgentBillingCharge,
    'serviceType' | 'allowanceLimit' | 'allowanceUsed' | 'allowanceRemaining'
  >,
): PlatformChargeAllowanceUsage | null {
  if (!LEVEL2_ALLOWANCE_SERVICE_TYPES.has(row.serviceType)) return null;
  if (row.allowanceLimit == null && row.allowanceUsed == null && row.allowanceRemaining == null) {
    return null;
  }
  const included = row.allowanceLimit ?? LEVEL2_ALLOWANCE_LIMITS[row.serviceType] ?? 0;
  if (included <= 0) return null;
  const remaining =
    row.allowanceRemaining ?? Math.max(0, included - (row.allowanceUsed ?? 0));
  const used = row.allowanceUsed ?? Math.max(0, included - remaining);
  return { used, included, remaining };
}

/** Compact remaining text for a property-row included slot. */
export function includedAllowanceRemainingLabel(usage: {
  included: number;
  used: number;
  remaining: number;
}): string {
  if (usage.remaining > 0) {
    return `${usage.remaining} of ${usage.included} remaining`;
  }
  return `used (${usage.used} of ${usage.included})`;
}

export function platformChargeServiceAmountLabel(
  row: Pick<AgentBillingCharge, 'status' | 'amount' | 'includedInAllowance'>,
  formatMoney: (amount: number) => string,
): string {
  if (row.status === 'void') return 'Not charged';
  if (row.status === 'included' || row.includedInAllowance) return 'Included';
  return formatMoney(row.amount);
}

export function propertyLabelFromCharge(
  row: Pick<AgentBillingCharge, 'description'>,
): string {
  const desc = row.description?.trim() ?? '';
  const sep = ' — ';
  const idx = desc.indexOf(sep);
  if (idx >= 0) {
    const after = desc.slice(idx + sep.length).trim();
    if (after) return after;
  }
  return desc || 'Agency charges';
}

export function derivePropertyIncludedUsage(charges: AgentBillingCharge[]): {
  routine: { included: number; used: number; remaining: number };
  ingoing: { included: number; used: number; remaining: number };
  outgoing: { included: number; used: number; remaining: number };
} | null {
  const types = [
    ['routine_inspection', 'routine'],
    ['ingoing_inspection', 'ingoing'],
    ['outgoing_inspection', 'outgoing'],
  ] as const;
  const result = {
    routine: null as { included: number; used: number; remaining: number } | null,
    ingoing: null as { included: number; used: number; remaining: number } | null,
    outgoing: null as { included: number; used: number; remaining: number } | null,
  };
  for (const [serviceType, key] of types) {
    const row = charges.find((charge) => charge.serviceType === serviceType);
    const usage = row ? platformChargeAllowanceUsage(row) : null;
    if (usage) {
      result[key] = {
        included: usage.included,
        used: usage.used,
        remaining: usage.remaining,
      };
    }
  }
  if (!result.routine || !result.ingoing || !result.outgoing) return null;
  return {
    routine: result.routine,
    ingoing: result.ingoing,
    outgoing: result.outgoing,
  };
}

/** Invoice amount: remaining included slots, or the price once none remain. */
export function platformChargeAmountLabel(
  row: Pick<
    AgentBillingCharge,
    | 'serviceType'
    | 'status'
    | 'amount'
    | 'includedInAllowance'
    | 'allowanceLimit'
    | 'allowanceRemaining'
  >,
  formatMoney: (amount: number) => string,
): string {
  if (!platformChargeShowsAllowanceRemaining(row)) {
    return formatMoney(row.amount);
  }
  const limit = row.allowanceLimit ?? LEVEL2_ALLOWANCE_LIMITS[row.serviceType] ?? 0;
  const remaining = row.allowanceRemaining ?? limit;
  return `${remaining} of ${limit} remaining`;
}

export type AgentBillingSummary = {
  prepaidEnabled: boolean;
  platformBillingDisabled?: boolean;
  portalServiceLevel?: string;
  inspectionsCollectionMode?: 'prepaid' | 'postpaid';
  serviceFeePercent?: number;
  billingBlocked: boolean;
  /** Days after due date before the portal locks (Level 2). */
  overdueLockDays?: number;
  outstandingInvoiceAmount: number;
  openInvoiceId?: string | null;
  openInvoiceNumber?: string | null;
  nextInvoiceDueDate?: string | null;
  hasDefaultPaymentMethod: boolean;
  defaultPaymentMethod?: AgentBillingDefaultPaymentMethod | null;
};

export type AgentBillingDefaultPaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

/** Open inspections billed at this agency's live rate (staff can override the default). */
export type AgentBillingOpenInspectionPricing = {
  summary?: string;
  incGstAud?: number;
  firstThree?: string;
  fourthOnwards?: string;
  exampleRent500FirstIncGstAud?: number;
  /** @deprecated use exampleRent500FirstIncGstAud */
  exampleRent500IncGstAud?: number;
  exampleRent500FourthIncGstAud?: number;
};

export type AgentBillingLettingFeePricing = {
  weeksOfRent: number;
  summary: string;
  chargedWhen: string;
  exampleRent500IncGstAud: number;
};

const OPEN_INSPECTION_FALLBACK_INC_GST_AUD = 55;

/** Billed open-inspection amount. Missing payloads fall back to the routine flat rate — never $0. */
export function openInspectionIncGstAud(
  openInspection?: AgentBillingOpenInspectionPricing | null,
  fallbackIncGstAud = OPEN_INSPECTION_FALLBACK_INC_GST_AUD,
): number {
  const n = Number(openInspection?.incGstAud);
  if (Number.isFinite(n) && n > 0) return n;
  return fallbackIncGstAud;
}

export function openInspectionRateLabel(
  openInspection?: AgentBillingOpenInspectionPricing | null,
): string {
  const n = Number(openInspection?.incGstAud);
  if (Number.isFinite(n) && n > 0) {
    const summary = openInspection?.summary?.trim();
    if (summary && !/^(free|complimentary)\b/i.test(summary)) return summary;
    return `$${n.toFixed(2)} inc GST`;
  }
  const summary = openInspection?.summary?.trim();
  if (summary && /^(free|complimentary)\b/i.test(summary)) return summary;
  if (Number.isFinite(n) && n === 0) return 'Free';
  return `$${OPEN_INSPECTION_FALLBACK_INC_GST_AUD.toFixed(2)} inc GST`;
}

export function openInspectionIsFree(
  openInspection?: AgentBillingOpenInspectionPricing | null,
  platformBilling?: {
    complimentaryAllServices?: boolean;
    legacyFreeOpenInspections?: boolean;
  } | null,
): boolean {
  if (platformBilling?.complimentaryAllServices) return true;
  if (platformBilling?.legacyFreeOpenInspections) return true;
  const n = Number(openInspection?.incGstAud);
  if (Number.isFinite(n)) return n === 0;
  return false;
}

export type AgentBillingIncludedPackageItem = {
  key: string;
  label: string;
  feeLabel: string;
  summary: string;
};

export const LEVEL2_INCLUDED_PACKAGE_FALLBACK: AgentBillingIncludedPackageItem[] = [
  {
    key: 'reference_checks',
    label: 'Reference checks',
    feeLabel: 'Included',
    summary: 'Included in Full Service — applicant referee checks as part of leasing.',
  },
  {
    key: 'contract_agreement',
    label: 'Contract agreement',
    feeLabel: 'Included',
    summary:
      'Included in Full Service — residential tenancy agreement prepared and sent for signing.',
  },
];

export function level2IncludedPackageItems(
  catalog?: { level2?: { includedPackageItems?: AgentBillingIncludedPackageItem[] } } | null,
): AgentBillingIncludedPackageItem[] {
  const items = catalog?.level2?.includedPackageItems;
  return items && items.length > 0 ? items : LEVEL2_INCLUDED_PACKAGE_FALLBACK;
}

export type AgentBillingPricingCatalog = {
  portalServiceLevel: string;
  level1: {
    label: string;
    collectionMode: string;
    description: string;
  };
  level2: {
    label: string;
    collectionMode: string;
    description: string;
    includedPerPropertyPerYear: Record<string, number>;
    includedPackageItems?: AgentBillingIncludedPackageItem[];
    serviceFeePercent: number;
    serviceFeeExample: {
      weeklyRentAud: number;
      managementRatePercent: number;
      agentIncomeAud: number;
      crossubFeeAud: number;
      feePerActiveDayAud?: number;
      exampleActiveDays?: number;
      totalFeeAud?: number;
      daysInWeek?: number;
      serviceFeePercent?: number;
    };
    /** Remaining included inspections per property this calendar year (Level 2 and Level 3). */
    includedUsageByProperty?: AgentBillingIncludedUsageRow[];
  };
  level3?: {
    label: string;
    collectionMode: string;
    description: string;
  };
  platformBilling?: {
    complimentaryAllServices?: boolean;
    legacyFreeOpenInspections?: boolean;
    legacyLettingFee?: boolean;
  };
  inspections: {
    routineIncGstAud: number;
    openInspection: AgentBillingOpenInspectionPricing;
    lettingFee?: AgentBillingLettingFeePricing;
    fieldInspectionsCompactExGst: Record<string, number>;
    fieldInspectionsHouseExGst: Record<string, number | string>;
    tribunal: {
      standardExGstAud: number;
      standardIncGstAud: number;
      includedHours: number;
      extraHourlyExGstAud: number;
      extraHourlyIncGstAud: number;
      gstPercent: number;
    };
  };
};

export type AgentBillingMonthlyInvoice = {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  status: string;
  amountDue: number;
  paidAt?: string | null;
};

export type AgentBillingMonthlyInvoiceLineItem = {
  id: string;
  serviceType: string;
  description: string;
  amount: number;
  createdAt?: string | null;
  createdByName?: string | null;
  calculationDetail?: string | null;
};

export type AgentBillingTaxInvoiceLine = {
  id: string;
  lineNo: string;
  address: string;
  serviceLabel?: string;
  rentAud?: string;
  managementFee?: string;
  pmFee: string;
  managementRate: string;
  crossubRate: string;
  activeDays?: string;
  activeDaysCount?: number | null;
  amountExGst: number;
  amountIncGst: number;
  serviceType: string;
  footnote?: string | null;
};

export type AgentBillingTaxInvoice = {
  fileName: string;
  title: string;
  agentName: string;
  agentAbn?: string | null;
  issuerName: string;
  issuerAddressLines: string[];
  issuerAbn: string;
  invoiceDate: string;
  invoiceNumber: string;
  reference: string;
  periodLabel: string;
  dueDate: string;
  lockDate: string;
  lines: AgentBillingTaxInvoiceLine[];
  stationeryFeeExGst: number;
  subtotalExGst: number;
  gstPercent: number;
  gstAmount: number;
  totalIncGst: number;
  bankName: string;
  bankAccountName: string;
  bankBsb: string;
  bankAccountNumber: string;
};

export type AgentBillingMonthlyInvoiceDetail = AgentBillingMonthlyInvoice & {
  periodToken?: string;
  serviceFeePercent?: number;
  serviceFeeAmount?: number;
  serviceChargesSubtotal?: number;
  gstPercent?: number;
  calculationSummary?: string;
  lineItems: AgentBillingMonthlyInvoiceLineItem[];
  taxInvoice?: AgentBillingTaxInvoice;
};

export type AgentBillingIncludedAllowanceUsage = {
  included: number;
  used: number;
  remaining: number;
};

export type AgentBillingIncludedUsageRow = {
  propertyId: string;
  propertyLabel: string;
  calendarYear: number;
  agreementStart?: string | null;
  agreementEnd?: string | null;
  routine: AgentBillingIncludedAllowanceUsage;
  ingoing: AgentBillingIncludedAllowanceUsage;
  outgoing: AgentBillingIncludedAllowanceUsage;
};

export type AgentBillingQuoteInput = {
  serviceType: 'open_inspection' | 'tribunal' | 'routine_inspection' | 'ingoing_inspection' | 'outgoing_inspection';
  propertyId: string;
  leasingCycleId?: string;
  pricingContext?: Record<string, unknown>;
  /** Pool inspection row — links quote to a specific job when supported by the API. */
  inspectionId?: string;
};

export async function fetchAgentBillingSummary(): Promise<AgentBillingSummary> {
  return agentFetch('/agent/billing');
}

export async function fetchAgentBillingPricing(): Promise<AgentBillingPricingCatalog> {
  return agentFetch('/agent/billing/pricing');
}

export async function quoteAgentBillingCharge(
  body: AgentBillingQuoteInput,
): Promise<AgentBillingCharge | null> {
  const result = await agentFetch<{ charge: AgentBillingCharge | null }>('/agent/billing/quote', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result.charge;
}

export async function fetchAgentInspectionPlatformCharge(
  inspectionId: string,
): Promise<AgentBillingCharge | null> {
  return agentFetch(`/agent/billing/inspections/${encodeURIComponent(inspectionId)}/charge`);
}

/** Try several inspection / session ids until a linked charge is found. */
export async function fetchAgentInspectionPlatformChargeResolved(
  candidateIds: string[],
): Promise<AgentBillingCharge | null> {
  const tried = new Set<string>();
  for (const raw of candidateIds) {
    const id = raw.trim();
    if (!id || tried.has(id)) continue;
    tried.add(id);

    let linked = await fetchAgentInspectionPlatformCharge(id);
    if (!linked) {
      try {
        linked = await ensureAgentInspectionPlatformCharge(id);
      } catch {
        /* Older API builds may not expose ensure-charge yet. */
      }
    }
    if (linked) return linked;
  }
  return null;
}

/** Backfill a missing inspector-accept charge, then return it. */
export async function ensureAgentInspectionPlatformCharge(
  inspectionId: string,
): Promise<AgentBillingCharge | null> {
  return agentFetch(`/agent/billing/inspections/${encodeURIComponent(inspectionId)}/ensure-charge`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchAgentBillingCharge(chargeId: string): Promise<AgentBillingCharge> {
  return agentFetch(`/agent/billing/charges/${encodeURIComponent(chargeId)}`);
}

export async function payAgentBillingCharge(
  chargeId: string,
  opts?: { devConfirm?: boolean },
): Promise<{
  charge: AgentBillingCharge;
  paymentComplete: boolean;
  clientSecret?: string | null;
  customerSessionClientSecret?: string | null;
  preferSavedCard?: boolean;
}> {
  return agentFetch(`/agent/billing/charges/${encodeURIComponent(chargeId)}/pay`, {
    method: 'POST',
    body: JSON.stringify({ devConfirm: opts?.devConfirm ?? true }),
  });
}

export async function confirmAgentBillingChargePayment(
  chargeId: string,
): Promise<AgentBillingCharge> {
  return agentFetch(`/agent/billing/charges/${encodeURIComponent(chargeId)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function listAgentOpenInvoices(): Promise<AgentBillingMonthlyInvoice[]> {
  return agentFetch('/agent/billing/invoices');
}

export async function listAgentChargeHistory(
  propertyId?: string,
): Promise<AgentBillingCharge[]> {
  const query = propertyId?.trim()
    ? `?propertyId=${encodeURIComponent(propertyId.trim())}`
    : '';
  return agentFetch(`/agent/billing/charges${query}`);
}

export type AgentBillingPaymentItem = {
  kind: 'charge' | 'invoice';
  id: string;
  amount: number;
  description: string;
  status: string;
  serviceType?: string | null;
  propertyId?: string | null;
  jobCaseName?: string | null;
  jobCaseId?: string | null;
  invoiceNumber?: string | null;
};

export type AgentBillingPayment = {
  id: string;
  paidAt: string;
  amountAud: number;
  currency: string;
  itemCount: number;
  status: string;
  items: AgentBillingPaymentItem[];
};

export async function listAgentPaymentHistory(): Promise<AgentBillingPayment[]> {
  const result = await agentFetch<{ payments?: AgentBillingPayment[] }>(
    '/agent/billing/payments',
  );
  return result.payments ?? [];
}

export async function listAgentInvoiceHistory(): Promise<AgentBillingMonthlyInvoice[]> {
  return agentFetch('/agent/billing/invoices/history');
}

export async function fetchAgentMonthlyInvoice(
  invoiceId: string,
): Promise<AgentBillingMonthlyInvoiceDetail> {
  return agentFetch(
    `/agent/billing/invoices/${encodeURIComponent(invoiceId)}?_=${Date.now()}`,
  );
}

export async function downloadAgentMonthlyInvoicePdf(invoiceId: string): Promise<Blob> {
  return apiV1.getBlob(
    `/agent/billing/invoices/${encodeURIComponent(invoiceId)}/pdf?_=${Date.now()}`,
  );
}

export async function payAgentMonthlyInvoice(
  invoiceId: string,
  opts?: { devConfirm?: boolean },
): Promise<{ invoice: AgentBillingMonthlyInvoice; paymentComplete: boolean; clientSecret?: string | null }> {
  return agentFetch(`/agent/billing/invoices/${encodeURIComponent(invoiceId)}/pay`, {
    method: 'POST',
    body: JSON.stringify({ devConfirm: opts?.devConfirm ?? true }),
  });
}

export type AgentBillingPayAllResult = {
  paidChargeCount: number;
  paidInvoiceCount: number;
  totalAmountAud: number;
  paymentComplete: boolean;
  clientSecret?: string | null;
};

export async function payAllAgentBilling(opts?: {
  devConfirm?: boolean;
}): Promise<AgentBillingPayAllResult> {
  return agentFetch('/agent/billing/pay-all', {
    method: 'POST',
    body: JSON.stringify({ devConfirm: opts?.devConfirm ?? true }),
  });
}

export async function createAgentPaymentMethodSetup(): Promise<{ clientSecret: string }> {
  return agentFetch('/agent/billing/payment-method/setup', { method: 'POST' });
}

export async function confirmAgentPaymentMethodSetup(
  setupIntentId: string,
): Promise<{ hasDefaultPaymentMethod: boolean; defaultPaymentMethod: AgentBillingDefaultPaymentMethod }> {
  return agentFetch('/agent/billing/payment-method/confirm', {
    method: 'POST',
    body: JSON.stringify({ setupIntentId }),
  });
}

export type PlatformChargePrepareResult = {
  /** Null when billing is off or the service is included in allowance. */
  chargeId: string | null;
  /** Open Stripe when prepaid payment is required before continuing. */
  paymentRequired?: {
    chargeId: string;
    clientSecret: string;
    amountAud: number;
    title: string;
    description: string;
    calculationDetail?: string | null;
    calculationSummary?: string | null;
    customerSessionClientSecret?: string | null;
    preferSavedCard?: boolean;
    defaultPaymentMethod?: AgentBillingDefaultPaymentMethod | null;
  };
};

const SERVICE_LABEL: Record<AgentBillingQuoteInput['serviceType'], string> = {
  tribunal: 'Tribunal session',
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
};

/**
 * Quote a platform charge and start payment when prepaid is required.
 * Level 1 inspections pay as the last step of create (tribunal-style).
 */
export async function preparePlatformCharge(
  input: AgentBillingQuoteInput,
): Promise<PlatformChargePrepareResult> {
  const summary = await fetchAgentBillingSummary();
  if (!summary.prepaidEnabled) return { chargeId: null };

  const charge = await quoteAgentBillingCharge(input);
  if (!charge) return { chargeId: null };

  if (
    summary.inspectionsCollectionMode === 'postpaid' ||
    charge.collectionMode === 'postpaid'
  ) {
    return { chargeId: charge.id };
  }

  if (charge.status === 'paid') return { chargeId: charge.id };

  const paid = await payAgentBillingCharge(charge.id, { devConfirm: false });
  if (paid.paymentComplete) return { chargeId: paid.charge.id };

  if (paid.clientSecret) {
    const defaultPaymentMethod = summary.defaultPaymentMethod ?? null;
    return {
      chargeId: charge.id,
      paymentRequired: {
        chargeId: charge.id,
        clientSecret: paid.clientSecret,
        amountAud: charge.amount,
        title: SERVICE_LABEL[input.serviceType] ?? 'Platform service',
        description: charge.description,
        calculationDetail: charge.calculationDetail,
        calculationSummary: charge.calculationSummary,
        customerSessionClientSecret: paid.customerSessionClientSecret ?? null,
        preferSavedCard: paid.preferSavedCard ?? Boolean(defaultPaymentMethod?.id),
        defaultPaymentMethod,
      },
    };
  }

  throw new Error('Payment is required before starting this service');
}

/**
 * Quote and pay a platform charge upfront — inspections pay at create.
 * Tribunal on Level 2 / 3 accrues to the monthly invoice instead.
 * Returns null when billing is disabled or the service is included in Full Service allowance.
 * @throws when Stripe payment is required but cannot be completed inline (use preparePlatformCharge).
 */
export async function ensurePlatformCharge(input: AgentBillingQuoteInput): Promise<string | null> {
  const prepared = await preparePlatformCharge(input);
  if (prepared.paymentRequired) {
    throw new Error('Payment is required before starting this service');
  }
  return prepared.chargeId;
}

/** @deprecated use ensurePlatformCharge */
export const ensurePrepaidCharge = ensurePlatformCharge;
