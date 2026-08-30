import {
  inspectionDetail,
  leasingDetail,
  maintenanceDetail,
  propertyDetail,
  rentReviewDetail,
  tribunalDetail,
  vacatingDetail,
} from '@/constants/routes';
import { fromProperty, type DetailNavContext } from '@/lib/detail-navigation';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { PropertyWorkflowCreatedCase } from '@/lib/property-workflow-created';

export function propertyJobKindHref(
  kind: PropertyJobRow['kind'],
  id: string,
  ctx: DetailNavContext,
  fallback: string,
): string {
  switch (kind) {
    case 'maintenance':
      return maintenanceDetail(id, ctx);
    case 'inspection':
      return inspectionDetail(id, ctx);
    case 'rent_review':
      return rentReviewDetail(id, ctx);
    case 'leasing':
      return leasingDetail(id, ctx);
    case 'end_leasing':
      return vacatingDetail(id, ctx);
    case 'tribunal':
      return tribunalDetail(id, ctx);
    default:
      return fallback;
  }
}

/** Related-task / property-profile links into the dedicated v2 task pages. */
export function relatedPropertyJobHref(row: PropertyJobRow, propertyId: string): string {
  return propertyJobKindHref(
    row.kind,
    row.id,
    fromProperty(propertyId, 'Tasks'),
    propertyDetail(propertyId),
  );
}

export function hasDedicatedV2TaskPage(kind: PropertyJobRow['kind']): boolean {
  return kind !== 'accounting';
}

export function createdWorkflowCaseHref(
  result: PropertyWorkflowCreatedCase,
  propertyId: string,
): string {
  const ctx = fromProperty(propertyId, 'Tasks');
  switch (result.kind) {
    case 'leasing':
      return leasingDetail(result.id, ctx);
    case 'rent_review':
      return rentReviewDetail(result.id, ctx);
    case 'end_leasing':
      return vacatingDetail(result.id, ctx);
    case 'maintenance':
      return maintenanceDetail(result.id, ctx);
    case 'tribunal':
      return tribunalDetail(result.id, ctx);
  }
}
