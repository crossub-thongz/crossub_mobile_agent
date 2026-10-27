import type { TrustReconciliationFigures } from '@/lib/crossub-api/agent-trust-client';

/** Reconciliation figure helpers (D136), pure; mirrors the staff web's `utils/trust-reconciliation.ts`. */

/**
 * The ledger balances alone (Σ rows). The API's `totalCents` is the side compared with the cash
 * book: the ledgers plus the opening balance not allocated to a folio.
 */
export function trustFolioBalancesCents(folios: TrustReconciliationFigures['folios']): number {
  return folios.totalCents - folios.openingUnallocatedCents;
}
