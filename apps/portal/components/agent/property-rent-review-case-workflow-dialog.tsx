'use client';

import { Trash2 } from 'lucide-react';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { RentReviewWorkflowTimeline } from '@/components/rent-review/rent-review-workflow-timeline';
import { Button } from '@/components/ui/button';
import { rentReviewWorkflowProgress } from '@/lib/case-workflows';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import type { RentReviewCase } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

function RentReviewCaseDialogSummary({ review }: { review: RentReviewCase }) {
  const progress = rentReviewWorkflowProgress(review);

  return (
    <section className="bg-card mb-4 rounded-xl border p-3 md:mb-3 md:p-4">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {workflowCaseReferenceLabel(review.id, 'rent_review')}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{review.propertyAddress}</p>
      {review.tenantName ? (
        <p className="text-muted-foreground mt-0.5 text-xs">{review.tenantName}</p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Current rent</p>
          <p className="font-medium tabular-nums">{formatCurrency(review.currentRent)}/wk</p>
        </div>
        <div>
          <p className="text-muted-foreground">Review due</p>
          <p className="font-medium">{formatDate(review.reviewDue)}</p>
        </div>
      </div>
      <p className="text-primary mt-3 text-xs font-medium">{progress.currentStepLabel}</p>
    </section>
  );
}

export function PropertyRentReviewCaseWorkflowDialog({
  open,
  onClose,
  review,
  canDelete = false,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  review: RentReviewCase | null;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  if (!review) return null;

  const name = workflowCaseReferenceLabel(review.id, 'rent_review');
  const progress = rentReviewWorkflowProgress(review);

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title="Rent review"
      subtitle={
        <>
          <span className="text-primary font-medium tabular-nums">{name}</span>
          <span className="hidden sm:inline"> · {progress.currentStepLabel}</span>
        </>
      }
      size={JOB_CASE_DIALOG_SIZE}
      headerActions={
        canDelete && onDelete ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive h-8 gap-1.5 text-xs"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        ) : null
      }
    >
      <RentReviewCaseDialogSummary review={review} />
      <RentReviewWorkflowTimeline review={review} />
    </CaseDetailDialog>
  );
}
