import { rentReviewApi } from '@/lib/rent-review-api';

export interface RentReviewLeaseAgreementPdfOptions {
  weekly?: number;
  draft?: boolean;
  propertyId?: string;
}

export async function loadRentReviewLeaseAgreementPdf(
  reviewId: string,
  options?: RentReviewLeaseAgreementPdfOptions,
): Promise<{ blob: Blob; filename: string }> {
  const blob = await rentReviewApi.downloadLeaseExtensionAgreement(reviewId, {
    weekly: options?.weekly,
    draft: options?.draft,
    propertyId: options?.propertyId,
  });
  const prefix = options?.draft ? 'lease-agreement-presigned' : 'lease-agreement-signed';
  return {
    blob,
    filename: `${prefix}-${reviewId.slice(0, 8)}.pdf`,
  };
}

export function downloadRentReviewLeaseAgreementBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
