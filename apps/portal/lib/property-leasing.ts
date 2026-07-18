import type { Inspection, LeasingRecord, Property, RentReviewCase } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

/** True when the property profile has a real tenant name (not vacant placeholders). */
export function hasRealTenantName(name: string | null | undefined): boolean {
  const normalized = (name ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return !(
    normalized === 'vacant' ||
    normalized === '—' ||
    normalized === '-' ||
    normalized === '–' ||
    normalized === 'n/a' ||
    normalized === 'na' ||
    normalized === 'none' ||
    normalized === 'nil' ||
    normalized === 'tbc' ||
    normalized === 'unknown'
  );
}

/**
 * Whether the property currently has a tenant on file.
 * Used to show/hide “Tenant moved out?” — only relevant when a tenant exists.
 */
export function propertyHasCurrentTenant(
  property: Property,
  currentTenancy: LeasingRecord[] = [],
): boolean {
  if (currentTenancy.length > 0) return true;
  if (property.leaseStatus === 'vacant') return false;
  return hasRealTenantName(property.tenantName);
}

export function isPropertyVacant(
  property: Property,
  currentTenancy: LeasingRecord[] = [],
): boolean {
  return !propertyHasCurrentTenant(property, currentTenancy);
}

/** Match portfolio rent reviews to a property by id, with address fallback when id is missing. */
export function rentReviewsForProperty(
  reviews: RentReviewCase[],
  propertyId: string,
  property?: Pick<Property, 'address' | 'suburb' | 'state' | 'postcode'>,
): RentReviewCase[] {
  const fullAddress = property ? formatPropertyFullAddress(property).toLowerCase() : '';
  return reviews.filter((review) => {
    if (review.propertyId === propertyId) return true;
    if (!property || review.propertyId) return false;
    const reviewAddress = (review.propertyAddress ?? '').toLowerCase();
    return (
      reviewAddress.length > 0 &&
      (reviewAddress === fullAddress ||
        reviewAddress.includes(fullAddress) ||
        fullAddress.includes(reviewAddress))
    );
  });
}

export function isTenancyInspection(type: Inspection['type']): boolean {
  return type === 'INGOING' || type === 'OUTGOING' || type === 'ROUTINE';
}

export function filterTenancyInspections(
  inspections: Inspection[],
  isVacant: boolean,
): Inspection[] {
  if (isVacant) return [];
  return inspections.filter((i) => i.type !== 'OPEN' && isTenancyInspection(i.type));
}

export function filterTenancyRentReviews(
  reviews: RentReviewCase[],
  isVacant: boolean,
): RentReviewCase[] {
  if (isVacant) return [];
  return reviews;
}

export const VACANT_TENANCY_INSPECTIONS_HINT =
  'Ingoing, outgoing, and routine inspections are scheduled after a lease is approved. Open inspections for new listings are managed under Leasing.';

export const VACANT_RENT_REVIEW_HINT =
  'Rent reviews are scheduled after a lease is approved and the tenant has moved in.';

export function getActiveOpenInspection(
  inspections: Inspection[],
  propertyId: string,
): Inspection | undefined {
  return inspections.find(
    (i) =>
      i.propertyId === propertyId &&
      i.type === 'OPEN' &&
      !i.status.toLowerCase().includes('complete'),
  );
}

export function isInOpenInspectionPhase({
  isVacant,
  currentLease,
  activeOpenInspection,
}: {
  isVacant: boolean;
  currentLease?: LeasingRecord;
  activeOpenInspection?: Inspection;
}): boolean {
  if (!activeOpenInspection) return false;
  return isVacant || !currentLease;
}

export function getActiveOutgoingInspection(
  inspections: Inspection[],
  propertyId: string,
): Inspection | undefined {
  return inspections.find(
    (i) =>
      i.propertyId === propertyId &&
      i.type === 'OUTGOING' &&
      !i.status.toLowerCase().includes('complete'),
  );
}
export function getNextRentReviewDate(
  property: Property,
  reviews: RentReviewCase[],
  options?: { isVacant?: boolean },
): string | null {
  if (options?.isVacant) return null;
  if (property.nextRentReview) return property.nextRentReview;

  const upcoming = [...reviews]
    .filter((r) => {
      const status = r.status.toLowerCase();
      return !status.includes('complete') && !status.includes('confirmed');
    })
    .sort((a, b) => new Date(a.reviewDue).getTime() - new Date(b.reviewDue).getTime());

  return upcoming[0]?.reviewDue ?? null;
}

export function getNextRentReviewCase(
  property: Property,
  reviews: RentReviewCase[],
  options?: { isVacant?: boolean },
): RentReviewCase | null {
  if (options?.isVacant) return null;

  const upcoming = [...reviews]
    .filter((r) => {
      const status = r.status.toLowerCase();
      return !status.includes('complete') && !status.includes('confirmed');
    })
    .sort((a, b) => new Date(a.reviewDue).getTime() - new Date(b.reviewDue).getTime());

  if (property.nextRentReview) {
    return (
      upcoming.find((r) => r.reviewDue === property.nextRentReview) ?? upcoming[0] ?? null
    );
  }

  return upcoming[0] ?? null;
}
