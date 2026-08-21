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
};

export type AgentBillingSummary = {
  prepaidEnabled: boolean;
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

/** Open inspections are billed at the same flat rate as routine ($55 inc GST). */
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
    };
    /** Level 2 only — remaining included inspections per property this calendar year. */
    includedUsageByProperty?: AgentBillingIncludedUsageRow[];
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

export type AgentBillingMonthlyInvoiceDetail = AgentBillingMonthlyInvoice & {
  periodToken?: string;
  serviceFeePercent?: number;
  serviceFeeAmount?: number;
  serviceChargesSubtotal?: number;
  gstPercent?: number;
  calculationSummary?: string;
  lineItems: AgentBillingMonthlyInvoiceLineItem[];
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

export async function listAgentInvoiceHistory(): Promise<AgentBillingMonthlyInvoice[]> {
  return agentFetch('/agent/billing/invoices/history');
}

export async function fetchAgentMonthlyInvoice(
  invoiceId: string,
): Promise<AgentBillingMonthlyInvoiceDetail> {
  return agentFetch(`/agent/billing/invoices/${encodeURIComponent(invoiceId)}`);
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
 * Quote and pay a platform charge upfront — inspections and tribunal pay at create.
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
