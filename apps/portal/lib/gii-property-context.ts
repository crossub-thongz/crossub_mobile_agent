import type { PropertyJobRow } from '@/lib/property-job-rows';
import type { Property, PropertyNeedAction } from '@/lib/types';
import { formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';

export function formatListingDetails(property: Property): string {
  const parts: string[] = [];
  if (property.propertyType) parts.push(property.propertyType);
  if (property.bedrooms != null) parts.push(`${property.bedrooms} bed`);
  if (property.bathrooms != null) parts.push(`${property.bathrooms} bath`);
  if (property.carSpaces != null) parts.push(`${property.carSpaces} car`);
  if (property.furnished) parts.push('furnished');
  if (property.leaseStatus) parts.push(`occupancy: ${property.leaseStatus}`);
  if (property.rentWeekly) parts.push(`rent: ${formatCurrency(property.rentWeekly)}/wk`);
  if (property.leaseStart) parts.push(`lease start: ${formatDate(property.leaseStart)}`);
  if (property.leaseEnd) parts.push(`lease end: ${formatDate(property.leaseEnd)}`);
  return parts.join(' · ');
}

/** Pre-built context Gii receives on every turn when scoped to a property listing. */
export function buildGiiPropertyContext(args: {
  property: Property;
  address?: string;
  needActions?: PropertyNeedAction[];
  inProgressJobs?: PropertyJobRow[];
}): string {
  const { property, needActions = [], inProgressJobs = [] } = args;
  const address = args.address?.trim() || formatPropertyFullAddress(property);
  const lines: string[] = [];

  lines.push(`Property id: ${property.id}`);
  lines.push(`Property address: ${address}`);

  const listing = formatListingDetails(property);
  if (listing) lines.push(`Listing details: ${listing}`);

  lines.push(`Landlord: ${property.homeOwnerName}`);
  lines.push(`Tenant: ${property.tenantName || '—'}`);

  if (inProgressJobs.length > 0) {
    lines.push('', 'In-progress jobs at this property:');
    for (const job of inProgressJobs.slice(0, 12)) {
      lines.push(`- ${job.jobType}: ${job.name} (${job.status})`);
    }
    if (inProgressJobs.length > 12) {
      lines.push(`- …and ${inProgressJobs.length - 12} more`);
    }
  }

  if (needActions.length > 0) {
    lines.push('', 'Items needing action:');
    for (const item of needActions.slice(0, 8)) {
      lines.push(`- ${item.label}`);
    }
  }

  lines.push(
    '',
    'The agent is viewing this listing. Answer about this property directly — do not ask them to repeat the address or identify the listing.',
  );

  return lines.join('\n').trim();
}
