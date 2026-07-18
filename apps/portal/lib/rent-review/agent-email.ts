import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import {
  attributeAgentOutboundEmails,
  formatAgentSender,
  isAgentOutboundEmail,
} from '@/lib/job-case-email-sender';

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

/** Fill missing sender emails on agent-authored workflow mail (synthesized + legacy audits). */
export function applyManagingAgentFromEmail(
  records: JobCaseEmailRecord[],
  agentEmail: string | undefined,
  agentName?: string | null,
): JobCaseEmailRecord[] {
  const email = agentEmail?.trim();
  const attributed = attributeAgentOutboundEmails(records);
  if (!email?.includes('@')) return attributed;

  return attributed.map((record) => {
    if (!isAgentOutboundEmail(record)) return record;
    return {
      ...record,
      ...formatAgentSender({
        name: agentName ?? record.from.replace(/^\[Agent\]\s*/i, ''),
        email: record.fromEmail ?? email,
      }),
    };
  });
}
