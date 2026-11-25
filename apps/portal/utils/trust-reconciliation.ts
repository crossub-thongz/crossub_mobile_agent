import type { TrustReconciliationFigures, TrustReconciliationMonth } from '@/lib/crossub-api/agent-trust-client';
import { trustTodayKey } from '@/lib/trust-accounting';

/** Reconciliation figure helpers (D136), pure; mirrors the staff web's `utils/trust-reconciliation.ts`. */

/**
 * The ledger balances alone (Σ rows). The API's `totalCents` is the side compared with the cash
 * book: the ledgers plus the opening balance not allocated to a folio.
 */
export function trustFolioBalancesCents(folios: TrustReconciliationFigures['folios']): number {
  return folios.totalCents - folios.openingUnallocatedCents;
}

/** The day a month's figures are as at: its last day, or today while the month is still running. */
export function trustMonthAsAtKey(month: Pick<TrustReconciliationMonth, 'periodEnd'>, todayKey: string = trustTodayKey()): string {
  return month.periodEnd < todayKey ? month.periodEnd : todayKey;
}
