import {
  TRUST_ATTENTION,
  TRUST_ATTENTION_COPY as COPY,
  TRUST_BANK_RECONCILIATION_STATUS,
  TRUST_RECONCILIATION_SUMMARY_COPY as REC_COPY,
  TRUST_TAB,
  type TrustAttentionId,
  type TrustTab,
} from '@/constants/trust';
import type { TrustOverview } from '@/lib/crossub-api/agent-trust-client';
import { formatCents } from '@/lib/trust-accounting';

export type TrustAttentionItem = {
  id: TrustAttentionId;
  title: string;
  detail: string;
  tab: TrustTab;
};

function reconciliationDetail(overview: TrustOverview): string {
  const rec = overview.trustBankAccount.reconciliation;
  const parts: string[] = [];
  if (rec.status !== TRUST_BANK_RECONCILIATION_STATUS.RECONCILED) {
    parts.push(rec.asAt && rec.outByCents ? COPY.bankOutBy(formatCents(rec.outByCents)) : COPY.noBankBalance);
  }
  if (overview.reconciliation.monthsToLock > 0) parts.push(COPY.monthsToLock(overview.reconciliation.monthsToLock));
  return parts.join(' · ');
}

/**
 * What the Overview lists under "Needs your attention", most pressing first. Each row opens the
 * screen that fixes it. `pendingMailCount` is null while the pending mail count is still loading.
 */
export function trustAttentionItems(
  overview: TrustOverview,
  pendingMailCount: number | null,
): TrustAttentionItem[] {
  const items: TrustAttentionItem[] = [];
  const rec = overview.trustBankAccount.reconciliation;

  if (overview.differenceCents !== 0) {
    items.push({
      id: TRUST_ATTENTION.OUT_OF_BALANCE,
      title: COPY.outOfBalance,
      detail: COPY.outOfBalanceDetail(formatCents(overview.differenceCents)),
      tab: TRUST_TAB.RECONCILIATION,
    });
  }
  if (overview.openingUnallocatedCents !== 0) {
    items.push({
      id: TRUST_ATTENTION.OPENING_UNALLOCATED,
      title: COPY.openingUnallocated,
      detail: COPY.requiresReview(formatCents(overview.openingUnallocatedCents)),
      tab: TRUST_TAB.RECONCILIATION,
    });
  }
  if (rec.status !== TRUST_BANK_RECONCILIATION_STATUS.RECONCILED || overview.reconciliation.monthsToLock > 0) {
    items.push({
      id: TRUST_ATTENTION.RECONCILIATION,
      title: COPY.reconciliation(overview.reconciliation.currentLabel),
      detail: reconciliationDetail(overview),
      tab: TRUST_TAB.RECONCILIATION,
    });
  }
  if (pendingMailCount != null && pendingMailCount > 0) {
    items.push({
      id: TRUST_ATTENTION.PENDING_MAIL,
      title: COPY.pendingMail,
      detail: COPY.pendingMailDetail(pendingMailCount),
      tab: TRUST_TAB.PENDING_MAIL,
    });
  }
  if (overview.billsInsufficientCount > 0) {
    items.push({
      id: TRUST_ATTENTION.BILLS_INSUFFICIENT,
      title: COPY.billsInsufficient,
      detail: COPY.billsInsufficientDetail(overview.billsInsufficientCount),
      tab: TRUST_TAB.BILLS,
    });
  }
  if (overview.invoicesOverdueCount > 0) {
    items.push({
      id: TRUST_ATTENTION.INVOICES_OVERDUE,
      title: COPY.invoicesOverdue,
      detail: COPY.invoicesOverdueDetail(overview.invoicesOverdueCount),
      tab: TRUST_TAB.BILLS,
    });
  }
  if (overview.ownersWithoutPayoutMethodCount > 0) {
    items.push({
      id: TRUST_ATTENTION.OWNERS_NO_PAYOUT,
      title: COPY.ownersNoPayout,
      detail: COPY.ownersNoPayoutDetail(overview.ownersWithoutPayoutMethodCount),
      tab: TRUST_TAB.DISBURSE,
    });
  }
  if (overview.ownersDueCount > 0) {
    items.push({
      id: TRUST_ATTENTION.OWNERS_DUE,
      title: COPY.ownersDue,
      detail: COPY.ownersDueDetail(overview.ownersDueCount),
      tab: TRUST_TAB.DISBURSE,
    });
  }
  if (overview.poolPaymentCount > 0) {
    items.push({
      id: TRUST_ATTENTION.BANK_FILE,
      title: COPY.bankFile,
      detail: COPY.bankFileDetail(overview.poolPaymentCount, formatCents(overview.poolPaymentCents)),
      tab: TRUST_TAB.DISBURSE,
    });
  }
  return items;
}

/** The Reconciliation screen's banner line, or null when the month is clean. */
export function trustReconciliationBanner(overview: TrustOverview): string | null {
  const rec = overview.trustBankAccount.reconciliation;
  const unreconciled = rec.status !== TRUST_BANK_RECONCILIATION_STATUS.RECONCILED;
  const toLock = overview.reconciliation.monthsToLock;
  const unallocated = overview.openingUnallocatedCents !== 0;
  if (!unreconciled && toLock === 0 && !unallocated) return null;

  const parts: string[] = [];
  if (unreconciled) {
    parts.push(REC_COPY.monthOpen(overview.reconciliation.currentLabel));
    parts.push(rec.asAt && rec.outByCents ? REC_COPY.bankOutBy(formatCents(rec.outByCents)) : REC_COPY.noBankBalance);
  }
  if (toLock > 0) parts.push(REC_COPY.monthsToLock(toLock));
  if (unallocated) parts.push(REC_COPY.openingUnallocated);
  return parts.join(' ');
}
