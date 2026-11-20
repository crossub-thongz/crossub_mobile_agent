import { TRUST_LEDGER_KIND, TRUST_TRANSACTION_DISPLAY_STATUS, TRUST_TRANSACTION_KIND } from '@/constants/trust';
import { TRUST_CORRECTION_ALLOCATION, type TrustCorrectionAllocation } from '@/constants/trust-corrections';

/**
 * PRD phase 4 helpers for the agent trust screens: the move-out cap on a receipt and the
 * allocation correction form. Pure.
 */

/** The rent past the move-out a receipt preview reports, or 0 when the rent fits. */
export function rentExcessCents(preview: { excessCents?: number | null } | null | undefined): number {
  const excess = preview?.excessCents ?? 0;
  return excess > 0 ? excess : 0;
}

/** "Put the rest to Deposit": the deposit after it takes the rent past the move-out. */
export function depositWithRest(depositCents: number | null, excessCents: number): number {
  return (depositCents ?? 0) + Math.max(excessCents, 0);
}

/** A correction moves somewhere else: another allocation, or the same one on another tenant. */
export function isCorrectionTargetDifferent(input: {
  fromKind: TrustCorrectionAllocation;
  fromLedgerId: string;
  toKind: TrustCorrectionAllocation;
  toLedgerId: string;
}): boolean {
  return input.fromKind !== input.toKind || input.fromLedgerId !== input.toLedgerId;
}

/**
 * The tenant folio a receipt is for and how much it put in Rent and Deposit, read from its entries
 * (rent lands on owner folios with the rent stamp; deposit is a credit on the tenant folio).
 */
export function receiptAllocations(transaction: {
  rentReceipt?: { ledgerId?: string | null; amountCents?: number | null } | null;
  entries: ReadonlyArray<{ ledgerId: string; ledgerName: string; ledgerKind: string; amountCents: number }>;
}): { tenantLedgerId: string | null; tenantName: string | null; amounts: Record<TrustCorrectionAllocation, number> } {
  const tenantEntries = transaction.entries.filter((entry) => entry.ledgerKind === TRUST_LEDGER_KIND.TENANT && entry.amountCents > 0);
  const tenantLedgerId = transaction.rentReceipt?.ledgerId ?? tenantEntries[0]?.ledgerId ?? null;
  const tenantName =
    transaction.entries.find((entry) => entry.ledgerId === tenantLedgerId)?.ledgerName ?? tenantEntries[0]?.ledgerName ?? null;
  return {
    tenantLedgerId,
    tenantName,
    amounts: {
      [TRUST_CORRECTION_ALLOCATION.RENT]: transaction.rentReceipt?.amountCents ?? 0,
      [TRUST_CORRECTION_ALLOCATION.DEPOSIT]: tenantEntries
        .filter((entry) => entry.ledgerId === tenantLedgerId)
        .reduce((sum, entry) => sum + entry.amountCents, 0),
    },
  };
}

/** True for a posted, non-reversal tenant receipt with Rent or Deposit to correct. */
export function isCorrectableReceipt(transaction: {
  kind: string;
  displayStatus: string;
  isReversal: boolean;
  rentReceipt?: unknown;
  entries: ReadonlyArray<{ ledgerKind: string; amountCents: number }>;
}): boolean {
  if (transaction.kind !== TRUST_TRANSACTION_KIND.RECEIPT || transaction.displayStatus === TRUST_TRANSACTION_DISPLAY_STATUS.REVERSED || transaction.isReversal) return false;
  return Boolean(transaction.rentReceipt) || transaction.entries.some((entry) => entry.ledgerKind === TRUST_LEDGER_KIND.TENANT && entry.amountCents > 0);
}
