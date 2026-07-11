'use client';

import { Trash2 } from 'lucide-react';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { LeasingWorkflowTimeline } from '@/components/leasing-workflow/leasing-workflow-timeline';
import { RentReviewWorkflowTimeline } from '@/components/rent-review/rent-review-workflow-timeline';
import { VacatingWorkflowTimeline } from '@/components/vacating-workflow/vacating-workflow-timeline';
import { Button } from '@/components/ui/button';
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
  onCaseClosed,
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
  onCaseClosed?: () => void;
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
        onCaseClosed={onCaseClosed}
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
  onCaseClosed,
  onDeleteCase,
  canDeleteCase,
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
  onCaseClosed?: () => void;
  onDeleteCase?: (item: PropertyLeasingWorkflowCase) => void;
  canDeleteCase?: (item: PropertyLeasingWorkflowCase) => boolean;
}) {
  if (!item) return null;

  const deletable = canDeleteCase?.(item) ?? false;

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title={LEASING_CATEGORY_LABEL[item.category]}
      subtitle={`${item.label} · ${item.currentStep}`}
      size="xl"
      headerActions={
        deletable && onDeleteCase ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive h-8 gap-1.5 text-xs"
            onClick={() => onDeleteCase(item)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        ) : null
      }
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
        onCaseClosed={onCaseClosed}
      />
    </CaseDetailDialog>
  );
}
