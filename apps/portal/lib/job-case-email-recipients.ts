import type { Property, PropertyPartyContact } from '@/lib/types';

export interface WorkflowEmailContact {
  role: string;
  name?: string;
  email: string;
}

export function formatWorkflowEmailContact(contact: WorkflowEmailContact): string {
  return `[${contact.role}] ${contact.email}`;
}

function pushContact(
  list: WorkflowEmailContact[],
  seen: Set<string>,
  role: string,
  email: string | null | undefined,
  name?: string | null,
): void {
  const trimmed = email?.trim();
  if (!trimmed || !trimmed.includes('@')) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ role, name: name?.trim() || undefined, email: trimmed });
}

function pushPartyContacts(
  list: WorkflowEmailContact[],
  seen: Set<string>,
  role: string,
  parties: PropertyPartyContact[] | undefined,
): void {
  if (!parties?.length) return;
  parties.forEach((party, index) => {
    const label = parties.length > 1 ? `${role} ${index + 2}` : role;
    pushContact(list, seen, label, party.email, party.name);
  });
}

type PropertyWithStrata = Property & {
  strataContactName?: string | null;
  strataContactEmail?: string | null;
};

/** Landlord, tenant, and strata emails for workflow compose (reply / forward). */
export function buildPropertyWorkflowEmailContacts(
  property: Property | null | undefined,
  options?: { tenantName?: string | null },
): WorkflowEmailContact[] {
  if (!property) return [];

  const ext = property as PropertyWithStrata;
  const contacts: WorkflowEmailContact[] = [];
  const seen = new Set<string>();

  pushContact(contacts, seen, 'Landlord', property.homeOwnerContact?.email, property.homeOwnerName);
  pushPartyContacts(contacts, seen, 'Landlord', property.additionalLandlords);

  const tenantName = options?.tenantName?.trim() || property.tenantName;
  pushContact(contacts, seen, 'Tenant', property.tenantContact?.email, tenantName);
  pushPartyContacts(contacts, seen, 'Tenant', property.additionalTenants);

  const draft =
    property.registryDraft && typeof property.registryDraft === 'object'
      ? (property.registryDraft as Record<string, unknown>)
      : null;
  const strataEmail =
    ext.strataContactEmail ??
    (typeof draft?.strataContactEmail === 'string' ? draft.strataContactEmail : undefined);
  const strataName =
    ext.strataContactName ??
    (typeof draft?.strataContactName === 'string' ? draft.strataContactName : undefined);

  pushContact(contacts, seen, 'Strata', strataEmail, strataName);

  return contacts;
}

export function formatWorkflowEmailContactBlock(contacts: WorkflowEmailContact[]): string {
  if (contacts.length === 0) return '';
  return `Suggested recipients:\n${contacts.map((c) => formatWorkflowEmailContact(c)).join('\n')}\n`;
}

const ROLE_BRACKET_RE = /^\[([^\]]+)\]\s*(.*)$/s;

export function parseRoleBracketLabel(value: string): { role?: string; remainder: string } {
  const match = value.trim().match(ROLE_BRACKET_RE);
  if (!match) return { remainder: value.trim() };
  return { role: match[1].trim(), remainder: match[2].trim() };
}

export function extractEmailAddress(party: string): string | undefined {
  const trimmed = party.trim();
  const angle = trimmed.match(/<([^>]+@[^>]+)>/);
  if (angle) return angle[1].trim();
  if (trimmed.includes('@')) return trimmed;
  return undefined;
}

function matchContactByEmail(
  email: string | undefined,
  contacts: WorkflowEmailContact[],
): WorkflowEmailContact | undefined {
  if (!email?.trim()) return undefined;
  const key = email.trim().toLowerCase();
  return contacts.find((c) => c.email.toLowerCase() === key);
}

function matchContactByName(
  name: string | undefined,
  contacts: WorkflowEmailContact[],
): WorkflowEmailContact | undefined {
  if (!name?.trim()) return undefined;
  const key = name.trim().toLowerCase();
  return contacts.find((c) => c.name?.trim().toLowerCase() === key);
}

function inferPartyRole(party: string, email?: string): string | undefined {
  const lower = party.toLowerCase();
  const emailLower = email?.toLowerCase() ?? '';

  if (lower.includes('crossub') || emailLower.includes('crossub') || emailLower.includes('research@')) {
    return 'CROSSUB';
  }
  if (lower.includes('managing agent') || lower === 'agent') {
    return 'Agent';
  }
  if (lower.includes('landlord') || lower.includes('home owner') || lower.includes('owner')) {
    return 'Landlord';
  }
  if (lower.includes('tenant')) {
    return 'Tenant';
  }
  if (lower.includes('strata')) {
    return 'Strata';
  }
  return undefined;
}

export function resolveEmailPartyRole(
  party: string,
  email: string | undefined,
  contacts: WorkflowEmailContact[],
): string | undefined {
  const parsed = parseRoleBracketLabel(party);
  if (parsed.role) return parsed.role;

  const resolvedEmail = email?.trim() || extractEmailAddress(party);
  const byEmail = matchContactByEmail(resolvedEmail, contacts);
  if (byEmail) return byEmail.role;

  const byName = matchContactByName(party, contacts);
  if (byName) return byName.role;

  return inferPartyRole(party, resolvedEmail);
}

/** From / To line with role prefix, e.g. `[Landlord] owner@example.com`. */
export function formatEmailPartyWithRole(
  party: string,
  email: string | undefined,
  contacts: WorkflowEmailContact[],
): string {
  const parsed = parseRoleBracketLabel(party);
  const role = resolveEmailPartyRole(party, email, contacts);
  const resolvedEmail = email?.trim() || extractEmailAddress(parsed.remainder || party);
  const name = parsed.remainder && !parsed.remainder.includes('@') ? parsed.remainder : undefined;

  if (role && resolvedEmail) {
    return name ? `[${role}] ${name} <${resolvedEmail}>` : `[${role}] ${resolvedEmail}`;
  }
  if (role) {
    return `[${role}] ${parsed.remainder || party}`;
  }
  return party;
}
