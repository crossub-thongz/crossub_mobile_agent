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
};

export type AgentBillingSummary = {
  prepaidEnabled: boolean;
  portalServiceLevel?: string;
  inspectionsCollectionMode?: 'prepaid' | 'postpaid';
  serviceFeePercent?: number;
  billingBlocked: boolean;
  outstandingInvoiceAmount: number;
  openInvoiceId?: string | null;
  openInvoiceNumber?: string | null;
  nextInvoiceDueDate?: string | null;
  hasDefaultPaymentMethod: boolean;
};

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
    serviceFeePercent: number;
    serviceFeeExample: {
      weeklyRentAud: number;
      managementRatePercent: number;
      agentIncomeAud: number;
      crossubFeeAud: number;
    };
  };
  inspections: {
    routineIncGstAud: number;
    openInspection: {
      firstThree: string;
      fourthOnwards: string;
      exampleRent500FirstIncGstAud?: number;
      /** @deprecated use exampleRent500FirstIncGstAud */
      exampleRent500IncGstAud?: number;
      exampleRent500FourthIncGstAud?: number;
    };
    fieldInspectionsCompactExGst: Record<string, number>;
    fieldInspectionsHouseExGst: Record<string, number | string>;
    tribunal: {
      standardExGstAud: number;
      includedHours: number;
      extraHourlyExGstAud: number;
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

export type AgentBillingQuoteInput = {
  serviceType: 'open_inspection' | 'tribunal' | 'routine_inspection' | 'ingoing_inspection' | 'outgoing_inspection';
  propertyId: string;
  leasingCycleId?: string;
  pricingContext?: Record<string, unknown>;
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

export async function payAgentBillingCharge(
  chargeId: string,
  opts?: { devConfirm?: boolean },
): Promise<{ charge: AgentBillingCharge; paymentComplete: boolean; clientSecret?: string | null }> {
  return agentFetch(`/agent/billing/charges/${encodeURIComponent(chargeId)}/pay`, {
    method: 'POST',
    body: JSON.stringify({ devConfirm: opts?.devConfirm ?? true }),
  });
}

export async function listAgentOpenInvoices(): Promise<AgentBillingMonthlyInvoice[]> {
  return agentFetch('/agent/billing/invoices');
}

export async function listAgentChargeHistory(): Promise<AgentBillingCharge[]> {
  return agentFetch('/agent/billing/charges');
}

export async function listAgentInvoiceHistory(): Promise<AgentBillingMonthlyInvoice[]> {
  return agentFetch('/agent/billing/invoices/history');
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

/**
 * Quote and pay a platform charge upfront — used for tribunal (inspections bill on inspector accept).
 * Returns null when billing is disabled or the service is included in Full Service allowance.
 */
export async function ensurePlatformCharge(input: AgentBillingQuoteInput): Promise<string | null> {
  const summary = await fetchAgentBillingSummary();
  if (!summary.prepaidEnabled) return null;

  const charge = await quoteAgentBillingCharge(input);
  if (!charge) return null;

  if (
    summary.inspectionsCollectionMode === 'postpaid' ||
    charge.collectionMode === 'postpaid'
  ) {
    if (charge.status === 'accrued' || charge.status === 'paid') return charge.id;
    return charge.id;
  }

  if (charge.status === 'paid') return charge.id;

  const paid = await payAgentBillingCharge(charge.id);
  if (!paid.paymentComplete) {
    throw new Error('Payment is required before starting this service');
  }
  return paid.charge.id;
}

/** @deprecated use ensurePlatformCharge */
export const ensurePrepaidCharge = ensurePlatformCharge;
