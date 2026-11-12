import {
  leaseAgreementSignedAt,
  shouldShowSignedLeaseAgreement,
} from '@/lib/rent-review/tenant-decision-display';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';

/** Workflow states that can already have a tenant-signed lease extension on file. */
const SIGNED_LEASE_STATES = new Set(['tenant_accepted', 'accounting', 'completed']);

const PDF_NAME = /([A-Za-z0-9_][A-Za-z0-9_.()\- ]{0,180}\.pdf)/i;

export type SignedLeasePropertyDocument = {
  id: string;
  title: string;
  uploadedAt: string;
  href: string;
};

/**
 * List rows use the portfolio enum (`TENANT_ACCEPTED`) while workflow detail uses
 * the lowercase state. Either form means the review may already hold a signed PDF.
 */
export function rentReviewMayIncludeSignedLease(review: {
  workflowState?: string | null;
  status?: string | null;
}): boolean {
  const state = (review.workflowState ?? '').trim().toLowerCase();
  if (SIGNED_LEASE_STATES.has(state)) return true;
  const status = (review.status ?? '').trim().toLowerCase();
  return status === 'completed' || status === 'accounting' || status === 'tenant accepted';
}

function signedLeaseFileName(detail: RentReviewWorkflowDetail): string {
  const entry = [...detail.auditLog]
    .reverse()
    .find((event) => event.kind === 'lease_agreement_signed');
  const text = `${entry?.detail ?? ''} ${entry?.message ?? ''}`;
  const fromAudit = text.match(PDF_NAME)?.[1]?.trim();
  if (fromAudit) return fromAudit;
  return `lease-agreement-signed-${detail.id.slice(0, 8)}.pdf`;
}

/** Authenticated PDF the tenant-decision card already opens for this review. */
export function signedLeaseExtensionPdfHref(
  detail: RentReviewWorkflowDetail,
  propertyId: string,
): string {
  const params = new URLSearchParams();
  if (detail.proposedWeeklyRent != null && Number.isFinite(detail.proposedWeeklyRent)) {
    params.set('weekly', String(detail.proposedWeeklyRent));
  }
  const query = params.toString();
  return `/api/v1/agent/properties/${encodeURIComponent(propertyId)}/workflows/rent-review/${encodeURIComponent(detail.id)}/lease-extension-agreement.pdf${query ? `?${query}` : ''}`;
}

/**
 * A signed rent-review agreement is stored on the workflow, not as a property
 * portal document. Shape it like a checklist upload so Lease Extension Agreement
 * can list it beside files uploaded on the Documents tab.
 */
export function signedLeaseExtensionPropertyDocument(
  detail: RentReviewWorkflowDetail,
  propertyId: string,
): SignedLeasePropertyDocument | null {
  if (!propertyId.trim() || !shouldShowSignedLeaseAgreement(detail)) return null;
  if (detail.propertyId && detail.propertyId !== propertyId) return null;

  const fileName = signedLeaseFileName(detail);
  const uploadedAt =
    leaseAgreementSignedAt(detail) ?? detail.completedDate ?? detail.createdAt;
  if (!uploadedAt) return null;

  return {
    id: `rent-review-lease:${detail.id}`,
    title: `Lease Extension Agreement — ${fileName}`,
    uploadedAt,
    href: signedLeaseExtensionPdfHref(detail, propertyId),
  };
}

export function isSignedLeaseAlreadyInDocuments(
  documents: { id?: string; title: string; uploadedAt?: string }[],
  document: SignedLeasePropertyDocument,
): boolean {
  if (documents.some((row) => row.id === document.id)) return true;
  const fileName = document.title.split(' — ').slice(1).join(' — ').trim().toLowerCase();
  if (!fileName) return false;
  // An older Lease Extension file can share the uploaded name. Only treat it as the
  // same record when the portal row was stored at the same time as the signature.
  const signedAt = Date.parse(document.uploadedAt);
  if (!Number.isFinite(signedAt)) return false;
  return documents.some((row) => {
    if (!row.uploadedAt || !row.title.toLowerCase().includes(fileName)) return false;
    const existingAt = Date.parse(row.uploadedAt);
    return Number.isFinite(existingAt) && Math.abs(existingAt - signedAt) < 60_000;
  });
}
