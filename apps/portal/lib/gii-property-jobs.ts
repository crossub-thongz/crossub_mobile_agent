import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import {
  buildPropertyOverviewJobRows,
  type PropertyJobRow,
} from '@/lib/property-job-rows';
import {
  filterTenancyRentReviews,
  isPropertyVacant,
  rentReviewsForProperty,
} from '@/lib/property-leasing';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';

/** The provider's portfolio-wide arrays — the same data the property detail page slices per property. */
export interface PropertyJobsSelectionInput {
  property: Property;
  maintenanceAll: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  leasingRecords: LeasingRecord[];
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  vacating: VacatingCase[];
  tribunalCases: TribunalCase[];
  accounting: PropertyAccounting[];
}

/**
 * A property's in-progress jobs — the SAME "Jobs in progress" set the property Overview tab
 * renders (`buildPropertyOverviewJobRows`), assembled here from the provider's portfolio-wide
 * arrays. Kept as one pure function so Gii's panel and the Overview tab can never disagree on
 * what jobs a property has. The per-property slicing mirrors `app/properties/[id]/page.tsx`
 * exactly (maintenance also matches on address, current tenancy drives vacancy, rent reviews
 * are filtered to the active tenancy).
 */
export function selectPropertyInProgressJobs(
  input: PropertyJobsSelectionInput,
): PropertyJobRow[] {
  const { property } = input;
  const id = property.id;

  const maintenance = input.maintenanceAll.filter(
    (m) => m.propertyId === id || m.propertyAddress.includes(property.address),
  );
  const inspections = input.inspections.filter((i) => i.propertyId === id);
  const propertyLeasingCases = input.tenantSelections.filter((t) => t.propertyId === id);
  const propertyVacatingCases = input.vacating.filter((v) => v.propertyId === id);
  const propertyLeasingCycles = input.leasingCycles.filter((c) => c.propertyId === id);
  const propertyTribunalCases = input.tribunalCases.filter((t) => t.propertyId === id);
  const accounting = input.accounting.find((a) => a.propertyId === id) ?? null;

  const leasing = input.leasingRecords.filter((l) => l.propertyId === id);
  const currentTenancy = leasing.filter(
    (l) => l.status === 'current' || l.status === 'upcoming',
  );
  const currentLease =
    currentTenancy.find((l) => l.status === 'current') ?? currentTenancy[0];
  const isVacant = isPropertyVacant(property, currentTenancy);

  const tenancyRentReviews = filterTenancyRentReviews(
    rentReviewsForProperty(input.rentReviews, id, property),
    isVacant,
  );

  const leasingWorkflowCases = buildPropertyLeasingWorkflowCases({
    propertyId: id,
    leasingCycles: propertyLeasingCycles,
    tenantSelections: propertyLeasingCases,
    vacatingCases: propertyVacatingCases,
    rentReviews: tenancyRentReviews,
    rentReviewDecisions: input.rentReviewDecisions,
    currentLease,
    isVacant,
  });

  return buildPropertyOverviewJobRows({
    maintenance,
    inspections,
    rentReviews: tenancyRentReviews,
    rentReviewDecisions: input.rentReviewDecisions,
    leasingCases: leasingWorkflowCases,
    tribunalCases: propertyTribunalCases,
    vacatingCases: propertyVacatingCases,
    accounting,
  });
}
