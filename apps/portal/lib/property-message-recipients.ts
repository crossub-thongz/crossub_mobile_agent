import type { Property } from '@/lib/types';

export type PropertyMessageRecipientKind =
  | 'tenant'
  | 'landlord'
  | 'strata'
  | 'building_manager';

export interface PropertyMessageRecipient {
  kind: PropertyMessageRecipientKind;
  label: string;
  name: string;
  /** Shown under the name — email or phone when available. */
  detail?: string;
  /** Opens message detail with ?party= for tenant / landlord threads. */
  party?: 'tenant' | 'owner';
  subject: string;
}

function hasContact(
  name?: string | null,
  email?: string | null,
  phone?: string | null,
): boolean {
  return Boolean(name?.trim() || email?.trim() || phone?.trim());
}

function contactDetail(email?: string | null, phone?: string | null): string | undefined {
  const parts = [email?.trim(), phone?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** Recipients an agent can start a property message with — only those with details on file. */
export function buildPropertyMessageRecipients(
  property: Property,
): PropertyMessageRecipient[] {
  const recipients: PropertyMessageRecipient[] = [];

  const tenantName = property.tenantName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (
    tenantName.toLowerCase() !== 'vacant' &&
    hasContact(
      tenantName,
      property.tenantContact.email,
      property.tenantContact.phone,
    )
  ) {
    recipients.push({
      kind: 'tenant',
      label: 'Tenant',
      name: tenantName,
      detail: contactDetail(property.tenantContact.email, property.tenantContact.phone),
      party: 'tenant',
      subject: `Tenant — ${tenantName}`,
    });
  }

  if (
    hasContact(
      property.homeOwnerName,
      property.homeOwnerContact.email,
      property.homeOwnerContact.phone,
    )
  ) {
    recipients.push({
      kind: 'landlord',
      label: 'Landlord',
      name: property.homeOwnerName.trim(),
      detail: contactDetail(
        property.homeOwnerContact.email,
        property.homeOwnerContact.phone,
      ),
      party: 'owner',
      subject: `Landlord — ${property.homeOwnerName.trim()}`,
    });
  }

  if (
    hasContact(
      property.strataContactName,
      property.strataContactEmail,
      property.strataContactPhone,
    )
  ) {
    const strataName = property.strataContactName?.trim() || 'Strata';
    recipients.push({
      kind: 'strata',
      label: 'Strata',
      name: strataName,
      detail: contactDetail(
        property.strataContactEmail,
        property.strataContactPhone,
      ),
      subject: `Strata — ${strataName}`,
    });
  }

  if (
    hasContact(
      property.buildingManagerName,
      property.buildingManagerEmail,
      property.buildingManagerPhone,
    )
  ) {
    const managerName = property.buildingManagerName?.trim() || 'Building manager';
    recipients.push({
      kind: 'building_manager',
      label: 'Building manager',
      name: managerName,
      detail: contactDetail(
        property.buildingManagerEmail,
        property.buildingManagerPhone,
      ),
      subject: `Building manager — ${managerName}`,
    });
  }

  return recipients;
}
