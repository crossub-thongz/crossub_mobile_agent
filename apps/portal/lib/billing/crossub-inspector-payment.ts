import { CROSSUB_INSPECTOR_COPY as COPY } from '@/constants/self-managed-inspections';
import { startPrepaidChargePayment } from '@/lib/crossub-api/agent-billing-client';
import { quoteCrossubInspectorCharge } from '@/lib/crossub-api/agent-inspection-client';

import {
  toOrderPaymentResult,
  type InspectionOrderPaymentResult,
} from './inspection-order-payment';

/**
 * The card step before an unbooked agency job goes to a CROSSUB inspector: the Inspection Only
 * rate for this one job. `ready` when nothing is owed or it is already paid (a retry).
 */
export async function prepareCrossubInspectorPayment(
  inspectionId: string,
): Promise<InspectionOrderPaymentResult> {
  const charge = await quoteCrossubInspectorCharge(inspectionId);
  if (!charge) return { status: 'ready', chargeId: null };
  return toOrderPaymentResult(await startPrepaidChargePayment(charge, COPY.paymentTitle));
}
