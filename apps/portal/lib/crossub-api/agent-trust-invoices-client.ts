import type { components, operations } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/**
 * Self-Manage tenant invoices and the rent extras on the agent facade,
 * `/agent/agencies/{agencyId}/trust/*`: invoices, the Bills & Invoices tiles, the tenant receipt
 * preview, a tenant's history, a folio's month summary and moving a held deposit to rent. Same
 * 404 rule as `agent-trust-client.ts`.
 */

export type TrustTenantInvoice = components['schemas']['TrustTenantInvoiceDto'];
export type TrustTenantInvoiceList = components['schemas']['TrustTenantInvoiceListDto'];
export type TrustInvoicePayment = components['schemas']['TrustInvoicePaymentDto'];
export type CreateTrustTenantInvoiceInput = components['schemas']['CreateTenantInvoiceDto'];
export type TrustAttachmentInput = NonNullable<CreateTrustTenantInvoiceInput['attachment']>;
export type CancelTrustTenantInvoiceInput = components['schemas']['TrustCancelDocumentDto'];
export type TrustBillsSummary = components['schemas']['TrustBillsSummaryDto'];
export type TrustReceiptPreview = components['schemas']['TrustReceiptPreviewDto'];
export type TrustRentPreview = components['schemas']['TrustRentPreviewDto'];
export type TrustTenantHistory = components['schemas']['TrustTenantHistoryDto'];
export type TrustTenantHistoryRow = components['schemas']['TrustTenantHistoryRowDto'];
export type TrustLedgerSummary = components['schemas']['TrustLedgerSummaryDto'];
export type TransferTrustDepositInput = components['schemas']['TransferDepositDto'];
export type TrustTransactionResult = components['schemas']['TrustTransactionDto'];

export type ListTrustTenantInvoicesQuery = NonNullable<
  operations['AgentTrustInvoicesController_listInvoices']['parameters']['query']
>;
export type TrustReceiptPreviewQuery =
  operations['AgentTrustInvoicesController_tenantReceiptPreview']['parameters']['query'];
export type TrustRentPreviewQuery =
  operations['AgentTrustInvoicesController_rentPreview']['parameters']['query'];
export type TrustTenantHistoryQuery = NonNullable<
  operations['AgentTrustInvoicesController_tenantHistory']['parameters']['query']
>;

// --------------------------------------------------------------------------- Tenant invoices

export async function fetchTrustTenantInvoices(
  agencyId: string,
  bankAccountId: string,
  query: ListTrustTenantInvoicesQuery = {},
): Promise<TrustTenantInvoiceList> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/tenant-invoices',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't load the invoices");
}

/** Issuing writes no ledger entry; the tenant pays it through a tenant receipt. */
export async function createTrustTenantInvoice(
  agencyId: string,
  bankAccountId: string,
  body: CreateTrustTenantInvoiceInput,
): Promise<TrustTenantInvoice> {
  const result = await crossub.POST(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/tenant-invoices',
    { params: { path: { agencyId, bankAccountId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't create the invoice");
}

export async function fetchTrustTenantInvoice(agencyId: string, invoiceId: string): Promise<TrustTenantInvoice> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/tenant-invoices/{invoiceId}', {
    params: { path: { agencyId, invoiceId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the invoice");
}

/** Only an invoice with nothing paid against it can be cancelled. */
export async function cancelTrustTenantInvoice(
  agencyId: string,
  invoiceId: string,
  body: CancelTrustTenantInvoiceInput,
): Promise<TrustTenantInvoice> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/tenant-invoices/{invoiceId}/cancel', {
    params: { path: { agencyId, invoiceId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't cancel the invoice");
}

export async function downloadTrustTenantInvoiceAttachment(agencyId: string, invoiceId: string): Promise<Blob> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/tenant-invoices/{invoiceId}/attachment', {
    params: { path: { agencyId, invoiceId } },
    parseAs: 'blob',
  });
  return unwrapCrossubResult(result, "Couldn't open the attachment");
}

/** A tenant ledger's open invoices, oldest due first (the receipt picker). */
export async function fetchTrustOpenInvoices(agencyId: string, ledgerId: string): Promise<TrustTenantInvoice[]> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/open-invoices', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the open invoices");
}

// --------------------------------------------------------------------------- Bills & Invoices tiles, receipt preview

export async function fetchTrustBillsSummary(agencyId: string, bankAccountId: string): Promise<TrustBillsSummary> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/bills-summary',
    { params: { path: { agencyId, bankAccountId } } },
  );
  return unwrapCrossubResult(result, "Couldn't load the bill totals");
}

/** What a tenant receipt would do; nothing is saved. */
export async function fetchTrustReceiptPreview(
  agencyId: string,
  bankAccountId: string,
  query: TrustReceiptPreviewQuery,
): Promise<TrustReceiptPreview> {
  const result = await crossub.GET(
    '/agent/agencies/{agencyId}/trust/bank-accounts/{bankAccountId}/tenant-receipt-preview',
    { params: { path: { agencyId, bankAccountId }, query } },
  );
  return unwrapCrossubResult(result, "Couldn't preview the receipt");
}

// --------------------------------------------------------------------------- Rent extras

export async function fetchTrustTenantHistory(
  agencyId: string,
  ledgerId: string,
  query: TrustTenantHistoryQuery = {},
): Promise<TrustTenantHistory> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/tenant-history', {
    params: { path: { agencyId, ledgerId }, query },
  });
  return unwrapCrossubResult(result, "Couldn't load the tenant history");
}

export async function fetchTrustLedgerSummary(agencyId: string, ledgerId: string): Promise<TrustLedgerSummary> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/summary', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the folio summary");
}

/** What a rent payment would do to the paid-to date; nothing is saved. */
export async function fetchTrustRentPreview(
  agencyId: string,
  ledgerId: string,
  query: TrustRentPreviewQuery,
): Promise<TrustRentPreview> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/rent-preview', {
    params: { path: { agencyId, ledgerId }, query },
  });
  return unwrapCrossubResult(result, "Couldn't preview the rent");
}

/** A journal tenant to owner that advances paid-to; at most the deposit held. */
export async function transferTrustDeposit(
  agencyId: string,
  ledgerId: string,
  body: TransferTrustDepositInput,
): Promise<TrustTransactionResult> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/transfer-deposit', {
    params: { path: { agencyId, ledgerId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't move the deposit to rent");
}
