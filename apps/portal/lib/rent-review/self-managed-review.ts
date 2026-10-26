import {
  LEASE_RENEWAL_ARRANGEMENT,
  TENANCY_REVIEW_CLOSE_OUTCOME,
  TENANCY_REVIEW_CLOSE_STATES,
  TENANCY_REVIEW_COPY,
  TENANCY_REVIEW_KIND,
  TENANCY_REVIEW_NOTICE_UPLOAD_STATES,
  TENANCY_REVIEW_PATHWAY_STATES,
  TENANCY_REVIEW_POSTPONE_STATES,
  TENANCY_REVIEW_RESEARCH_STATES,
  TENANCY_REVIEW_STATE,
  type LeaseRenewalArrangement,
  type TenancyReviewCloseOutcome,
} from '@/constants/self-managed-tenancy-review';
import type {
  LeaseRenewalInput,
  TenancyReviewCloseInput,
} from '@/lib/crossub-api/agent-tenancy-review-client';
import { rentReviewApi } from '@/lib/rent-review-api';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';

/**
 * Self-Manage writes go through the agent facade and return the review; re-read it on the existing
 * read path so the store keeps one shape. Throws when the review has no property to scope by.
 */
export async function runSelfManagedReviewWrite(
  detail: RentReviewWorkflowDetail,
  write: (propertyId: string, reviewId: string) => Promise<unknown>,
): Promise<RentReviewWorkflowDetail> {
  if (!detail.propertyId) throw new Error(TENANCY_REVIEW_COPY.noProperty);
  await write(detail.propertyId, detail.id);
  return rentReviewApi.get(detail.id, detail.leaseEndDate);
}

export type SelfManagedReviewActions = {
  choosePathway: boolean;
  leaseRenewalForm: boolean;
  marketResearch: boolean;
  uploadNotice: boolean;
  reserveNotice: boolean;
  leaseExtension: boolean;
  reopenNegotiation: boolean;
  postpone: boolean;
  close: boolean;
};

/** Which admin-portal steps the agency can run on the review right now. The server re-checks. */
export function selfManagedReviewActions(detail: RentReviewWorkflowDetail): SelfManagedReviewActions {
  const state = detail.workflowState;
  const renewal = detail.reviewKind === TENANCY_REVIEW_KIND.LEASE_RENEWAL;
  const accepted = state === TENANCY_REVIEW_STATE.TENANT_ACCEPTED;
  return {
    choosePathway: TENANCY_REVIEW_PATHWAY_STATES.includes(state),
    leaseRenewalForm: renewal && state === TENANCY_REVIEW_STATE.PENDING_CONFIRMATION,
    marketResearch: !renewal && TENANCY_REVIEW_RESEARCH_STATES.includes(state),
    uploadNotice: TENANCY_REVIEW_NOTICE_UPLOAD_STATES.includes(state),
    reserveNotice: state === TENANCY_REVIEW_STATE.TENANT_NOTIFIED,
    leaseExtension: accepted,
    reopenNegotiation: accepted,
    postpone: TENANCY_REVIEW_POSTPONE_STATES.includes(state),
    close: TENANCY_REVIEW_CLOSE_STATES.includes(state),
  };
}

export function hasAnySelfManagedReviewAction(actions: SelfManagedReviewActions): boolean {
  return Object.values(actions).some(Boolean);
}

export type LeaseRenewalForm = {
  leaseArrangement: LeaseRenewalArrangement;
  newLeaseStartDate: string;
  newLeaseEndDate: string;
  newWeeklyRent: string;
  rentIncreaseEffectiveDate: string;
};

export function leaseRenewalFormFrom(detail: RentReviewWorkflowDetail): LeaseRenewalForm {
  return {
    leaseArrangement: LEASE_RENEWAL_ARRANGEMENT.FIXED,
    newLeaseStartDate: detail.newAgreementStart ?? '',
    newLeaseEndDate: detail.newAgreementEnd ?? '',
    newWeeklyRent: '',
    rentIncreaseEffectiveDate: '',
  };
}

function optionalAmount(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const amount = Number(trimmed);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/** The renewal body, or null when a required field is missing (the server re-checks the rest). */
export function buildLeaseRenewalInput(form: LeaseRenewalForm): LeaseRenewalInput | null {
  const start = form.newLeaseStartDate.trim();
  const fixed = form.leaseArrangement === LEASE_RENEWAL_ARRANGEMENT.FIXED;
  const end = form.newLeaseEndDate.trim();
  if (!start || (fixed && !end)) return null;
  const weekly = optionalAmount(form.newWeeklyRent);
  if (weekly === null) return null;
  const effective = form.rentIncreaseEffectiveDate.trim();
  return {
    leaseArrangement: form.leaseArrangement,
    newLeaseStartDate: start,
    ...(fixed ? { newLeaseEndDate: end } : {}),
    ...(weekly !== undefined ? { newWeeklyRent: weekly } : {}),
    ...(effective ? { rentIncreaseEffectiveDate: effective } : {}),
  };
}

export type CloseReviewForm = {
  outcome: TenancyReviewCloseOutcome;
  newWeeklyRent: string;
  effectiveDate: string;
  note: string;
};

export const EMPTY_CLOSE_REVIEW_FORM: CloseReviewForm = {
  outcome: TENANCY_REVIEW_CLOSE_OUTCOME.RENT_UNCHANGED,
  newWeeklyRent: '',
  effectiveDate: '',
  note: '',
};

/** The close body, or null when a rent increase is missing its rent or date. */
export function buildCloseReviewInput(form: CloseReviewForm): TenancyReviewCloseInput | null {
  const note = form.note.trim();
  if (form.outcome !== TENANCY_REVIEW_CLOSE_OUTCOME.RENT_INCREASED) {
    return { outcome: form.outcome, ...(note ? { note } : {}) };
  }
  const weekly = optionalAmount(form.newWeeklyRent);
  const effective = form.effectiveDate.trim();
  if (weekly == null || !effective) return null;
  return {
    outcome: form.outcome,
    newWeeklyRent: weekly,
    effectiveDate: effective,
    ...(note ? { note } : {}),
  };
}
