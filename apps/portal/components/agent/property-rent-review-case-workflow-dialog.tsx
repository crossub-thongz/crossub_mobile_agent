'use client';

import { Trash2 } from 'lucide-react';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { RentReviewWorkflowTimeline } from '@/components/rent-review/rent-review-workflow-timeline';
import { Button } from '@/components/ui/button';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import type { RentReviewCase } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

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

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title="Rent review"
      subtitle={`${name} · ${review.status}`}
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
            Delete
          </Button>
        ) : null
      }
    >
      <RentReviewWorkflowTimeline review={review} />
    </CaseDetailDialog>
  );
}
