import {
  preparePlatformCharge,
  type AgentBillingQuoteInput,
} from '@/lib/crossub-api/agent-billing-client';
import { getStripePublishableKey } from '@/lib/stripe-client';
import type { StripePaymentDialogState } from '@/components/billing/stripe-payment-dialog';

export type InspectionOrderServiceType = Extract<
  AgentBillingQuoteInput['serviceType'],
  'open_inspection' | 'routine_inspection' | 'ingoing_inspection' | 'outgoing_inspection'
>;

export type InspectionOrderPaymentReady = {
  status: 'ready';
  chargeId: string | null;
};

export type InspectionOrderPaymentNeedsCard = {
  status: 'needs_card';
  chargeId: string;
  dialog: StripePaymentDialogState;
};

export type InspectionOrderPaymentResult =
  | InspectionOrderPaymentReady
  | InspectionOrderPaymentNeedsCard;

/**
 * Quote (and start prepaid payment) before the inspection order is created.
 * Level 2 accrues without a card; complimentary / included allowance returns no charge.
 */
export async function prepareInspectionOrderPayment(
  serviceType: InspectionOrderServiceType,
  propertyId: string,
): Promise<InspectionOrderPaymentResult> {
  const prepared = await preparePlatformCharge({ serviceType, propertyId });
  if (prepared.paymentRequired) {
    if (!getStripePublishableKey()) {
      throw new Error('Card payments are not configured on this environment.');
    }
    return {
      status: 'needs_card',
      chargeId: prepared.paymentRequired.chargeId,
      dialog: {
        clientSecret: prepared.paymentRequired.clientSecret,
        title: prepared.paymentRequired.title,
        description: prepared.paymentRequired.description,
        amountAud: prepared.paymentRequired.amountAud,
        calculationDetail: prepared.paymentRequired.calculationDetail,
        calculationSummary: prepared.paymentRequired.calculationSummary,
        chargeId: prepared.paymentRequired.chargeId,
      },
    };
  }
  return { status: 'ready', chargeId: prepared.chargeId };
}
