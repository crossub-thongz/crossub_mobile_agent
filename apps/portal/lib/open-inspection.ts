import type { Property } from '@/lib/types';
import { isPropertyVacant } from '@/lib/property-leasing';

export type OpenListingContext = 'occupied' | 'new_listing';
export type OpenConductedBy = 'agent' | 'crossub';

export function getOpenListingContext(property: Property): OpenListingContext {
  return isPropertyVacant(property) ? 'new_listing' : 'occupied';
}

export function openListingContextFromTenantMovedOut(
  tenantMovedOut: boolean,
): OpenListingContext {
  return tenantMovedOut ? 'new_listing' : 'occupied';
}

export function shouldShowOpenInspectionTenantDetails(input: {
  tenantMovedOut?: boolean | null;
  openListingContext?: OpenListingContext | null;
}): boolean {
  if (input.tenantMovedOut === true) return false;
  if (input.tenantMovedOut === false) return true;
  return input.openListingContext === 'occupied';
}

export const OPEN_LISTING_CONTEXT_LABEL: Record<OpenListingContext, string> = {
  occupied: 'Existing property — tenant still lives in',
  new_listing: 'New listing / vacant property',
};

export const OPEN_CONDUCTED_BY_LABEL: Record<OpenConductedBy, string> = {
  agent: 'Self open inspection',
  crossub: 'CROSSUB conducts open inspection',
};

export const SELF_OPEN_INSPECTION_DISCLAIMER =
  'If you conduct the open inspection yourself, CROSSUB is not responsible for contacting the tenant or arranging inspection times on your behalf. You must notify the tenant of the date and time yourself.';

export const SELF_OPEN_NEW_LISTING_NOTE =
  'For a new listing, you are responsible for promoting the open inspection and contacting interested parties yourself. CROSSUB will not arrange timing or outreach on your behalf.';

export const OCCUPIED_SELF_TENANT_NOTE =
  'The tenant is still living in this property. You must contact them directly with the open inspection date and time before the viewing.';
