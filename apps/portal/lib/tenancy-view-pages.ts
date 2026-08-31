import type { TenancyArchiveSnapshot } from '@/lib/property-archive';
import type { HouseholdTenant } from '@/lib/property-parties';

export type TenancyViewPage = {
  id: string;
  kind: 'current' | 'previous';
  name: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  archive?: TenancyArchiveSnapshot;
};

export function buildTenancyViewPages(input: {
  household: HouseholdTenant[];
  archives?: TenancyArchiveSnapshot[];
  fallback?: { name: string; email?: string; phone?: string };
}): TenancyViewPage[] {
  const current: TenancyViewPage[] =
    input.household.length > 0
      ? input.household.map((person, index) => ({
          id: `current-${index}-${person.email ?? person.name}`,
          kind: 'current',
          name: person.name,
          email: person.email,
          phone: person.phone,
          isPrimary: person.isPrimary,
        }))
      : input.fallback && input.fallback.name.trim() && input.fallback.name !== 'Vacant'
        ? [
            {
              id: 'current-fallback',
              kind: 'current' as const,
              name: input.fallback.name,
              email: input.fallback.email,
              phone: input.fallback.phone,
              isPrimary: true,
            },
          ]
        : [];

  const previous: TenancyViewPage[] = (input.archives ?? []).map((archive, index) => ({
    id: `previous-${archive.archivedAt}-${index}`,
    kind: 'previous',
    name: archive.tenantName?.trim() || 'Previous tenant',
    email: archive.tenantEmail,
    phone: archive.tenantPhone,
    isPrimary: true,
    archive,
  }));

  return [...current, ...previous];
}

export function wrapTenancyPageIndex(index: number, count: number, delta: number): number {
  if (count <= 0) return 0;
  return (index + delta + count) % count;
}
