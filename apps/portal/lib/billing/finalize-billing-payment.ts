import { confirmAgentBillingChargePayment } from '@/lib/crossub-api/agent-billing-client';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mark a charge paid on the server after Stripe confirms in the portal. */
export async function finalizeBillingChargePayment(
  chargeId: string | null | undefined,
): Promise<void> {
  if (!chargeId) return;

  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const charge = await confirmAgentBillingChargePayment(chargeId);
      if (charge.status === 'paid' || charge.status === 'accrued') return;
      lastError = new Error('Payment is still processing. Try again in a moment.');
    } catch (err) {
      lastError = err;
    }
    await sleep(300);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Payment is still processing. Try again in a moment.');
}
