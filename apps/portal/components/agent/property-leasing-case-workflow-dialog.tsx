'use client';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { LeasingWorkflowTimeline } from '@/components/leasing-workflow/leasing-workflow-timeline';
import { RentReviewWorkflowTimeline } from '@/components/rent-review/rent-review-workflow-timeline';
import { VacatingWorkflowTimeline } from '@/components/vacating-workflow/vacating-workflow-timeline';
import {
  LEASING_CATEGORY_LABEL,
  type PropertyLeasingWorkflowCase,
} from '@/lib/property-leasing-workflow-cases';
import type { RentReviewDecision } from '@/lib/rent-review';
import type { Property, RentReviewCase, VacatingCase } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

export function PropertyLeasingCaseWorkflowContent({
  item,
  property,
  propertyId,
  rentReviews,
  rentReviewDecisions,
  vacatingCases,
  rentWeekly,
  onViewRentReview,
  focusBond,
  onFocusBondHandled,
}: {
  item: PropertyLeasingWorkflowCase;
  property: Property;
  propertyId: string;
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  vacatingCases: VacatingCase[];
  rentWeekly?: number;
  onViewRentReview?: (reviewId: string) => void;
  focusBond?: boolean;
  onFocusBondHandled?: () => void;
}) {
  if (item.category === 'leasing') {
    return (
      <LeasingWorkflowTimeline
        propertyId={propertyId}
        propertyAddress={formatPropertyFullAddress(property)}
        rentWeekly={rentWeekly}
        hideSectionLabel
        focusBond={focusBond}
        onFocusBondHandled={onFocusBondHandled}
      />
    );
  }

  if (item.category === 'end_leasing') {
    const vacatingCase = vacatingCases.find((v) => v.id === item.id);
    if (!vacatingCase) return null;
    return <VacatingWorkflowTimeline vacatingCase={vacatingCase} />;
  }

  const review = rentReviews.find((r) => r.id === item.id);
  if (!review) return null;

  return <RentReviewWorkflowTimeline review={review} />;
}

export function PropertyLeasingCaseWorkflowDialog({
  open,
  onClose,
  item,
  property,
  propertyId,
  rentReviews,
  rentReviewDecisions,
  vacatingCases,
  rentWeekly,
  onViewRentReview,
  focusBond,
  onFocusBondHandled,
}: {
  open: boolean;
  onClose: () => void;
  item: PropertyLeasingWorkflowCase | null;
  property: Property;
  propertyId: string;
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  vacatingCases: VacatingCase[];
  rentWeekly?: number;
  onViewRentReview?: (reviewId: string) => void;
  focusBond?: boolean;
  onFocusBondHandled?: () => void;
}) {
  if (!item) return null;

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title={LEASING_CATEGORY_LABEL[item.category]}
      subtitle={`${item.label} · ${item.currentStep}`}
      size="xl"
    >
      <PropertyLeasingCaseWorkflowContent
        item={item}
        property={property}
        propertyId={propertyId}
        rentReviews={rentReviews}
        rentReviewDecisions={rentReviewDecisions}
        vacatingCases={vacatingCases}
        rentWeekly={rentWeekly}
        onViewRentReview={onViewRentReview}
        focusBond={focusBond}
        onFocusBondHandled={onFocusBondHandled}
      />
    </CaseDetailDialog>
  );
}
