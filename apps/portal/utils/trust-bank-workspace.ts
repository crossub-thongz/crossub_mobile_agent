import { TRUST_BANK_WORKSPACE_COPY as COPY } from '@/constants/trust-bank-workspace';

/**
 * PRD phase 5 helpers for the agent bank workspace and reconciliation. Pure.
 */

interface WorkspaceLineLike {
  amountCents: number;
  suggestion?: {
    ledgerName?: string | null;
    propertyAddress?: string | null;
    propertyReferenceAddress?: string | null;
    transactionId?: string | null;
    transactionAuditNumber?: number | null;
    transactionDescription?: string | null;
  } | null;
  suggestedBatch?: { id: string; batchNumber: number; paymentCount: number } | null;
}

/** What a line's suggested match would be: one transaction, one batch, or nothing to accept. */
export function suggestedMatchOf(
  line: WorkspaceLineLike,
): { transactionId: string } | { paymentBatchId: string } | null {
  if (line.suggestedBatch) return { paymentBatchId: line.suggestedBatch.id };
  const transactionId = line.suggestion?.transactionId;
  return transactionId ? { transactionId } : null;
}

/** The payment batches the match dialog offers a debit (D161): the server's options, suggested first. */
export function matchBatchOptions<T extends { id: string }>(line: {
  suggestedBatch?: T | null;
  batchOptions?: readonly T[] | null;
}): T[] {
  const suggested = line.suggestedBatch ?? null;
  const rest = (line.batchOptions ?? []).filter((batch) => batch.id !== suggested?.id);
  return suggested ? [suggested, ...rest] : rest;
}

/** The suggestion line under a row: a match to accept, else (money in) a tenant to receipt to. */
export function suggestionText(line: WorkspaceLineLike): string | null {
  if (line.suggestedBatch) return COPY.suggestionBatch(line.suggestedBatch.batchNumber, line.suggestedBatch.paymentCount);
  const s = line.suggestion;
  if (!s) return null;
  if (s.transactionAuditNumber != null) return COPY.suggestionTransaction(s.transactionAuditNumber, s.transactionDescription ?? '');
  if (s.ledgerName) return COPY.suggestionTenant(s.ledgerName, s.propertyReferenceAddress ?? s.propertyAddress ?? null);
  return null;
}

/** Candidates for a manual match: same signed amount, a posted original not yet reconciled. */
export function isMatchCandidate(
  tx: { cashAmountCents: number; displayStatus: string; isReversal: boolean },
  lineCents: number,
  unreconciledStatus: string,
): boolean {
  return tx.cashAmountCents === lineCents && tx.displayStatus === unreconciledStatus && !tx.isReversal;
}

/** Pages for a total at a page size, at least one. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
}

/**
 * A signed dollars input ("-212.93", "$1,000") as cents; null when empty, unreadable or zero.
 * Adjustments are signed and never zero (D163).
 */
export function parseSignedNonZeroCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(cents) && cents !== 0 ? cents : null;
}
