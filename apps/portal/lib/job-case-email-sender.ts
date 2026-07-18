import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import { parseRoleBracketLabel } from '@/lib/job-case-email-recipients';

/** Emails CROSSUB sends into the agent portal (keep From = CROSSUB). */
const CROSSUB_INBOUND_KINDS = new Set([
  'open_inspection_scheduled',
  'open_inspection_preference',
  'open_report_agent',
  'ai_report_ready',
  'agent_confirmation_reminder',
  'statutory_notice_alert',
  'agent_research_email',
  'lease_agreement_signed',
  'tenant_login',
]);

/** Emails the agent portal authors / sends outbound. */
const AGENT_OUTBOUND_KINDS = new Set([
  'open_report_landlord',
  'application_link_sent',
  'viewer_invite',
  'application_feedback',
  'bond_link',
  'lease_agreement',
  'tenant_notified',
  'report_published',
  'tenant_notices_dispatched',
  'ledger_complete',
  'tenant_response_reminder',
  'landlord_research_email',
  'responsibility_review',
  'notification',
  'quotation_landlord_email',
  'quotation_contractor_feedback',
  'quotation_counter_offer',
  'landlord_quotation',
  'contractor_feedback',
  'counter_offer',
  'handyman_notified',
  'vacating_info_reply',
  'vacating_reply',
  'tenant_comparison',
]);

function normalizeEmail(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.includes('@') ? trimmed : undefined;
}

function isCrossubParty(from: string, fromEmail?: string | null): boolean {
  const hay = `${from} ${fromEmail ?? ''}`.toLowerCase();
  return hay.includes('crossub') || hay.includes('research@');
}

function looksLikeAgentParty(from: string): boolean {
  const lower = from.trim().toLowerCase();
  const parsed = parseRoleBracketLabel(from);
  if (parsed.role?.toLowerCase() === 'agent') return true;
  return (
    lower === 'agent' ||
    lower.includes('managing agent') ||
    lower === 'your managing agent'
  );
}

/**
 * Canonical From party for agent-authored portal mail.
 * Always prefixes `[Agent]` so history / detail UIs attribute the sender correctly.
 */
export function formatAgentSender(input?: {
  name?: string | null;
  email?: string | null;
}): Pick<JobCaseEmailRecord, 'from' | 'fromEmail'> {
  const email = normalizeEmail(input?.email);
  const rawName = input?.name?.trim();
  const name =
    rawName &&
    !/^awaiting assignment$/i.test(rawName) &&
    rawName.toLowerCase() !== 'unassigned'
      ? rawName
      : email
        ? email
        : 'Managing Agent';

  const parsed = parseRoleBracketLabel(name);
  const display = parsed.remainder || name;
  return {
    from: `[Agent] ${display}`,
    ...(email ? { fromEmail: email } : {}),
  };
}

export function isAgentOutboundEmail(record: Pick<JobCaseEmailRecord, 'from' | 'fromEmail' | 'kind'>): boolean {
  if (record.kind && CROSSUB_INBOUND_KINDS.has(record.kind)) return false;
  if (isCrossubParty(record.from, record.fromEmail)) return false;
  if (record.kind && AGENT_OUTBOUND_KINDS.has(record.kind)) return true;
  return looksLikeAgentParty(record.from);
}

/** Ensure agent-authored records carry a visible `[Agent]` From label. */
export function attributeAgentOutboundEmails(
  records: JobCaseEmailRecord[],
): JobCaseEmailRecord[] {
  return records.map((record) => {
    if (!isAgentOutboundEmail(record)) return record;
    if (record.from.trim().startsWith('[Agent]')) return record;

    const email = normalizeEmail(record.fromEmail) ?? normalizeEmail(record.from);
    const parsed = parseRoleBracketLabel(record.from);
    const nameCandidate = parsed.remainder || record.from;
    const name = nameCandidate.includes('@') ? undefined : nameCandidate;

    return {
      ...record,
      ...formatAgentSender({ name, email }),
    };
  });
}
