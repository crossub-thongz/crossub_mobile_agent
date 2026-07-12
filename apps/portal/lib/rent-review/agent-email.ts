import type { JobCaseEmailRecord } from '@/lib/job-case-email';

/** Resolve the signed-in / agency agent email for outbound rent-review mail. */
export function resolveRentReviewAgentEmail(input: {
  userEmail?: string | null;
  agencyContactEmail?: string | null;
}): string | undefined {
  const candidates = [input.userEmail, input.agencyContactEmail];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && trimmed.includes('@')) return trimmed;
  }
  return undefined;
}

function isManagingAgentFromParty(party: string): boolean {
  const lower = party.trim().toLowerCase();
  return lower.includes('managing agent') || lower === 'agent';
}

/** Fill missing sender emails on agent-authored workflow mail (synthesized + legacy audits). */
export function applyManagingAgentFromEmail(
  records: JobCaseEmailRecord[],
  agentEmail: string | undefined,
): JobCaseEmailRecord[] {
  const email = agentEmail?.trim();
  if (!email?.includes('@')) return records;

  return records.map((record) => ({
    ...record,
    fromEmail:
      record.fromEmail ??
      (isManagingAgentFromParty(record.from) ? email : undefined),
  }));
}
