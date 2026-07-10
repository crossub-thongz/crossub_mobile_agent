'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { LeasingWorkflowTimeline } from '@/components/leasing-workflow/leasing-workflow-timeline';
import { VacatingWorkflowTimeline } from '@/components/vacating-workflow/vacating-workflow-timeline';
import { Button } from '@/components/ui/button';
import { rentReviewDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import {
  LEASING_CATEGORY_LABEL,
  type PropertyLeasingWorkflowCase,
} from '@/lib/property-leasing-workflow-cases';
import { isRentReviewPendingApproval, type RentReviewDecision } from '@/lib/rent-review';
import type { Property, RentReviewCase, VacatingCase } from '@/lib/types';
import { formatDate, formatPropertyFullAddress } from '@/lib/utils';

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

  return (
    <div className="space-y-2">
      <TaskStatusRow
        asLink={false}
        item={{
          id: review.id,
          propertyAddress: review.propertyAddress,
          taskLabel: `Rent review · due ${formatDate(review.reviewDue)}`,
          status: rentReviewDecisions[review.id]
            ? rentReviewDecisions[review.id]?.action === 'confirmed'
              ? 'Confirmed'
              : 'Custom amount submitted'
            : review.status,
          href: rentReviewDetail(review.id, fromProperty(propertyId, 'Leasing')),
          module: 'Rent review',
          tone: isRentReviewPendingApproval(review, rentReviewDecisions[review.id])
            ? 'warning'
            : review.tenantResponse === 'counter'
              ? 'neutral'
              : 'ok',
          requiresApproval: isRentReviewPendingApproval(review, rentReviewDecisions[review.id]),
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onViewRentReview?.(review.id)}
        >
          View details
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1 gap-1.5">
          <Link href={rentReviewDetail(review.id, fromProperty(propertyId, 'Leasing'))}>
            <ExternalLink className="size-3.5" />
            Open case
          </Link>
        </Button>
      </div>
    </div>
  );
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
