import { confirmAgentBillingChargePayment } from '@/lib/crossub-api/agent-billing-client';

/** Mark a charge paid on the server after Stripe confirms in the portal. */
export async function finalizeBillingChargePayment(
  chargeId: string | null | undefined,
): Promise<void> {
  if (!chargeId) return;
  try {
    await confirmAgentBillingChargePayment(chargeId);
  } catch {
    /* Webhook may mark paid shortly; callers should reload either way. */
  }
}
