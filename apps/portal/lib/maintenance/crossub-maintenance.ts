import { MAINTENANCE_QUOTE_STATUS } from '@/constants/self-managed-maintenance';
import type { AgentMaintenanceDetail } from '@/lib/crossub-api/maintenance-client';
import { formatCurrency } from '@/lib/utils';

type CrossubOffer = NonNullable<AgentMaintenanceDetail['crossubMaintenance']>;
type MaintenanceQuote = AgentMaintenanceDetail['quotes'][number];

/** CROSSUB's fee inc GST for display, or null when there is none. */
export function crossubFeeLabel(offer: CrossubOffer): string | null {
  return offer.feeIncGstAud > 0 ? formatCurrency(offer.feeIncGstAud) : null;
}

/**
 * What the agency pays CROSSUB to approve a CROSSUB quote: the quote plus CROSSUB's fee. The
 * server's charge is the amount actually taken; this is the figure on the button.
 */
export function crossubPayableAud(quoteTotal: number, offer: CrossubOffer): number {
  return Math.round((quoteTotal + offer.feeIncGstAud) * 100) / 100;
}

/** True when CROSSUB collected for this job, so CROSSUB, not the agency, pays the tradie. */
export function crossubPaysSupplier(quotes: readonly MaintenanceQuote[]): boolean {
  return quotes.some((q) => q.status === MAINTENANCE_QUOTE_STATUS.APPROVED && q.crossubArranged);
}
