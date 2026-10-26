import type { components, operations } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import type { TrustPayment, TrustTransaction } from './agent-trust-client';
import { crossub } from './client';

/**
 * Self-Manage manual trust transactions on the agent facade (Daniel 26 Oct 2026): a receipt to a
 * folio, a withdrawal from a folio as one bank payment, a journal between folios, and the bank
 * payments list. Same 404 rules as `agent-trust-client.ts` (principal or accountant, Self-Manage,
 * every row in the agency's own trust account).
 */

export type PostTrustLedgerReceiptInput = components['schemas']['PostLedgerReceiptDto'];
export type TrustReceiptLineInput = components['schemas']['PostCashLineDto'];
export type TrustManualWithdrawalInput = components['schemas']['ManualWithdrawalDto'];
export type PostTrustJournalInput = components['schemas']['PostJournalDto'];
export type TrustPaymentList = components['schemas']['TrustPaymentListDto'];

export type ListTrustPaymentsQuery = NonNullable<
  operations['AgentTrustTransactionsController_listPayments']['parameters']['query']
>;

export async function postTrustLedgerReceipt(
  agencyId: string,
  bankAccountId: string,
  body: PostTrustLedgerReceiptInput,
): Promise<TrustTransaction> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/ledger-receipts',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't post the receipt");
}

export async function postTrustManualWithdrawal(
  agencyId: string,
  bankAccountId: string,
  body: TrustManualWithdrawalInput,
): Promise<TrustPayment> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/manual-withdrawals',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't post the withdrawal");
}

export async function postTrustJournal(
  agencyId: string,
  bankAccountId: string,
  body: PostTrustJournalInput,
): Promise<TrustTransaction> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/journals',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't post the journal");
}

export async function fetchTrustPayments(
  agencyId: string,
  bankAccountId: string,
  query: ListTrustPaymentsQuery = {},
): Promise<TrustPaymentList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/payments',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the payments");
}
