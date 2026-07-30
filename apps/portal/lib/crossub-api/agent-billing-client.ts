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
  billingBlocked: boolean;
  outstandingInvoiceAmount: number;
  openInvoiceId?: string | null;
  openInvoiceNumber?: string | null;
  nextInvoiceDueDate?: string | null;
  hasDefaultPaymentMethod: boolean;
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

export async function quoteAgentBillingCharge(
  body: AgentBillingQuoteInput,
): Promise<AgentBillingCharge> {
  const result = await agentFetch<{ charge: AgentBillingCharge }>('/agent/billing/quote', {
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

export async function payAgentMonthlyInvoice(
  invoiceId: string,
  opts?: { devConfirm?: boolean },
): Promise<{ invoice: AgentBillingMonthlyInvoice; paymentComplete: boolean; clientSecret?: string | null }> {
  return agentFetch(`/agent/billing/invoices/${encodeURIComponent(invoiceId)}/pay`, {
    method: 'POST',
    body: JSON.stringify({ devConfirm: opts?.devConfirm ?? true }),
  });
}

/** Quote and pay (dev auto-pay when Stripe is not configured). Returns paid charge id. */
export async function ensurePrepaidCharge(input: AgentBillingQuoteInput): Promise<string | null> {
  const summary = await fetchAgentBillingSummary();
  if (!summary.prepaidEnabled) return null;

  const charge = await quoteAgentBillingCharge(input);
  if (charge.status === 'paid') return charge.id;

  const paid = await payAgentBillingCharge(charge.id);
  if (!paid.paymentComplete) {
    throw new Error('Payment is required before starting this service');
  }
  return paid.charge.id;
}
