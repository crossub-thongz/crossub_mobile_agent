import type { components, operations } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/**
 * Self-Manage trust accounting (Phase 3) on the agent facade, `/agent/agencies/{agencyId}/trust/*`.
 * Every call 404s unless the caller is that Self-Manage agency's principal or accountant and
 * the agency's trust workspace is set up (see `isTrustNotSetUpError`; `setupTrustAccount` sets
 * it up from the app).
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
export type SetTrustRentProfileInput = components['schemas']['SetRentProfileDto'];
export type AddTrustSupplierInput = components['schemas']['AgentAddSupplierDto'];
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
export type TrustTransactionList = components['schemas']['TrustTransactionListDto'];
export type ReverseTrustTransactionInput = components['schemas']['ReverseTransactionDto'];
export type TrustFeeCharge = components['schemas']['TrustFeeChargeDto'];
export type TrustFeeChargeList = components['schemas']['TrustFeeChargeListDto'];
export type CreateTrustFeeChargeInput = components['schemas']['CreateManualFeeDto'];
export type WaiveTrustFeeChargeInput = components['schemas']['WaiveFeeChargeDto'];
export type TrustPostPendingFeesResult = components['schemas']['TrustPostPendingFeesResultDto'];
export type TrustOwnerBillList = components['schemas']['TrustOwnerBillListDto'];
export type TrustOwnerBillItem = components['schemas']['TrustOwnerBillItemDto'];
export type PayTrustOwnerBillsInput = components['schemas']['CollectOwnerFolioBillsDto'];
export type TrustOwnerCollectResult = components['schemas']['TrustOwnerCollectResultDto'];
type TrustOwnerBillListQuery = operations['AgentTrustController_listOwnerBills']['parameters']['query'];
export type TrustPaymentsSummary = components['schemas']['TrustPaymentsSummaryDto'];
export type TrustPaymentBatch = components['schemas']['TrustPaymentBatchDto'];
export type TrustPaymentBatchList = components['schemas']['TrustPaymentBatchListDto'];
export type TrustPaymentBatchDetail = components['schemas']['TrustPaymentBatchDetailDto'];
export type CreateTrustPaymentBatchInput = components['schemas']['CreatePaymentBatchDto'];
export type TrustPayment = components['schemas']['TrustPaymentDto'];
export type ReadTrustBankFileInput = components['schemas']['ReadBankFileDto'];
export type TrustBankFile = components['schemas']['TrustBankFileDto'];
export type TrustBankFileLine = components['schemas']['TrustBankFileLineDto'];
export type TrustBankLineInput = components['schemas']['TrustBankLineInputDto'];
export type LinkTrustBankLineInput = components['schemas']['LinkBankLineDto'];
export type ProcessMatchedBankLinesInput = components['schemas']['ProcessMatchedDto'];
export type TrustProcessMatchedResult = components['schemas']['TrustProcessMatchedResultDto'];
export type TrustBankLineReconciled = components['schemas']['TrustBankLineReconciledDto'];
export type TrustBankLineUnlinked = components['schemas']['TrustBankLineUnlinkedDto'];
export type TrustCashReport = components['schemas']['TrustCashReportDto'];
export type TrustFolioBalanceReport = components['schemas']['TrustFolioBalanceReportDto'];
export type TrustUnpresentedReport = components['schemas']['TrustUnpresentedReportDto'];

export type TrustAccountSetupInput = components['schemas']['AgentTrustSetupDto'];
export type UpdateTrustBankAccountInput = components['schemas']['UpdateBankAccountDto'];
export type CreateTrustAccountCodeInput = components['schemas']['CreateAccountCodeDto'];
export type UpdateTrustAccountCodeInput = components['schemas']['UpdateAccountCodeDto'];
export type OpenTrustLedgerInput = components['schemas']['AgentOpenLedgerDto'];
export type UpdateTrustLedgerInput = components['schemas']['UpdateLedgerDto'];
export type TrustFolioSyncPreview = components['schemas']['TrustFolioSyncPreviewDto'];
export type TrustFolioSyncResult = components['schemas']['TrustFolioSyncResultDto'];
export type TrustPayoutMethods = components['schemas']['TrustPayoutMethodsDto'];
export type TrustPayoutMethod = components['schemas']['TrustPayoutMethodDto'];
export type PutTrustPayoutMethodsInput = components['schemas']['PutPayoutMethodsDto'];
export type TrustPayoutMethodRowInput = components['schemas']['PayoutMethodRowDto'];
export type SetTrustPayoutScheduleInput = components['schemas']['SetPayoutScheduleDto'];
export type TrustFeeTemplate = components['schemas']['TrustFeeTemplateDto'];
export type TrustFeeTemplateRuleInput = components['schemas']['FeeTemplateRuleDto'];
export type UpdateTrustFeeTemplateInput = components['schemas']['UpdateFeeTemplateDto'];
export type TrustFeeAssignments = components['schemas']['TrustFeeAssignmentsDto'];
export type TrustFeeAssignment = components['schemas']['TrustFeeAssignmentDto'];
export type TrustFeeAssignmentVersion = components['schemas']['TrustFeeAssignmentVersionDto'];
export type TrustFeeMissedPeriod = components['schemas']['TrustFeeMissedPeriodDto'];
export type CreateTrustFeeAssignmentInput = components['schemas']['CreateFeeAssignmentDto'];
export type AddTrustFeeAssignmentVersionInput = components['schemas']['AddFeeAssignmentVersionDto'];
export type ResolveTrustMissedFeePeriodInput = components['schemas']['ResolveMissedFeePeriodDto'];
export type EditTrustFeeChargeInput = components['schemas']['EditFeeChargeDto'];
export type TrustRentProfile = components['schemas']['TrustRentProfileDto'];
export type SetTrustBondInput = components['schemas']['SetBondDto'];
export type ResetTrustRentInput = components['schemas']['RentResetDto'];
export type TrustWithholds = components['schemas']['TrustWithholdsDto'];
export type TrustWithhold = components['schemas']['TrustWithholdDto'];
export type CreateTrustWithholdInput = components['schemas']['CreateWithholdDto'];
export type ReleaseTrustWithholdInput = components['schemas']['ReleaseWithholdDto'];
export type UpdateTrustBillInput = components['schemas']['UpdateBillDto'];
export type CancelTrustBillInput = components['schemas']['TrustCancelDocumentDto'];
export type TrustDisbursementRun = components['schemas']['TrustDisbursementRunDto'];
export type TrustDisbursementRunList = components['schemas']['TrustDisbursementRunListDto'];
export type TrustStatementPreview = components['schemas']['TrustStatementPreviewDto'];
export type RevokeTrustReconciliationInput = components['schemas']['RevokeReconciliationDto'];
export type TrustBankBalances = components['schemas']['TrustBankBalancesDto'];
// PRD phase 4 (rent rates, move-out, allocation corrections).
export type TrustRentRate = components['schemas']['TrustRentRateDto'];
export type SetTrustRentRateInput = components['schemas']['SetRentRateDto'];
export type SetTrustMoveOutInput = components['schemas']['SetMoveOutDto'];
export type TrustMoveOutPreview = components['schemas']['TrustMoveOutPreviewDto'];
export type TrustCorrectionLeg = components['schemas']['TrustCorrectionLegDto'];
export type TrustCorrectionPaidTo = components['schemas']['TrustCorrectionPaidToDto'];
export type TrustCorrectionPreview = components['schemas']['TrustCorrectionPreviewDto'];
export type CorrectTrustAllocationInput = components['schemas']['CorrectAllocationDto'];
export type ConfirmTrustCorrectionInput = components['schemas']['ConfirmAllocationCorrectionDto'];
export type TrustAllocationCorrection = components['schemas']['TrustAllocationCorrectionDto'];
export type TrustAllocationCorrectionList = components['schemas']['TrustAllocationCorrectionListDto'];

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
export type ListTrustTransactionsQuery = NonNullable<
  operations['AgentTrustController_listTransactions']['parameters']['query']
>;
export type ListTrustFeeChargesQuery = NonNullable<
  operations['AgentTrustController_listFeeCharges']['parameters']['query']
>;
export type TrustReportQuery = NonNullable<
  operations['AgentTrustController_receiptsReport']['parameters']['query']
>;
export type TrustReportKind =
  operations['AgentTrustController_reportCsv']['parameters']['path']['kind'];
export type TrustLedgerFileFormat =
  operations['AgentTrustController_ledgerFile']['parameters']['path']['format'];

export type TrustBankBalancesQuery = NonNullable<
  operations['AgentTrustManageController_listBankBalances']['parameters']['query']
>;
export type TrustStatementPreviewQuery = NonNullable<
  operations['AgentTrustManageController_statementPreview']['parameters']['query']
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

export async function setTrustRentProfile(
  agencyId: string,
  ledgerId: string,
  body: SetTrustRentProfileInput,
): Promise<TrustLedger> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/rent-profile', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the rent");
}

export async function addTrustSupplier(
  agencyId: string,
  bankAccountId: string,
  body: AddTrustSupplierInput,
): Promise<TrustLedger> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/suppliers',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't add the supplier");
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

/** `format` is csv or pdf: the ledger with its running balance. */
export async function downloadTrustLedgerFile(
  agencyId: string,
  ledgerId: string,
  format: TrustLedgerFileFormat,
): Promise<Blob> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/ledger/{format}',
    { params: { path: { agencyId, ledgerId, format } }, parseAs: 'blob' },
  );
  return unwrapCrossubResult(result, "Couldn't download the ledger");
}

// --------------------------------------------------------------------------- Transactions

export async function fetchTrustTransactions(
  agencyId: string,
  bankAccountId: string,
  query: ListTrustTransactionsQuery = {},
): Promise<TrustTransactionList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/transactions',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the transactions");
}

export async function fetchTrustTransaction(
  agencyId: string,
  transactionId: string,
): Promise<TrustTransaction> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/transactions/{transactionId}',
    { params: { path: { agencyId, transactionId } } },
  );
  return unwrapCrossubResult(result, "Couldn't load the transaction");
}

export async function reverseTrustTransaction(
  agencyId: string,
  transactionId: string,
  body: ReverseTrustTransactionInput,
): Promise<TrustTransaction> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/transactions/{transactionId}/reverse',
    { params: { path: { agencyId, transactionId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't reverse the transaction");
}

// --------------------------------------------------------------------------- Fee charges

export async function fetchTrustFeeCharges(
  agencyId: string,
  ledgerId: string,
  query: ListTrustFeeChargesQuery = {},
): Promise<TrustFeeChargeList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/fee-charges',
    { params: { path: { agencyId, ledgerId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the fees");
}

export async function createTrustFeeCharge(
  agencyId: string,
  ledgerId: string,
  body: CreateTrustFeeChargeInput,
): Promise<TrustFeeCharge> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/fee-charges',
    { params: { path: { agencyId, ledgerId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't charge the fee");
}

export async function editTrustFeeCharge(
  agencyId: string,
  chargeId: string,
  body: EditTrustFeeChargeInput,
): Promise<TrustFeeCharge> {
  const result = await crossub.PATCH('/agent/agencies/{agencyId}/trust/fee-charges/{chargeId}', {
    params: { path: { agencyId, chargeId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't change the fee");
}

export async function postPendingTrustFees(
  agencyId: string,
  ledgerId: string,
): Promise<TrustPostPendingFeesResult> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/fee-charges/post-pending',
    { params: { path: { agencyId, ledgerId } } },
  );
  return unwrapCrossubResult(result, "Couldn't post the pending fees");
}

/** Owner folio Pending Bills or Paid Bills: supplier bills and agency fees together (PRD phase 2). */
export async function fetchTrustOwnerBills(
  agencyId: string,
  ledgerId: string,
  query: TrustOwnerBillListQuery = {},
): Promise<TrustOwnerBillList> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/owner-bills', {
    params: { path: { agencyId, ledgerId }, query },
  });
  return unwrapCrossubResult(result, "Couldn't load the owner's bills");
}

/** Pay the selected bills and fees of one owner in full, all together or none (409 with the reason). */
export async function payTrustOwnerBills(
  agencyId: string,
  ledgerId: string,
  body: PayTrustOwnerBillsInput,
): Promise<TrustOwnerCollectResult> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/owner-bills/pay', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't pay the selected bills");
}

export async function waiveTrustFeeCharge(
  agencyId: string,
  chargeId: string,
  body: WaiveTrustFeeChargeInput,
): Promise<TrustFeeCharge> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/fee-charges/{chargeId}/waive',
    { params: { path: { agencyId, chargeId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't waive the fee");
}

// --------------------------------------------------------------------------- Payment batches (ABA)

export async function fetchTrustPaymentsSummary(
  agencyId: string,
  bankAccountId: string,
): Promise<TrustPaymentsSummary> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/payments-summary',
    { params: { path: { agencyId, bankAccountId } } },
  );
  return unwrapCrossubResult(result, "Couldn't load the payments waiting for a bank file");
}

export async function fetchTrustPaymentBatches(
  agencyId: string,
  bankAccountId: string,
  query: TrustPageQuery = {},
): Promise<TrustPaymentBatchList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/payment-batches',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the bank files");
}

export async function createTrustPaymentBatch(
  agencyId: string,
  bankAccountId: string,
  body: CreateTrustPaymentBatchInput,
): Promise<TrustPaymentBatchDetail> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/payment-batches',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't create the bank file");
}

export async function fetchTrustPaymentBatch(
  agencyId: string,
  batchId: string,
): Promise<TrustPaymentBatchDetail> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/payment-batches/{batchId}', {
    params: { path: { agencyId, batchId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the bank file");
}

/** The ABA (or BPAY CSV) file exactly as generated. */
export async function downloadTrustPaymentBatchFile(
  agencyId: string,
  batchId: string,
): Promise<Blob> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/payment-batches/{batchId}/file',
    { params: { path: { agencyId, batchId } }, parseAs: 'blob' },
  );
  return unwrapCrossubResult(result, "Couldn't download the bank file");
}

export async function downloadTrustPaymentBatchReport(
  agencyId: string,
  batchId: string,
): Promise<Blob> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/payment-batches/{batchId}/report',
    { params: { path: { agencyId, batchId } }, parseAs: 'blob' },
  );
  return unwrapCrossubResult(result, "Couldn't download the payment report");
}

// --------------------------------------------------------------------------- Bank statement

/** Reads a QIF statement and suggests a match per line; the API saves nothing from the file. */
export async function readTrustBankStatement(
  agencyId: string,
  bankAccountId: string,
  body: ReadTrustBankFileInput,
): Promise<TrustBankFile> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bank-statement/read',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't read the bank statement");
}

export async function linkTrustBankLine(
  agencyId: string,
  bankAccountId: string,
  body: LinkTrustBankLineInput,
): Promise<TrustBankLineReconciled> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bank-statement/link',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't match the bank line");
}

export async function processMatchedTrustBankLines(
  agencyId: string,
  bankAccountId: string,
  body: ProcessMatchedBankLinesInput,
): Promise<TrustProcessMatchedResult> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bank-statement/process-matched',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't process the matched lines");
}

export async function unlinkTrustBankLine(
  agencyId: string,
  lineId: string,
): Promise<TrustBankLineUnlinked> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-statement/lines/{lineId}/unlink',
    { params: { path: { agencyId, lineId } } },
  );
  return unwrapCrossubResult(result, "Couldn't unmatch the bank line");
}

// --------------------------------------------------------------------------- Reports

export async function fetchTrustReceiptsReport(
  agencyId: string,
  bankAccountId: string,
  query: TrustReportQuery = {},
): Promise<TrustCashReport> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/reports/receipts',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the receipts report");
}

export async function fetchTrustWithdrawalsReport(
  agencyId: string,
  bankAccountId: string,
  query: TrustReportQuery = {},
): Promise<TrustCashReport> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/reports/withdrawals',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the withdrawals report");
}

export async function fetchTrustFolioBalancesReport(
  agencyId: string,
  bankAccountId: string,
  query: TrustReportQuery = {},
): Promise<TrustFolioBalanceReport> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/reports/folio-balances',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the ledger balances report");
}

export async function fetchTrustUnpresentedReport(
  agencyId: string,
  bankAccountId: string,
  query: TrustReportQuery = {},
): Promise<TrustUnpresentedReport> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/reports/unpresented-payments',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the unpresented payments report");
}

/** The report as CSV, the same rows as the screen. */
export async function downloadTrustReportCsv(
  agencyId: string,
  bankAccountId: string,
  kind: TrustReportKind,
  query: TrustReportQuery = {},
): Promise<Blob> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/reports/{kind}/csv',
    { params: { path: { agencyId, bankAccountId, kind }, query }, parseAs: 'blob' },
  );
  return unwrapCrossubResult(result, "Couldn't download the report");
}

// --------------------------------------------------------------------------- Set-up and settings (D132 amended)

/**
 * Sets up the agency's own trust account: creates its workspace when it has none (with the
 * default account codes), then its first trust bank account. Returns the workspace.
 */
export async function setupTrustAccount(
  agencyId: string,
  body: TrustAccountSetupInput,
): Promise<AgentTrustWorkspace> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/setup', {
    params: { path: { agencyId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't set up the trust account");
}

export async function updateTrustBankAccount(
  agencyId: string,
  bankAccountId: string,
  body: UpdateTrustBankAccountInput,
): Promise<TrustBankAccount> {
  const result = await crossub.PATCH('/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}', {
    params: { path: { agencyId, bankAccountId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the trust bank account");
}

// --------------------------------------------------------------------------- Fee templates (D148)

export async function fetchTrustFeeTemplates(agencyId: string, includeArchived = false): Promise<TrustFeeTemplate[]> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/fee-templates', {
    params: { path: { agencyId }, query: { includeArchived } },
  });
  return unwrapCrossubResult(result, "Couldn't load the fee templates");
}

export async function createTrustFeeTemplate(
  agencyId: string,
  body: TrustFeeTemplateRuleInput,
): Promise<TrustFeeTemplate> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/fee-templates', {
    params: { path: { agencyId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't add the fee template");
}

export async function updateTrustFeeTemplate(
  agencyId: string,
  templateId: string,
  body: UpdateTrustFeeTemplateInput,
): Promise<TrustFeeTemplate> {
  const result = await crossub.PATCH('/agent/agencies/{agencyId}/trust/fee-templates/{templateId}', {
    params: { path: { agencyId, templateId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the fee template");
}

export async function deleteTrustFeeTemplate(agencyId: string, templateId: string): Promise<void> {
  const result = await crossub.DELETE('/agent/agencies/{agencyId}/trust/fee-templates/{templateId}', {
    params: { path: { agencyId, templateId } },
  });
  if (result.error) unwrapCrossubResult(result, "Couldn't delete the fee template");
}

export async function setTrustFeeTemplateArchived(
  agencyId: string,
  templateId: string,
  archived: boolean,
): Promise<TrustFeeTemplate> {
  const params = { path: { agencyId, templateId } };
  const result = archived
    ? await crossub.POST('/agent/agencies/{agencyId}/trust/fee-templates/{templateId}/archive', { params })
    : await crossub.POST('/agent/agencies/{agencyId}/trust/fee-templates/{templateId}/restore', { params });
  return unwrapCrossubResult(result, archived ? "Couldn't archive the fee template" : "Couldn't restore the fee template");
}

export async function createTrustAccountCode(
  agencyId: string,
  body: CreateTrustAccountCodeInput,
): Promise<TrustAccountCode> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/account-codes', {
    params: { path: { agencyId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't add the account code");
}

export async function updateTrustAccountCode(
  agencyId: string,
  accountCodeId: string,
  body: UpdateTrustAccountCodeInput,
): Promise<TrustAccountCode> {
  const result = await crossub.PATCH('/agent/agencies/{agencyId}/trust/account-codes/{accountCodeId}', {
    params: { path: { agencyId, accountCodeId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the account code");
}

// --------------------------------------------------------------------------- Ledger upkeep

export async function openTrustLedger(
  agencyId: string,
  bankAccountId: string,
  body: OpenTrustLedgerInput,
): Promise<TrustLedger> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/ledgers', {
    params: { path: { agencyId, bankAccountId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't open the ledger");
}

export async function fetchTrustFolioSync(
  agencyId: string,
  bankAccountId: string,
): Promise<TrustFolioSyncPreview> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/folio-sync',
    { params: { path: { agencyId, bankAccountId } } },
  );
  return unwrapCrossubResult(result, "Couldn't load the owners and tenants without a ledger");
}

export async function runTrustFolioSync(agencyId: string, bankAccountId: string): Promise<TrustFolioSyncResult> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/folio-sync',
    { params: { path: { agencyId, bankAccountId } } },
  );
  return unwrapCrossubResult(result, "Couldn't open the ledgers");
}

export async function updateTrustLedger(
  agencyId: string,
  ledgerId: string,
  body: UpdateTrustLedgerInput,
): Promise<TrustLedger> {
  const result = await crossub.PATCH('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the ledger");
}

export async function closeTrustLedger(agencyId: string, ledgerId: string): Promise<TrustLedger> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/close', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't close the ledger");
}

export async function fetchTrustPayoutMethods(agencyId: string, ledgerId: string): Promise<TrustPayoutMethods> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/payout-methods', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the payout details");
}

/** Replaces every payout method; account numbers go in plain and are never returned. */
export async function putTrustPayoutMethods(
  agencyId: string,
  ledgerId: string,
  body: PutTrustPayoutMethodsInput,
): Promise<TrustPayoutMethods> {
  const result = await crossub.PUT('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/payout-methods', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the payout details");
}

export async function setTrustPayoutSchedule(
  agencyId: string,
  ledgerId: string,
  body: SetTrustPayoutScheduleInput,
): Promise<TrustPayoutMethods> {
  const result = await crossub.PATCH('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/payout-schedule', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the payout schedule");
}

// --------------------------------------------------------------------------- Fee assignments (D149)

export async function fetchTrustFeeAssignments(agencyId: string, ledgerId: string): Promise<TrustFeeAssignments> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/fee-assignments', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the fees");
}

export async function createTrustFeeAssignment(
  agencyId: string,
  ledgerId: string,
  body: CreateTrustFeeAssignmentInput,
): Promise<TrustFeeAssignments> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/fee-assignments', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't add the fee");
}

export async function addTrustFeeAssignmentVersion(
  agencyId: string,
  ledgerId: string,
  assignmentId: string,
  body: AddTrustFeeAssignmentVersionInput,
): Promise<TrustFeeAssignments> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/fee-assignments/{assignmentId}/versions',
    { params: { path: { agencyId, ledgerId, assignmentId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't change the fee");
}

export async function resolveTrustMissedFeePeriod(
  agencyId: string,
  ledgerId: string,
  assignmentId: string,
  body: ResolveTrustMissedFeePeriodInput,
): Promise<TrustFeeAssignments> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/fee-assignments/{assignmentId}/missed-periods',
    { params: { path: { agencyId, ledgerId, assignmentId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't settle the missed period");
}

export async function setTrustBond(
  agencyId: string,
  ledgerId: string,
  body: SetTrustBondInput,
): Promise<TrustRentProfile> {
  const result = await crossub.PUT('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/bond', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the bond");
}

export async function resetTrustRent(
  agencyId: string,
  ledgerId: string,
  body: ResetTrustRentInput,
): Promise<TrustLedger> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/rent-reset', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't reset the rent");
}

export async function fetchTrustWithholds(agencyId: string, ledgerId: string): Promise<TrustWithholds> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/withholds', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the held amounts");
}

export async function createTrustWithhold(
  agencyId: string,
  ledgerId: string,
  body: CreateTrustWithholdInput,
): Promise<TrustWithhold> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/withholds', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't hold the amount");
}

export async function releaseTrustWithhold(
  agencyId: string,
  withholdId: string,
  body: ReleaseTrustWithholdInput,
): Promise<TrustWithhold> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/withholds/{withholdId}/release', {
    params: { path: { agencyId, withholdId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't release the amount");
}

export async function fetchTrustStatementPreview(
  agencyId: string,
  ledgerId: string,
  query: TrustStatementPreviewQuery = {},
): Promise<TrustStatementPreview> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/statement-preview', {
    params: { path: { agencyId, ledgerId }, query },
  });
  return unwrapCrossubResult(result, "Couldn't preview the statement");
}

// --------------------------------------------------------------------------- Bill upkeep

export async function fetchTrustBill(agencyId: string, billId: string): Promise<TrustBill> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/bills/{billId}', {
    params: { path: { agencyId, billId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the bill");
}

export async function updateTrustBill(
  agencyId: string,
  billId: string,
  body: UpdateTrustBillInput,
): Promise<TrustBill> {
  const result = await crossub.PATCH('/agent/agencies/{agencyId}/trust/bills/{billId}', {
    params: { path: { agencyId, billId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the bill");
}

export async function cancelTrustBill(
  agencyId: string,
  billId: string,
  body: CancelTrustBillInput,
): Promise<TrustBill> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/bills/{billId}/cancel', {
    params: { path: { agencyId, billId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't cancel the bill");
}

export async function downloadTrustBillAttachment(agencyId: string, billId: string): Promise<Blob> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/bills/{billId}/attachment', {
    params: { path: { agencyId, billId } },
    parseAs: 'blob',
  });
  return unwrapCrossubResult(result, "Couldn't open the attachment");
}

// --------------------------------------------------------------------------- Disbursement history

export async function fetchTrustDisbursements(
  agencyId: string,
  bankAccountId: string,
  query: TrustPageQuery = {},
): Promise<TrustDisbursementRunList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/disbursements',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the past disbursements");
}

export async function fetchTrustDisbursement(agencyId: string, runId: string): Promise<TrustDisbursementRun> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/disbursements/{runId}', {
    params: { path: { agencyId, runId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the disbursement");
}

// --------------------------------------------------------------------------- Reconciliation upkeep

/** Only the latest locked month can be revoked. */
export async function revokeTrustReconciliationLock(
  agencyId: string,
  lockId: string,
  body: RevokeTrustReconciliationInput,
): Promise<TrustReconciliationFigures> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/reconciliation-locks/{lockId}/revoke', {
    params: { path: { agencyId, lockId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't revoke the month");
}

export async function fetchTrustBankBalances(
  agencyId: string,
  bankAccountId: string,
  query: TrustBankBalancesQuery = {},
): Promise<TrustBankBalances> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bank-balances',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the bank balances");
}

/** `date` is YYYY-MM-DD. */
export async function removeTrustBankBalance(
  agencyId: string,
  bankAccountId: string,
  date: string,
): Promise<TrustBankBalance> {
  const result = await crossub.DELETE(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bank-balances/{date}',
    { params: { path: { agencyId, bankAccountId, date } } },
  );
  return unwrapCrossubResult(result, "Couldn't remove the bank balance");
}

// --------------------------------------------------------------------------- Rent rates, move-out, corrections (PRD phase 4)

/** Add a dated rent rate, or change the amount on that date; re-rates the current coverage. */
export async function setTrustRentRate(
  agencyId: string,
  ledgerId: string,
  body: SetTrustRentRateInput,
): Promise<TrustLedger> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/rent-rates', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the rent rate");
}

/** Remove a dated rent rate added by mistake. */
export async function removeTrustRentRate(agencyId: string, ledgerId: string, rateId: string): Promise<TrustLedger> {
  const result = await crossub.DELETE('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/rent-rates/{rateId}', {
    params: { path: { agencyId, ledgerId, rateId } },
  });
  return unwrapCrossubResult(result, "Couldn't remove the rent rate");
}

/** What setting the move-out would do (rent paid past it, owner funds); posts nothing. */
export async function previewTrustMoveOut(
  agencyId: string,
  ledgerId: string,
  body: SetTrustMoveOutInput,
): Promise<TrustMoveOutPreview> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/move-out/preview', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't preview the move-out");
}

/** Set or clear the move-out; rent paid past it moves to the tenant deposit, all or nothing. */
export async function setTrustMoveOut(
  agencyId: string,
  ledgerId: string,
  body: SetTrustMoveOutInput,
): Promise<TrustLedger> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/move-out', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't set the move-out");
}

/** Allocation and move-out corrections touching a tenant folio, newest first. */
export async function fetchTrustLedgerCorrections(
  agencyId: string,
  ledgerId: string,
): Promise<TrustAllocationCorrectionList> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/corrections', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the corrections");
}

/** Preview moving part of a receipt's Rent or Deposit elsewhere; posts nothing. */
export async function previewTrustCorrection(
  agencyId: string,
  transactionId: string,
  body: CorrectTrustAllocationInput,
): Promise<TrustCorrectionPreview> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/transactions/{transactionId}/correction-preview', {
    params: { path: { agencyId, transactionId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't preview the correction");
}

/** Correct a receipt's allocation: all journals and paid-to in one go, or nothing. */
export async function confirmTrustCorrection(
  agencyId: string,
  transactionId: string,
  body: ConfirmTrustCorrectionInput,
): Promise<TrustAllocationCorrection> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/transactions/{transactionId}/corrections', {
    params: { path: { agencyId, transactionId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't correct the allocation");
}

/** The corrections of one receipt, oldest first. */
export async function fetchTrustTransactionCorrections(
  agencyId: string,
  transactionId: string,
): Promise<TrustAllocationCorrectionList> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/transactions/{transactionId}/corrections', {
    params: { path: { agencyId, transactionId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the corrections");
}
