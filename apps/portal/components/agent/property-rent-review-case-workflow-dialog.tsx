'use client';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { RentReviewWorkflowTimeline } from '@/components/rent-review/rent-review-workflow-timeline';
import type { RentReviewCase } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export function PropertyRentReviewCaseWorkflowDialog({
  open,
  onClose,
  review,
}: {
  open: boolean;
  onClose: () => void;
  review: RentReviewCase | null;
}) {
  if (!review) return null;

  const name = workflowCaseReferenceLabel(review.id, 'rent_review');

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title="Rent review"
      subtitle={`${name} · ${review.status}`}
      size="xl"
    >
      <RentReviewWorkflowTimeline review={review} />
    </CaseDetailDialog>
  );
}
