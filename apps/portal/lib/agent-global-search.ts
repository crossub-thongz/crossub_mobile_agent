import {
  inspectionDetail,
  maintenanceDetail,
  propertyHref,
  rentReviewDetail,
  tenantSelectionDetail,
  vacatingDetail,
} from '@/constants/routes';
import type {
  Inspection,
  MaintenanceRequest,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  VacatingCase,
} from '@/lib/types';

export const AGENT_SEARCH_PREVIEW_LIMIT = 3;

export type AgentSearchHit = {
  kind: string;
  label: string;
  sub: string;
  href: string;
};

export type AgentSearchSources = {
  properties: readonly Property[];
  maintenanceAll: readonly MaintenanceRequest[];
  inspections: readonly Inspection[];
  rentReviews: readonly RentReviewCase[];
  vacating: readonly VacatingCase[];
  tenantSelections: readonly TenantSelectionCase[];
};

function includes(value: string | null | undefined, query: string): boolean {
  return (value ?? '').toLowerCase().includes(query);
}

/** Same records the search page lists, matched in the header without leaving the page. */
export function searchAgentRecords(rawQuery: string, data: AgentSearchSources): AgentSearchHit[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const out: AgentSearchHit[] = [];

  for (const property of data.properties) {
    if (
      includes(property.address, query) ||
      includes(property.tenantName, query) ||
      includes(property.suburb, query) ||
      includes(property.homeOwnerName, query)
    ) {
      out.push({
        kind: 'Property',
        label: property.address,
        sub: [property.suburb, property.tenantName].filter(Boolean).join(' · '),
        href: propertyHref(property),
      });
    }
  }
  for (const job of data.maintenanceAll) {
    if (
      includes(job.title, query) ||
      includes(job.trackingNumber, query) ||
      includes(job.propertyAddress, query) ||
      includes(job.contractorName, query)
    ) {
      out.push({
        kind: 'Maintenance',
        label: job.title,
        sub: job.trackingNumber,
        href: maintenanceDetail(job.id),
      });
    }
  }
  for (const inspection of data.inspections) {
    if (includes(inspection.trackingNumber, query) || includes(inspection.propertyAddress, query)) {
      out.push({
        kind: 'Inspection',
        label: inspection.trackingNumber,
        sub: inspection.type,
        href: inspectionDetail(inspection.id),
      });
    }
  }
  for (const review of data.rentReviews) {
    if (includes(review.propertyAddress, query) || includes(review.tenantName, query)) {
      out.push({
        kind: 'Rent review',
        label: review.propertyAddress,
        sub: review.status,
        href: rentReviewDetail(review.id),
      });
    }
  }
  for (const vacating of data.vacating) {
    if (includes(vacating.propertyAddress, query)) {
      out.push({
        kind: 'Vacating',
        label: vacating.propertyAddress,
        sub: vacating.reason,
        href: vacatingDetail(vacating.id),
      });
    }
  }
  for (const application of data.tenantSelections) {
    if (includes(application.applicantName, query) || includes(application.propertyAddress, query)) {
      out.push({
        kind: 'Tenant selection',
        label: application.applicantName,
        sub: application.propertyAddress,
        href: tenantSelectionDetail(application.id),
      });
    }
  }
  return out;
}
