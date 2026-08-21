import { propertyInspectionFocusPath } from '@/lib/property-inspection-navigation';

export type JobCaseFocusCharge = {
  jobCaseName?: string | null;
  jobCaseId?: string | null;
  propertyId?: string | null;
  serviceType?: string | null;
};

export function propertyTribunalFocusPath(propertyId: string, tribunalId: string): string {
  const params = new URLSearchParams({
    tab: 'Tribunal',
    tribunal: tribunalId,
  });
  return `/properties/${propertyId}?${params.toString()}`;
}

export function readPropertyTribunalFocusId(
  searchParams: Pick<URLSearchParams, 'get'>,
): string | null {
  const id = searchParams.get('tribunal')?.trim();
  return id || null;
}

/** Property Inspection / Tribunal tab URL that auto-opens this billed case. */
export function jobCaseFocusHref(charge: JobCaseFocusCharge): string | null {
  const propertyId = charge.propertyId?.trim();
  const caseId = charge.jobCaseId?.trim();
  if (!propertyId || !caseId) return null;
  if (charge.serviceType === 'tribunal') {
    return propertyTribunalFocusPath(propertyId, caseId);
  }
  return propertyInspectionFocusPath(propertyId, caseId);
}
