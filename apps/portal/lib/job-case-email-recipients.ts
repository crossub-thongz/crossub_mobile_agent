import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import type { Property, PropertyPartyContact } from '@/lib/types';

export interface WorkflowEmailContact {
  role: string;
  name?: string;
  email: string;
}

export function formatWorkflowEmailContact(contact: WorkflowEmailContact): string {
  return `${contact.email} [${contact.role}]`;
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

/** Landlord, tenant, strata, and agent emails for workflow compose (reply / forward). */
export function buildPropertyWorkflowEmailContacts(
  property: Property | null | undefined,
  options?: { tenantName?: string | null; agentEmail?: string | null; agentName?: string | null },
): WorkflowEmailContact[] {
  if (!property) return [];

  const ext = property as PropertyWithStrata;
  const contacts: WorkflowEmailContact[] = [];
  const seen = new Set<string>();

  pushContact(contacts, seen, 'Agent', options?.agentEmail, options?.agentName);

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

/** Bracket label stored on synthesized records, e.g. `[Agent] Jane`. */
export function formatWorkflowPartyWithRole(
  role: string,
  input?: { name?: string | null; email?: string | null },
): { party: string; email?: string } {
  const email = input?.email?.trim()?.includes('@') ? input.email.trim() : undefined;
  const rawName = input?.name?.trim();
  const name =
    rawName &&
    !rawName.includes('@') &&
    !/^awaiting assignment$/i.test(rawName) &&
    rawName.toLowerCase() !== 'unassigned'
      ? rawName
      : undefined;

  if (email) {
    return {
      party: name ? `[${role}] ${name}` : `[${role}] ${email}`,
      email,
    };
  }
  if (name) return { party: `[${role}] ${name}` };
  return { party: `[${role}] ${role}` };
}

export function formatAgentRecipient(input?: {
  name?: string | null;
  email?: string | null;
}): Pick<JobCaseEmailRecord, 'to' | 'toEmail'> {
  const { party, email } = formatWorkflowPartyWithRole('Agent', input);
  return email ? { to: party, toEmail: email } : { to: party };
}

export function formatLandlordRecipient(input?: {
  name?: string | null;
  email?: string | null;
}): Pick<JobCaseEmailRecord, 'to' | 'toEmail'> {
  const { party, email } = formatWorkflowPartyWithRole('Landlord', input);
  return email ? { to: party, toEmail: email } : { to: party };
}

export function formatTenantRecipient(input?: {
  name?: string | null;
  email?: string | null;
}): Pick<JobCaseEmailRecord, 'to' | 'toEmail'> {
  const { party, email } = formatWorkflowPartyWithRole('Tenant', input);
  return email ? { to: party, toEmail: email } : { to: party };
}

export function formatContractorRecipient(input?: {
  name?: string | null;
  email?: string | null;
}): Pick<JobCaseEmailRecord, 'to' | 'toEmail'> {
  const { party, email } = formatWorkflowPartyWithRole('Contractor', input);
  return email ? { to: party, toEmail: email } : { to: party };
}

const RECIPIENT_ROLE_BY_KIND: Record<string, string> = {
  open_report_agent: 'Agent',
  open_inspection_scheduled: 'Agent',
  open_inspection_preference: 'Agent',
  ai_report_ready: 'Agent',
  agent_confirmation_reminder: 'Agent',
  statutory_notice_alert: 'Agent',
  agent_research_email: 'Agent',
  lease_agreement_signed: 'Agent',
  ingoing_report_distributed: 'Agent',
  outgoing_report_distributed: 'Agent',
  inspector_accepted: 'Agent',
  open_report_landlord: 'Landlord',
  landlord_research_email: 'Landlord',
  landlord_quotation: 'Landlord',
  quotation_landlord_email: 'Landlord',
  viewer_invite: 'Tenant',
  application_feedback: 'Tenant',
  application_link_sent: 'Tenant',
  bond_link: 'Tenant',
  lease_agreement: 'Tenant',
  tenant_login: 'Tenant',
  tenant_notified: 'Tenant',
  tenant_notices_dispatched: 'Tenant',
  tenant_response_reminder: 'Tenant',
  tenant_comparison: 'Tenant',
  agent_bond_deduction_proposal: 'Agent',
  tenant_bond_deduction_ack: 'Tenant',
  agent_repair_quote: 'Agent',
  landlord_repair_quote: 'Landlord',
  tenant_repair_quote: 'Tenant',
  agent_comparison: 'Agent',
  landlord_comparison: 'Landlord',
  tenant_bond_summary: 'Tenant',
  landlord_bond_summary: 'Landlord',
  tenant_notice: 'Tenant',
  quotation_contractor_feedback: 'Contractor',
  contractor_feedback: 'Contractor',
  handyman_notified: 'Contractor',
  counter_offer: 'Contractor',
  quotation_counter_offer: 'Contractor',
  inspection_scheduled: 'Tenant',
  timeline_email: 'Tenant',
};

function mergeWorkflowEmailContacts(
  contacts: WorkflowEmailContact[],
  options?: {
    agentEmail?: string | null;
    agentName?: string | null;
  },
): WorkflowEmailContact[] {
  const merged = [...contacts];
  const seen = new Set(merged.map((c) => c.email.toLowerCase()));
  const agentEmail = options?.agentEmail?.trim();
  if (agentEmail?.includes('@') && !seen.has(agentEmail.toLowerCase())) {
    merged.push({
      role: 'Agent',
      email: agentEmail,
      name: options?.agentName?.trim() || undefined,
    });
  }
  return merged;
}

function resolveStoredPartyRole(
  party: string,
  email: string | undefined,
  contacts: WorkflowEmailContact[],
  kind?: string,
): string | undefined {
  if (parseRoleBracketLabel(party).role) return undefined;

  const resolved =
    resolveEmailPartyRole(party, email, contacts) ??
    (kind ? RECIPIENT_ROLE_BY_KIND[kind] : undefined);

  return resolved;
}

function applyPartyRoleBracket(
  party: string,
  email: string | undefined,
  role: string,
): { party: string; email?: string } {
  const resolvedEmail = email?.trim() || extractEmailAddress(party);
  const parsed = parseRoleBracketLabel(party);
  const nameCandidate = parsed.remainder || party;
  const name =
    nameCandidate.includes('@') || nameCandidate.toLowerCase() === role.toLowerCase()
      ? undefined
      : nameCandidate.trim() || undefined;

  return formatWorkflowPartyWithRole(role, { name, email: resolvedEmail ?? undefined });
}

/** Ensure every history row carries `[Role]` on To (and From when inferable). */
export function attributeEmailPartyRoles(
  records: JobCaseEmailRecord[],
  options?: {
    contacts?: WorkflowEmailContact[];
    agentEmail?: string | null;
    agentName?: string | null;
  },
): JobCaseEmailRecord[] {
  const contacts = mergeWorkflowEmailContacts(options?.contacts ?? [], options);

  return records.map((record) => {
    const next = { ...record };

    const toRole = resolveStoredPartyRole(next.to, next.toEmail, contacts, next.kind);
    if (toRole) {
      const enriched = applyPartyRoleBracket(next.to, next.toEmail, toRole);
      next.to = enriched.party;
      if (enriched.email) next.toEmail = enriched.email;
    }

    const fromRole = resolveStoredPartyRole(
      next.from,
      next.fromEmail ?? extractEmailAddress(next.from),
      contacts,
      next.kind,
    );
    if (fromRole && !parseRoleBracketLabel(next.from).role) {
      const enriched = applyPartyRoleBracket(
        next.from,
        next.fromEmail ?? extractEmailAddress(next.from),
        fromRole,
      );
      next.from = enriched.party;
      if (enriched.email) next.fromEmail = enriched.email;
    }

    return next;
  });
}

/** Lowercase portal role for deliverable email preview (mirrors Resend send pipeline). */
export function resolveJobCaseRecipientRoleForPreview(
  email: JobCaseEmailRecord,
  contacts: WorkflowEmailContact[] = [],
): string | undefined {
  const role =
    resolveEmailPartyRole(email.to, email.toEmail, contacts) ??
    (email.kind ? RECIPIENT_ROLE_BY_KIND[email.kind] : undefined);
  return role?.toLowerCase();
}

/** Standard preview line: `email@example.com [Role]` or `Name <email> [Role]`. */
export function formatEmailPartyPreview(
  party: string,
  email: string | undefined,
  contacts: WorkflowEmailContact[],
): string {
  const parsed = parseRoleBracketLabel(party);
  const role = resolveEmailPartyRole(party, email, contacts);
  const resolvedEmail = email?.trim() || extractEmailAddress(parsed.remainder || party);
  const nameFromRemainder =
    parsed.remainder && !parsed.remainder.includes('@') ? parsed.remainder : undefined;
  const nameFromParty =
    !party.includes('@') && !parsed.role && party.trim() ? party.trim() : undefined;
  const name = nameFromRemainder ?? nameFromParty;

  if (role && resolvedEmail) {
    return name && name !== resolvedEmail
      ? `${name} <${resolvedEmail}> [${role}]`
      : `${resolvedEmail} [${role}]`;
  }
  if (role && name) {
    return `${name} [${role}]`;
  }
  if (role) {
    return `${parsed.remainder || party} [${role}]`;
  }
  if (resolvedEmail) return resolvedEmail;
  return party;
}

/** @deprecated Use {@link formatEmailPartyPreview}. */
export const formatEmailPartyWithRole = formatEmailPartyPreview;
