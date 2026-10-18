import type { components, operations } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/**
 * Self-Manage trust accounting (Phase 3) on the agent facade, `/agent/agencies/{agencyId}/trust/*`.
 * Every call 404s unless the caller is that Self-Manage agency's principal or accountant and
 * CROSSUB has set up its trust workspace (see `isTrustNotSetUpError`).
 */

export type AgentTrustWorkspace = components['schemas']['AgentTrustWorkspaceDto'];
export type TrustBankAccount = components['schemas']['TrustBankAccountDto'];
export type TrustOverview = components['schemas']['TrustOverviewDto'];
export type TrustTransaction = components['schemas']['TrustTransactionDto'];
export type TrustLedger = components['schemas']['TrustLedgerDto'];
export type TrustLedgerList = components['schemas']['TrustLedgerListDto'];
export type TrustLedgerEntry = components['schemas']['TrustLedgerEntryDto'];
export type TrustLedgerEntryList = components['schemas']['TrustLedgerEntryListDto'];
export type TrustRentList = components['schemas']['TrustRentListDto'];
export type TrustRentRow = components['schemas']['TrustRentListRowDto'];
export type PostTenantReceiptInput = components['schemas']['PostTenantReceiptDto'];
export type TenantReceiptAllocation = components['schemas']['TenantReceiptAllocationDto'];
export type TrustBill = components['schemas']['TrustBillDto'];
export type TrustBillList = components['schemas']['TrustBillListDto'];
export type TrustAccountCodeRef = components['schemas']['TrustAccountCodeRefDto'];
export type TrustAccountCode = components['schemas']['TrustAccountCodeDto'];
export type CreateTrustBillInput = components['schemas']['CreateBillDto'];
export type PayTrustBillInput = components['schemas']['PayBillDto'];
export type TrustDisbursementCandidates = components['schemas']['TrustDisbursementCandidatesDto'];
export type TrustDisbursementCandidate = components['schemas']['TrustDisbursementCandidateDto'];
export type DisburseInput = components['schemas']['DisburseDto'];
export type AgentTrustDisbursementResult = components['schemas']['AgentTrustDisbursementResultDto'];
export type AgentTrustStatementEmail = components['schemas']['AgentTrustStatementEmailDto'];
export type TrustOwnerStatement = components['schemas']['TrustOwnerStatementDto'];
export type TrustOwnerStatementList = components['schemas']['TrustOwnerStatementListDto'];
export type TrustReconciliationMonths = components['schemas']['TrustReconciliationMonthsDto'];
export type TrustReconciliationMonth = components['schemas']['TrustReconciliationMonthDto'];
export type TrustReconciliationFigures = components['schemas']['TrustReconciliationFiguresDto'];
export type RecordBankBalanceInput = components['schemas']['RecordBankBalanceDto'];
export type TrustBankBalance = components['schemas']['TrustBankBalanceDto'];
export type LockReconciliationInput = components['schemas']['LockReconciliationDto'];

export type ListTrustLedgersQuery = NonNullable<
  operations['AgentTrustController_listLedgers']['parameters']['query']
>;
export type TrustPageQuery = NonNullable<
  operations['AgentTrustController_ledgerEntries']['parameters']['query']
>;
export type TrustRentListQuery = NonNullable<
  operations['AgentTrustController_rentList']['parameters']['query']
>;
export type ListTrustBillsQuery = NonNullable<
  operations['AgentTrustController_listBills']['parameters']['query']
>;
export type TrustDisbursementCandidatesQuery = NonNullable<
  operations['AgentTrustController_disbursementCandidates']['parameters']['query']
>;
export type TrustReconciliationFiguresQuery = NonNullable<
  operations['AgentTrustController_reconciliationFigures']['parameters']['query']
>;

export async function fetchTrustWorkspace(agencyId: string): Promise<AgentTrustWorkspace> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/workspace', {
    params: { path: { agencyId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the trust account");
}

export async function fetchTrustOverview(
  agencyId: string,
  bankAccountId: string,
): Promise<TrustOverview> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/overview',
    { params: { path: { agencyId, bankAccountId } } },
  );
  return unwrapCrossubResult(result, "Couldn't load the trust overview");
}

export async function fetchTrustLedgers(
  agencyId: string,
  bankAccountId: string,
  query: ListTrustLedgersQuery = {},
): Promise<TrustLedgerList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/ledgers',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the ledgers");
}

export async function fetchTrustLedger(agencyId: string, ledgerId: string): Promise<TrustLedger> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the ledger");
}

export async function fetchTrustLedgerEntries(
  agencyId: string,
  ledgerId: string,
  query: TrustPageQuery = {},
): Promise<TrustLedgerEntryList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/entries',
    { params: { path: { agencyId, ledgerId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the ledger entries");
}

export async function fetchTrustRentList(
  agencyId: string,
  bankAccountId: string,
  query: TrustRentListQuery = {},
): Promise<TrustRentList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/rent-list',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the rent list");
}

export async function postTrustTenantReceipt(
  agencyId: string,
  bankAccountId: string,
  body: PostTenantReceiptInput,
): Promise<TrustTransaction> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/tenant-receipts',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't receipt the payment");
}

export async function fetchTrustBills(
  agencyId: string,
  bankAccountId: string,
  query: ListTrustBillsQuery = {},
): Promise<TrustBillList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bills',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the bills");
}

export async function createTrustBill(
  agencyId: string,
  bankAccountId: string,
  body: CreateTrustBillInput,
): Promise<TrustBill> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bills',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't save the bill");
}

export async function payTrustBill(
  agencyId: string,
  billId: string,
  body: PayTrustBillInput,
): Promise<TrustBill> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/bills/{billId}/pay', {
    params: { path: { agencyId, billId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't pay the bill");
}

export async function fetchTrustDisbursementCandidates(
  agencyId: string,
  bankAccountId: string,
  query: TrustDisbursementCandidatesQuery = {},
): Promise<TrustDisbursementCandidates> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/disbursement-candidates',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the owners to pay");
}

/** Disburses and emails each issued statement to its owner; email failures come back per statement. */
export async function disburseTrust(
  agencyId: string,
  bankAccountId: string,
  body: DisburseInput,
): Promise<AgentTrustDisbursementResult> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/disbursements',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't run the disbursement");
}

export async function fetchTrustLedgerStatements(
  agencyId: string,
  ledgerId: string,
  query: TrustPageQuery = {},
): Promise<TrustOwnerStatementList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/statements',
    { params: { path: { agencyId, ledgerId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the statements");
}

/** The owner statement PDF as a blob, for a named download. */
export async function downloadTrustStatementPdf(
  agencyId: string,
  statementId: string,
): Promise<Blob> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/statements/{statementId}/pdf',
    { params: { path: { agencyId, statementId } }, parseAs: 'blob' },
  );
  return unwrapCrossubResult(result, "Couldn't download the statement");
}

export async function emailTrustStatement(
  agencyId: string,
  statementId: string,
): Promise<AgentTrustStatementEmail> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/statements/{statementId}/email',
    { params: { path: { agencyId, statementId } } },
  );
  return unwrapCrossubResult(result, "Couldn't email the statement");
}

export async function fetchTrustReconciliationMonths(
  agencyId: string,
  bankAccountId: string,
): Promise<TrustReconciliationMonths> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/reconciliation/months',
    { params: { path: { agencyId, bankAccountId } } },
  );
  return unwrapCrossubResult(result, "Couldn't load the reconciliation months");
}

/** `month` is YYYY-MM. */
export async function fetchTrustReconciliationFigures(
  agencyId: string,
  bankAccountId: string,
  month: string,
  query: TrustReconciliationFiguresQuery = {},
): Promise<TrustReconciliationFigures> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/reconciliation/{month}',
    { params: { path: { agencyId, bankAccountId, month }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the month's figures");
}

/** `date` is YYYY-MM-DD. */
export async function recordTrustBankBalance(
  agencyId: string,
  bankAccountId: string,
  date: string,
  body: RecordBankBalanceInput,
): Promise<TrustBankBalance> {
  const result = await crossub.PUT(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bank-balances/{date}',
    { params: { path: { agencyId, bankAccountId, date } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't record the bank balance");
}

export async function lockTrustReconciliationMonth(
  agencyId: string,
  bankAccountId: string,
  month: string,
  body: LockReconciliationInput,
): Promise<TrustReconciliationFigures> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/reconciliation/{month}/lock',
    { params: { path: { agencyId, bankAccountId, month } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't lock the month");
}
