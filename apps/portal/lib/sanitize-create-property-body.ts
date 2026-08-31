import type { CreateAgentPropertyInput } from '@/lib/crossub-api/agent-client';
import { AGENT_INPUT_KIND, sanitizeAgentInput } from '@/lib/agent-input-rules';
import { stripEmojis } from '@/lib/strip-emojis';

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

function sanitizeName(value: string | undefined): string | undefined {
  const next = optionalTrimmed(value);
  if (!next) return undefined;
  return sanitizeAgentInput(next, {
    kind: AGENT_INPUT_KIND.PERSON_NAME,
    allowEmoji: true,
    stripEmojis,
  });
}

function sanitizeAddress(value: string | undefined): string | undefined {
  const next = optionalTrimmed(value);
  if (!next) return undefined;
  return sanitizeAgentInput(next, {
    kind: AGENT_INPUT_KIND.PROPERTY_ADDRESS,
    allowEmoji: false,
    stripEmojis,
  });
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
    address: sanitizeAddress(body.address) ?? body.address.trim(),
    suburb: sanitizeAddress(body.suburb),
    state: body.state,
    postcode: optionalTrimmed(body.postcode),
    propertyType: body.propertyType,
    status: body.status,
    bedrooms: optionalInt(body.bedrooms),
    bathrooms: optionalInt(body.bathrooms),
    parking: optionalInt(body.parking),
    furnished: body.furnished,
    landlordName: sanitizeName(body.landlordName),
    landlordEmail: optionalEmail(body.landlordEmail, 'Landlord email'),
    landlordPhone: optionalTrimmed(body.landlordPhone),
    tenantName: sanitizeName(body.tenantName),
    tenantEmail: optionalEmail(body.tenantEmail, 'Tenant email'),
    tenantPhone: optionalTrimmed(body.tenantPhone),
    contacts: Array.isArray(body.contacts)
      ? body.contacts
          .map((contact) => ({
            role: contact.role,
            name: sanitizeName(contact.name),
            email: contact.email?.trim()
              ? optionalEmail(contact.email, 'Contact email')
              : undefined,
            phone: optionalTrimmed(contact.phone),
            isPrimary: contact.isPrimary === true,
          }))
          .filter((contact) => contact.name || contact.email || contact.phone)
      : undefined,
    latitude: optionalCoord(body.latitude),
    longitude: optionalCoord(body.longitude),
    leaseStartDate: optionalTrimmed(body.leaseStartDate),
    leaseEndDate: optionalTrimmed(body.leaseEndDate),
    nextInspectionAt: optionalTrimmed(body.nextInspectionAt),
    nextRentReviewAt: optionalTrimmed(body.nextRentReviewAt),
    rentWeekly: body.rentWeekly,
    bondAmount: body.bondAmount,
    depositAmount: body.depositAmount,
    buildingName: sanitizeAddress(body.buildingName),
    strataPlanNumber: optionalTrimmed(body.strataPlanNumber),
    buildingManagerName: sanitizeName(body.buildingManagerName),
    buildingManagerEmail: optionalEmail(body.buildingManagerEmail, 'Building manager email'),
    buildingManagerPhone: optionalTrimmed(body.buildingManagerPhone),
    strataContactName: sanitizeName(body.strataContactName),
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
    routineInspectionFrequency: body.routineInspectionFrequency,
  };

  return Object.fromEntries(
    Object.entries(sanitized).filter(([, value]) => value !== undefined),
  ) as CreateAgentPropertyInput;
}
