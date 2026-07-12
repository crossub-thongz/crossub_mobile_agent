import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';

/** True record creation time only — never scheduled/due/vacate dates. */
export function maintenanceCreatedAtIso(request: MaintenanceRequest): string | undefined {
  return request.createdAt;
}

export function inspectionCreatedAtIso(inspection: Inspection): string | undefined {
  return inspection.createdAt;
}

export function rentReviewCreatedAtIso(review: RentReviewCase): string | undefined {
  return review.createdAt;
}

export function leasingCycleCreatedAtIso(cycle: LeasingCycle): string | undefined {
  return cycle.createdAt;
}

export function tenantSelectionCreatedAtIso(selection: TenantSelectionCase): string | undefined {
  return selection.createdAt;
}

export function leasingRecordCreatedAtIso(record: LeasingRecord): string | undefined {
  return record.createdAt;
}

export function vacatingCreatedAtIso(vacating: VacatingCase): string | undefined {
  return vacating.createdAt;
}

export function tribunalCreatedAtIso(tribunal: TribunalCase): string | undefined {
  return tribunal.createdAt;
}

export function propertyCreatedAtIso(property: Property): string | undefined {
  return property.createdAt;
}
