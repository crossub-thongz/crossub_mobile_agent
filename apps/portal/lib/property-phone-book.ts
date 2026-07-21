import type { Property } from '@/lib/types';

/** Short label for phone-book avatar chips. */
export function propertyPhoneBookInitials(property: Property): string {
  const street = property.address.split(',')[0]?.trim() ?? property.address;
  const words = street.replace(/^\d+\s*/, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ''}${words[1]![0] ?? ''}`.toUpperCase();
  }
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  const num = street.match(/^\d+/);
  if (num) return `#${num[0]!.slice(-2)}`;
  return street.slice(0, 2).toUpperCase() || 'PM';
}

export function propertyPhoneBookSubtitle(property: Property): string {
  if (property.tenantName?.trim() && property.tenantName !== '—') {
    return property.tenantName.trim();
  }
  if (property.homeOwnerName?.trim()) return property.homeOwnerName.trim();
  if (property.propertyManager?.trim()) return property.propertyManager.trim();
  return property.suburb?.trim() || 'Managed property';
}
