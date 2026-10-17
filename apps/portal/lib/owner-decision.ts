import {
  OWNER_DECISION_COPY,
  OWNER_DECISION_EMAIL_STATUS,
  OWNER_DECISION_EMAIL_STATUS_LABEL,
  OWNER_DECISION_EMAIL_STATUS_TONE,
  OWNER_DECISION_RECORD_ONLY_LABEL,
  OWNER_DECISION_RECORD_ONLY_TONE,
} from '@/constants/owner-decision';
import type { AgentOwnerDecision } from '@/lib/crossub-api/agent-client';

/**
 * What the confirm step expects to happen to the owner copy. A prediction from the agency's tier
 * and the owner email on file; the server resolves the property's own level and reports the real
 * outcome in `emailStatus`.
 */
export type OwnerDecisionEmailPlan =
  | { send: true; to: string }
  | { send: false; reason: string };

export function planOwnerDecisionEmail(input: {
  selfManaged: boolean;
  ownerEmail: string | null | undefined;
}): OwnerDecisionEmailPlan {
  if (!input.selfManaged) {
    return { send: false, reason: OWNER_DECISION_COPY.recordOnlyNotSelfManaged };
  }
  const to = input.ownerEmail?.trim();
  if (!to) return { send: false, reason: OWNER_DECISION_COPY.recordOnlyNoOwnerEmail };
  return { send: true, to };
}

export function ownerDecisionEmailStatusLabel(status: AgentOwnerDecision['emailStatus']): string {
  return status ? OWNER_DECISION_EMAIL_STATUS_LABEL[status] : OWNER_DECISION_RECORD_ONLY_LABEL;
}

export function ownerDecisionEmailStatusTone(status: AgentOwnerDecision['emailStatus']): string {
  return status ? OWNER_DECISION_EMAIL_STATUS_TONE[status] : OWNER_DECISION_RECORD_ONLY_TONE;
}

/** Toast line after a save: emailed, recorded only, or recorded but the copy did not go. */
export function ownerDecisionRecordedToast(status: AgentOwnerDecision['emailStatus']): string {
  if (status === null) return OWNER_DECISION_COPY.toastRecorded;
  if (status === OWNER_DECISION_EMAIL_STATUS.SENT) return OWNER_DECISION_COPY.toastSent;
  return OWNER_DECISION_COPY.toastNotDelivered;
}

// The preview mirrors the API's template in
// `crossub_web/apps/api/src/constants/owner-decision.constants.ts`; the server sends its own copy.

/** `{decision} — {address}`, as the API sends it. */
export function ownerDecisionEmailSubject(decision: string, address: string): string {
  return `${decision} — ${address}`;
}

/** Body preview, line for line with the API template. */
export function ownerDecisionEmailBody(args: {
  ownerName: string | null | undefined;
  agencyName: string;
  address: string;
  decision: string;
  summary: string;
}): string {
  const greeting = args.ownerName?.trim() ? `Hi ${args.ownerName.trim()},` : 'Hi,';
  return [
    greeting,
    '',
    `For your records, ${args.agencyName} has made the following decision for ${args.address}.`,
    '',
    args.decision,
    '',
    args.summary,
    '',
    'There is nothing you need to do. Reply to this email if you have any questions.',
    '',
    args.agencyName,
  ].join('\n');
}
