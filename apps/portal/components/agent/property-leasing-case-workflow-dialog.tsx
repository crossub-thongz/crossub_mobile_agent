'use client';

import { Trash2 } from 'lucide-react';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { CaseAddressAssignedBar } from '@/components/agent/case-address-assigned-bar';
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
import { isUuid } from '@/lib/file-upload';
import { formatDate, formatPropertyFullAddress } from '@/lib/utils';
import { JOB_CASE_DIALOG_SIZE, END_LEASING_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';

function LeasingCaseDialogSummary({
  item,
  property,
  vacatingCases,
}: {
  item: PropertyLeasingWorkflowCase;
  property: Property;
  vacatingCases: VacatingCase[];
}) {
  const vacatingCase =
    item.category === 'end_leasing'
      ? vacatingCases.find((row) => row.id === item.id)
      : undefined;

  return (
    <section className="mb-4 rounded-xl border bg-white p-3 md:mb-3 md:p-4 dark:bg-card">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {item.label}
      </p>
      <CaseAddressAssignedBar
        address={formatPropertyFullAddress(property)}
        assignedToName={property.propertyManager}
        titleClassName="mt-1 line-clamp-2 text-sm font-semibold leading-snug"
        subtitle={
          item.detail ? (
            <p className="text-muted-foreground line-clamp-2 text-xs">{item.detail}</p>
          ) : null
        }
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {vacatingCase?.vacateDate ? (
          <span className="text-muted-foreground">
            Vacate {formatDate(vacatingCase.vacateDate)}
          </span>
        ) : null}
        {item.status ? (
          <span className="text-muted-foreground capitalize">{item.status}</span>
        ) : null}
      </div>
      <p className="text-primary mt-3 text-xs font-medium">{item.currentStep}</p>
    </section>
  );
}

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
  onOpenInspectionCreated,
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
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  if (item.category === 'leasing') {
    return (
      <LeasingWorkflowTimeline
        propertyId={propertyId}
        leasingCycleId={isUuid(item.id) ? item.id : undefined}
        propertyAddress={formatPropertyFullAddress(property)}
        rentWeekly={rentWeekly}
        hideSectionLabel
        focusBond={focusBond}
        onFocusBondHandled={onFocusBondHandled}
        onCaseClosed={onCaseClosed}
        onOpenInspectionCreated={onOpenInspectionCreated}
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
  onOpenInspectionCreated,
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
  onOpenInspectionCreated?: (inspectionId: string) => void;
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
      subtitle={
        <>
          <span className="text-primary font-medium tabular-nums">{item.label}</span>
          <span className="hidden sm:inline"> · {item.currentStep}</span>
        </>
      }
      size={
        item.category === 'end_leasing' ? END_LEASING_CASE_DIALOG_SIZE : JOB_CASE_DIALOG_SIZE
      }
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
            <span className="hidden sm:inline">Delete</span>
          </Button>
        ) : null
      }
    >
      <LeasingCaseDialogSummary
        item={item}
        property={property}
        vacatingCases={vacatingCases}
      />
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
        onOpenInspectionCreated={onOpenInspectionCreated}
      />
    </CaseDetailDialog>
  );
}
