'use client';

import { ShieldQuestion, XCircle } from 'lucide-react';

import {
  isPropertyServiceApproved,
  propertyApprovalBlockMessage,
  PROPERTY_APPROVAL_STATUS,
} from '@/constants/api-enums';
import type { Property } from '@/lib/types';

/**
 * Why a newly-registered property cannot be worked yet.
 *
 * CROSSUB's field team cannot reach every area, so a property registered here waits for
 * CROSSUB to confirm they service the address. Until then the API refuses every workflow on
 * it — leasing, inspections, maintenance, rent reviews — and without this banner that
 * arrives as a bare 403 from whichever button the agent happened to press first.
 *
 * Renders nothing for an approved property, which is every property that came from CROSSUB
 * and everything registered before the gate existed.
 */
export function PropertyApprovalBanner({ property }: { property: Property }) {
  if (isPropertyServiceApproved(property.approvalStatus)) return null;

  const status = property.approvalStatus ?? PROPERTY_APPROVAL_STATUS.PENDING;
  const pending = status === PROPERTY_APPROVAL_STATUS.PENDING;
  const Icon = pending ? ShieldQuestion : XCircle;

  return (
    <div
      role="status"
      className={
        pending
          ? 'mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed'
          : 'mb-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm leading-relaxed'
      }
    >
      <div className="flex flex-wrap items-start gap-3">
        <Icon
          className={
            pending
              ? 'mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400'
              : 'mt-0.5 size-4 shrink-0 text-rose-700 dark:text-rose-400'
          }
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className={
              pending
                ? 'font-medium text-amber-950 dark:text-amber-100'
                : 'font-medium text-rose-950 dark:text-rose-100'
            }
          >
            {pending
              ? 'Waiting for CROSSUB to approve this property'
              : 'CROSSUB does not service this property'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            {propertyApprovalBlockMessage(status, property.approvalDeclineReason)}
          </p>
          {pending ? (
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Leasing, inspections, maintenance and rent reviews stay locked until then. If the
              address needs correcting, edit it now — that is what CROSSUB reviews.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
