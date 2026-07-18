import type { CreateAgentPropertyInput } from '@/lib/crossub-api/agent-client';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function optionalEmail(value: string | undefined, label: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!isValidEmail(trimmed)) {
    throw new Error(`${label} must be a valid email address`);
  }
  return trimmed;
}

function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function optionalInt(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return Math.trunc(value);
}

function optionalCoord(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return value;
}

/** Normalize create-property payload so Nest validation accepts it. */
export function sanitizeCreatePropertyBody(
  body: CreateAgentPropertyInput,
): CreateAgentPropertyInput {
  const sanitized: CreateAgentPropertyInput = {
    address: body.address.trim(),
    suburb: optionalTrimmed(body.suburb),
    state: body.state,
    postcode: optionalTrimmed(body.postcode),
    propertyType: body.propertyType,
    status: body.status,
    bedrooms: optionalInt(body.bedrooms),
    bathrooms: optionalInt(body.bathrooms),
    parking: optionalInt(body.parking),
    furnished: body.furnished,
    landlordName: optionalTrimmed(body.landlordName),
    landlordEmail: optionalEmail(body.landlordEmail, 'Landlord email'),
    landlordPhone: optionalTrimmed(body.landlordPhone),
    tenantName: optionalTrimmed(body.tenantName),
    tenantEmail: optionalEmail(body.tenantEmail, 'Tenant email'),
    tenantPhone: optionalTrimmed(body.tenantPhone),
    latitude: optionalCoord(body.latitude),
    longitude: optionalCoord(body.longitude),
    leaseStartDate: optionalTrimmed(body.leaseStartDate),
    leaseEndDate: optionalTrimmed(body.leaseEndDate),
    nextRentReviewAt: optionalTrimmed(body.nextRentReviewAt),
    rentWeekly: body.rentWeekly,
    bondAmount: body.bondAmount,
    depositAmount: body.depositAmount,
    buildingName: optionalTrimmed(body.buildingName),
    strataPlanNumber: optionalTrimmed(body.strataPlanNumber),
    buildingManagerName: optionalTrimmed(body.buildingManagerName),
    buildingManagerEmail: optionalEmail(body.buildingManagerEmail, 'Building manager email'),
    buildingManagerPhone: optionalTrimmed(body.buildingManagerPhone),
    strataContactName: optionalTrimmed(body.strataContactName),
    strataContactEmail: optionalEmail(body.strataContactEmail, 'Strata email'),
    strataContactPhone: optionalTrimmed(body.strataContactPhone),
    landlordInsuranceExpiry: optionalTrimmed(body.landlordInsuranceExpiry),
    administrationFee: body.administrationFee,
    documentationFee: body.documentationFee,
    lettingFee: body.lettingFee,
    managementRatePercent: body.managementRatePercent,
    managementRateGst:
      body.managementRateGst === 'include' || body.managementRateGst === 'exclude'
        ? body.managementRateGst
        : undefined,
    managementFees: Array.isArray(body.managementFees) ? body.managementFees : undefined,
    registryIntakeComplete: body.registryIntakeComplete,
    registryDraft: body.registryDraft,
  };

  return Object.fromEntries(
    Object.entries(sanitized).filter(([, value]) => value !== undefined),
  ) as CreateAgentPropertyInput;
}
