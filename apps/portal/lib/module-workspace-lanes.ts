import {
  INSPECTION_LANE,
  INSPECTION_REPORT_STATUS_LANE,
  INSPECTION_STATUS_LANE,
  LEASING_LANE,
  LEASING_MAIN_STATUS_LANE,
  LEASING_STEP_ID_LANE,
  MAINTENANCE_LANE,
  MAINTENANCE_STATUS_LANE,
  TENANCY_REVIEW_STATE_LANE,
  type InspectionApiStatus,
  type InspectionLane,
  type LeasingLane,
  type MaintenanceApiStatus,
  type MaintenanceLane,
  type ModuleLaneDefinition,
  type TenancyReviewLane,
} from '@/constants/module-workspace';
import { INSPECTION_STATUS } from '@/constants/api-enums';
import { leasingLifecycleProgress } from '@/lib/case-workflows/leasing';
import { isDeletedInspection } from '@/lib/open-inspection-delete';
import { isCompletedLeasingCycle } from '@/lib/property-leasing-history';
import { isTenantRejectedMaintenance } from '@/lib/maintenance/tenant-rejected';
import type { Inspection, LeasingCycle, MaintenanceRequest, RentReviewCase } from '@/lib/types';

function hasKey<K extends string>(map: Record<K, unknown>, key: string | undefined): key is K {
  return key !== undefined && Object.prototype.hasOwnProperty.call(map, key);
}

/**
 * Self-Manage Maintenance lane. Signals the status alone cannot carry win first: a quote or
 * tenant-rejected case needs the agent, and visit times the tenant has not answered wait on them.
 * A row without a known status (offline demo data) is in progress unless it needs approval.
 */
export function maintenanceLane(request: MaintenanceRequest): MaintenanceLane {
  const status = request.apiStatus;
  const base = hasKey<MaintenanceApiStatus>(MAINTENANCE_STATUS_LANE, status)
    ? MAINTENANCE_STATUS_LANE[status]
    : null;
  if (base === MAINTENANCE_LANE.DONE) return base;
  if (request.requiresApproval || isTenantRejectedMaintenance(request)) {
    return MAINTENANCE_LANE.NEEDS_ACTION;
  }
  if (request.scheduleProposal && !request.scheduleProposal.tenantDecision) {
    return MAINTENANCE_LANE.AWAITING_TENANT;
  }
  return base ?? MAINTENANCE_LANE.IN_PROGRESS;
}

/** Approved: by CROSSUB, or by the agency principal on an agency-conducted job. */
function isInspectionApproved(inspection: Inspection): boolean {
  if (inspection.approvedAt) return true;
  return inspection.conductedByAgency === true && Boolean(inspection.approvedByAgencyAt);
}

/**
 * Self-Manage Inspections lane. Cancelled (including refunded and deleted opens) first; a
 * COMPLETED job that has been approved is as good as published, and one that has not waits on
 * sign-off (the agency's own, on an agency-conducted job); session rows use the report.
 */
export function inspectionLane(inspection: Inspection): InspectionLane {
  if (inspection.unacceptedRefunded || isDeletedInspection(inspection)) {
    return INSPECTION_LANE.CANCELLED;
  }
  const status = inspection.apiStatus;
  if (hasKey<InspectionApiStatus>(INSPECTION_STATUS_LANE, status)) {
    if (status === INSPECTION_STATUS.COMPLETED) {
      return isInspectionApproved(inspection)
        ? INSPECTION_LANE.PUBLISHED
        : INSPECTION_LANE.AWAITING_SIGN_OFF;
    }
    return INSPECTION_STATUS_LANE[status];
  }
  return INSPECTION_REPORT_STATUS_LANE[inspection.reportStatus];
}

/** Self-Manage Leasing lane from the server's main status, else the lifecycle step. */
export function leasingCycleLane(cycle: LeasingCycle): LeasingLane {
  if (hasKey(LEASING_MAIN_STATUS_LANE, cycle.mainStatus)) {
    return LEASING_MAIN_STATUS_LANE[cycle.mainStatus];
  }
  if (isCompletedLeasingCycle(cycle)) return LEASING_LANE.COMPLETED;
  const stepId = leasingLifecycleProgress(cycle).currentStepId;
  if (hasKey(LEASING_STEP_ID_LANE, stepId)) return LEASING_STEP_ID_LANE[stepId];
  throw new Error(`Leasing cycle ${cycle.id} has an unmapped lifecycle step "${stepId}"`);
}

/** Self-Manage tenancy review lane, by the review's workflow state. */
export function tenancyReviewLane(review: RentReviewCase): TenancyReviewLane {
  if (hasKey(TENANCY_REVIEW_STATE_LANE, review.workflowState)) {
    return TENANCY_REVIEW_STATE_LANE[review.workflowState];
  }
  throw new Error(`Rent review ${review.id} has an unmapped workflow state "${review.workflowState}"`);
}

/** The lane definition for an id; throws on an id the lane list does not carry. */
export function findLaneDefinition<Lane extends string>(
  lanes: readonly ModuleLaneDefinition<Lane>[],
  id: Lane,
): ModuleLaneDefinition<Lane> {
  const lane = lanes.find((l) => l.id === id);
  if (!lane) throw new Error(`Unknown module lane "${id}"`);
  return lane;
}
