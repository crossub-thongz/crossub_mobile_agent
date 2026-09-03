import type { HouseholdTenant } from '@/lib/property-parties';
import { tenancyReferenceLabel } from '@/lib/workflow-case-reference';

export type OtherTenancyReference = {
  name: string;
  label: string;
};

export type CurrentTenancyRefs = {
  primary: string;
  others: OtherTenancyReference[];
};

function tenantRefSource(
  tenant: Pick<HouseholdTenant, 'id' | 'email' | 'name'>,
  fallback?: string,
): string | undefined {
  return tenant.id?.trim() || tenant.email?.trim() || tenant.name.trim() || fallback;
}

/** Primary TEN from the primary tenant contact (else lease/property); others from co-tenants. */
export function resolveCurrentTenancyRefs(input: {
  tenants: Array<Pick<HouseholdTenant, 'id' | 'email' | 'name' | 'isPrimary'>>;
  leaseId?: string | null;
  propertyId: string;
}): CurrentTenancyRefs {
  const fallbackId = input.leaseId?.trim() || input.propertyId;
  const primaryTenant = input.tenants.find((tenant) => tenant.isPrimary) ?? input.tenants[0];
  const primary = tenancyReferenceLabel(
    tenantRefSource(primaryTenant ?? { name: '' }, fallbackId) || fallbackId,
  );

  const seen = new Set([primary]);
  const others: OtherTenancyReference[] = [];
  for (const tenant of input.tenants) {
    if (tenant === primaryTenant) continue;
    const source = tenantRefSource(tenant);
    if (!source) continue;
    const label = tenancyReferenceLabel(source);
    if (seen.has(label)) continue;
    seen.add(label);
    others.push({ name: tenant.name, label });
  }
  return { primary, others };
}
