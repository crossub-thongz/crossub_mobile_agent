import type { Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

/** Resolve a property row from id and/or a partial address string from the API. */
export function findPropertyForAddress(
  properties: Property[],
  propertyId?: string | null,
  propertyAddress?: string | null,
): Property | undefined {
  if (propertyId) {
    const byId = properties.find((p) => p.id === propertyId);
    if (byId) return byId;
  }

  const needle = propertyAddress?.trim();
  if (!needle) return undefined;

  const normalizedNeedle = needle.toLowerCase();
  return properties.find((p) => {
    const full = formatPropertyFullAddress(p).toLowerCase();
    const street = p.address.trim().toLowerCase();
    const streetSuburb = `${p.address}, ${p.suburb}`.toLowerCase();
    const needleStreet = normalizedNeedle.split(',')[0]?.trim() ?? '';
    return (
      full === normalizedNeedle ||
      streetSuburb === normalizedNeedle ||
      normalizedNeedle.startsWith(street) ||
      (needleStreet.length > 0 && street.startsWith(needleStreet)) ||
      full.includes(normalizedNeedle) ||
      normalizedNeedle.includes(street)
    );
  });
}

/** Street + suburb + state + postcode when the property is in the agent book. */
export function resolvePropertyDisplayAddress(
  properties: Property[],
  propertyId?: string | null,
  propertyAddress?: string | null,
): string {
  const property = findPropertyForAddress(properties, propertyId, propertyAddress);
  if (property) return formatPropertyFullAddress(property);
  return propertyAddress?.trim() || '—';
}

export function enrichPropertyAddresses<
  T extends { propertyId?: string; propertyAddress: string },
>(items: T[], properties: Property[]): T[] {
  if (properties.length === 0) return items;
  return items.map((item) => ({
    ...item,
    propertyAddress: resolvePropertyDisplayAddress(
      properties,
      item.propertyId,
      item.propertyAddress,
    ),
  }));
}
