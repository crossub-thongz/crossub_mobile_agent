import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  RentReviewCase,
  TenantSelectionCase,
} from '@/lib/types';

export function maintenanceCreatedAtIso(request: MaintenanceRequest): string | undefined {
  return request.createdAt ?? request.timeline[0]?.at;
}

export function inspectionCreatedAtIso(inspection: Inspection): string | undefined {
  return inspection.createdAt ?? inspection.timeline[0]?.at ?? inspection.scheduledAt;
}

export function rentReviewCreatedAtIso(review: RentReviewCase): string | undefined {
  return review.createdAt ?? review.dateStarted ?? review.timeline[0]?.at;
}

export function leasingCycleCreatedAtIso(cycle: LeasingCycle): string | undefined {
  return cycle.createdAt ?? cycle.availableFrom;
}

export function tenantSelectionCreatedAtIso(selection: TenantSelectionCase): string | undefined {
  return selection.createdAt ?? selection.timeline[0]?.at;
}

export function leasingRecordCreatedAtIso(record: LeasingRecord): string | undefined {
  return record.createdAt ?? record.leaseStart;
}

export function propertyCreatedAtIso(property: Property): string | undefined {
  return property.createdAt;
}
