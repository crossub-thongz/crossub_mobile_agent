import type { Inspection, LeasingRecord, Property, RentReviewCase } from '@/lib/types';

export function isPropertyVacant(
  property: Property,
  currentTenancy: LeasingRecord[] = [],
): boolean {
  return (
    property.leaseStatus === 'vacant' ||
    property.tenantName.trim().toLowerCase() === 'vacant' ||
    currentTenancy.length === 0
  );
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
