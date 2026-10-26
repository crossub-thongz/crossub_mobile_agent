import {
  TRUST_ATTACHMENT_MIME_TYPES,
  TRUST_INVOICE_LIMITS,
  TRUST_INVOICE_STATUS,
  TRUST_NEW_INVOICE_COPY,
  type TrustAttachmentMimeType,
} from '@/constants/trust-invoices';
import type {
  TrustAttachmentInput,
  TrustBillsSummary,
  TrustTenantInvoice,
} from '@/lib/crossub-api/agent-trust-invoices-client';
import { fileToBase64 } from '@/lib/file-upload';

/** Due bills the owners can fund: due minus those without enough funds. */
export function billsReadyToPay(summary: TrustBillsSummary): { count: number; cents: number } {
  return {
    count: Math.max(0, summary.billsDueCount - summary.insufficientCount),
    cents: Math.max(0, summary.billsDueCents - summary.insufficientCents),
  };
}

/** Outstanding invoices not yet past their due date. */
export function invoicesNotYetDue(summary: TrustBillsSummary): { count: number; cents: number } {
  return {
    count: Math.max(0, summary.invoicesOutstandingCount - summary.invoicesOverdueCount),
    cents: Math.max(0, summary.invoicesOutstandingCents - summary.invoicesOverdueCents),
  };
}

/** Only an invoice with nothing paid against it, and not already cancelled, can be cancelled. */
export function canCancelTrustInvoice(invoice: TrustTenantInvoice): boolean {
  return invoice.paidCents === 0 && invoice.status !== TRUST_INVOICE_STATUS.CANCELLED;
}

function isTrustAttachmentMimeType(mimeType: string): mimeType is TrustAttachmentMimeType {
  return (TRUST_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Why a picked file cannot be attached, or null when it can. */
export function trustAttachmentProblem(file: File): string | null {
  if (!isTrustAttachmentMimeType(file.type)) return TRUST_NEW_INVOICE_COPY.attachmentType;
  if (file.size > TRUST_INVOICE_LIMITS.attachmentBytesMax) return TRUST_NEW_INVOICE_COPY.attachmentTooBig;
  return null;
}

/** A picked file as the API takes it (base64, no data: prefix). Throws on a file it would refuse. */
export async function toTrustAttachment(file: File): Promise<TrustAttachmentInput> {
  const problem = trustAttachmentProblem(file);
  if (problem || !isTrustAttachmentMimeType(file.type)) throw new Error(problem ?? TRUST_NEW_INVOICE_COPY.attachmentType);
  return {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    contentBase64: await fileToBase64(file),
  };
}
