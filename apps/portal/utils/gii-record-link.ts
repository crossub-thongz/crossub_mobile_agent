import { GII_RECORD_LINK_KIND } from '@/constants/gii-record-links';
import { conversationThread, propertyDetail, propertyFinancialsHref } from '@/constants/routes';
import type { GiiJobCaseLink } from '@/lib/crossub-api/gii-client';
import {
  accountingToJobRow,
  inspectionToJobRow,
  leasingCycleToJobRow,
  maintenanceToJobRow,
  rentReviewToJobRow,
  vacatingToJobRow,
  type PortfolioAgentData,
} from '@/lib/portfolio-case-dialog';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { AgentNotification } from '@/lib/types';

/** Where a Cros Open button goes: the case dialog, a screen, or a notification's own link. */
export type GiiRecordLinkTarget =
  | { row: PropertyJobRow }
  | { href: string }
  | { notification: AgentNotification };

/**
 * The target for one Open button, from the agent's loaded data. Null when the record is not
 * loaded yet (a job raised this turn): the caller refreshes and asks the agent to tap again.
 */
export function giiRecordLinkTarget(
  link: GiiJobCaseLink,
  data: PortfolioAgentData,
  notifications: readonly AgentNotification[],
): GiiRecordLinkTarget | null {
  const row = (value: PropertyJobRow | null | undefined) => (value ? { row: value } : null);
  switch (link.kind) {
    case GII_RECORD_LINK_KIND.MAINTENANCE: {
      const item =
        data.maintenanceAll.find((r) => r.id === link.id) ??
        (link.reference ? data.maintenanceAll.find((r) => r.trackingNumber === link.reference) : undefined);
      return row(item && maintenanceToJobRow(item));
    }
    case GII_RECORD_LINK_KIND.RENT_REVIEW: {
      const item = data.rentReviews.find((r) => r.id === link.id);
      return row(item && rentReviewToJobRow(item, data.rentReviewDecisions));
    }
    case GII_RECORD_LINK_KIND.INSPECTION: {
      const item = data.inspections.find((r) => r.id === link.id);
      return row(item && inspectionToJobRow(item));
    }
    case GII_RECORD_LINK_KIND.LEASING: {
      const item = data.leasingCycles.find((r) => r.id === link.id);
      return row(item && leasingCycleToJobRow(item, data));
    }
    case GII_RECORD_LINK_KIND.END_LEASING: {
      const item = data.vacating.find((r) => r.id === link.id);
      return row(item && vacatingToJobRow(item, data));
    }
    case GII_RECORD_LINK_KIND.ARREARS: {
      const item = data.accounting.find((r) => r.propertyId === link.id);
      return (
        row(item && accountingToJobRow(item)) ?? {
          href: propertyFinancialsHref(link.id, { focusArrears: true }),
        }
      );
    }
    case GII_RECORD_LINK_KIND.NOTIFICATION: {
      const item = notifications.find((n) => n.id === link.id);
      return item ? { notification: item } : null;
    }
    case GII_RECORD_LINK_KIND.CONVERSATION:
      return { href: conversationThread(link.id) };
    case GII_RECORD_LINK_KIND.PROPERTY:
      return { href: propertyDetail(link.id) };
  }
}
