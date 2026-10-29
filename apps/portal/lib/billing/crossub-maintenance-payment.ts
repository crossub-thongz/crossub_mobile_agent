import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import { startPrepaidChargePayment } from '@/lib/crossub-api/agent-billing-client';
import { quoteCrossubMaintenanceCharge } from '@/lib/crossub-api/maintenance-client';

import {
  toOrderPaymentResult,
  type InspectionOrderPaymentResult,
} from './inspection-order-payment';

/**
 * The card step before approving a CROSSUB quote on a Self-Manage job: the quote plus CROSSUB's
 * fee, paid to CROSSUB. `ready` when it is already paid (a retry after the approve failed).
 */
export async function prepareCrossubMaintenancePayment(
  requestId: string,
  quotationId: string,
): Promise<InspectionOrderPaymentResult> {
  const charge = await quoteCrossubMaintenanceCharge(requestId, quotationId);
  return toOrderPaymentResult(await startPrepaidChargePayment(charge, COPY.crossubPaymentTitle));
}
