import type { components } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/**
 * Self-Manage Tenancy Review: the rent-review and lease-renewal steps CROSSUB runs from the admin
 * portal, run by the agent (`/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/*`).
 * Self-Manage properties only — the server returns 403 for every other plan. Each write returns
 * the updated review; callers re-read it on the existing read path (`rentReviewApi.get`).
 */

type Schemas = components['schemas'];

export type AgentTenancyReviewResult = Schemas['AgentRentReviewResultDto'];
export type TenancyReviewKindInput = Schemas['SetTenancyReviewKindDto'];
export type LeaseRenewalInput = Schemas['CompleteLeaseRenewalDto'];
export type TenancyReviewConfirmInput = Schemas['ConfirmReviewDto'];
export type TenancyReviewPdfInput = Schemas['UploadRentReviewPdfDto'];
export type TenancyReviewSignedPdfInput = Schemas['UploadSignedLeaseAgreementDto'];
export type TenancyReviewReviseInput = Schemas['ReviseLeaseAgreementDto'];
export type TenancyReviewNoticeInput = Schemas['SendTenantNoticeDto'];
export type TenancyReviewReserveNoticeInput = Schemas['ReserveTenantNoticeDto'];
export type TenancyReviewResolveInput = Schemas['ResolveNegotiationDto'];
export type TenancyReviewReopenInput = Schemas['ReopenNegotiationDto'];
export type TenancyReviewCloseInput = Schemas['ForceCloseRentReviewDto'];

const path = (propertyId: string, reviewId: string) => ({ path: { propertyId, reviewId } });

export async function chooseTenancyReviewKind(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewKindInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.PATCH(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/review-kind',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't choose the pathway");
}

export async function completeTenancyReviewLeaseRenewal(
  propertyId: string,
  reviewId: string,
  body: LeaseRenewalInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.PATCH(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/complete-lease-renewal',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't complete the lease renewal");
}

export async function confirmTenancyReview(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewConfirmInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.PATCH(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/confirm',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't confirm the pathway");
}

export async function postponeTenancyReview(
  propertyId: string,
  reviewId: string,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.PATCH(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/postpone',
    { params: path(propertyId, reviewId) },
  );
  return unwrapCrossubResult(result, "Couldn't postpone the review");
}

export async function runTenancyReviewMarketResearch(
  propertyId: string,
  reviewId: string,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/market-research',
    { params: path(propertyId, reviewId) },
  );
  return unwrapCrossubResult(result, "Couldn't run the market research");
}

export async function uploadTenancyReviewNotice(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewPdfInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/notice-of-rent-increase/upload',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't upload the notice");
}

export async function uploadTenancyReviewLeaseExtension(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewPdfInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/lease-extension-agreement/upload',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't upload the lease extension agreement");
}

export async function uploadTenancyReviewSignedLeaseExtension(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewSignedPdfInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/lease-extension-agreement/signed-upload',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't record the signed agreement");
}

export async function reviseTenancyReviewLeaseExtension(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewReviseInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/lease-extension-agreement/revise',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't withdraw the agreement");
}

export async function sendTenancyReviewNotice(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewNoticeInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/tenant-notice',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't send the notice");
}

export async function reserveTenancyReviewNotice(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewReserveNoticeInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/tenant-notice/reserve',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't serve the notice again");
}

export async function resolveTenancyReviewNegotiation(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewResolveInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.PATCH(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/resolve-negotiation',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't resolve the negotiation");
}

export async function reopenTenancyReviewNegotiation(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewReopenInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/negotiation/reopen',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't reopen the negotiation");
}

export async function closeTenancyReview(
  propertyId: string,
  reviewId: string,
  body: TenancyReviewCloseInput,
): Promise<AgentTenancyReviewResult> {
  const result = await crossub.PATCH(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/force-close',
    { params: path(propertyId, reviewId), body },
  );
  return unwrapCrossubResult(result, "Couldn't close the review");
}
