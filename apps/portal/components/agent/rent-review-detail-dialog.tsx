'use client';

import { PropertyRentReviewCaseWorkflowDialog } from '@/components/agent/property-rent-review-case-workflow-dialog';
import type { DetailNavContext } from '@/lib/detail-navigation';
import type { RentReviewCase } from '@/lib/types';

/** @deprecated navContext unused — kept for call-site compatibility. */
export function RentReviewDetailDialog({
  open,
  onClose,
  review,
  navContext: _navContext,
  size: _size = 'default',
  canDelete = false,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  review: RentReviewCase | null;
  navContext?: DetailNavContext;
  size?: 'default' | 'wide' | 'xl';
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  return (
    <PropertyRentReviewCaseWorkflowDialog
      open={open}
      onClose={onClose}
      review={review}
      canDelete={canDelete}
      onDelete={onDelete}
    />
  );
}
