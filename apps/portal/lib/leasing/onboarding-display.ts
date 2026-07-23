import { LEASING_ITEM_STATUS, type LeasingItemStatus } from '@/lib/leasing/constants';
import { getApprovedApplications } from '@/lib/leasing/lifecycle';
import type {
  LeasingAgreementState,
  LeasingApplicationDetail,
  LeasingPropertyDetail,
  LeasingTimelineEvent,
} from '@/lib/leasing/types';

export type AgreementPhase = 'preparing' | 'sent' | 'signed';

export const AGREEMENT_PHASE_LABEL: Record<AgreementPhase, string> = {
  preparing: 'Preparing Agreement',
  sent: 'Agreement Sent',
  signed: 'Agreement Signed',
};

export const AGREEMENT_PHASE_ORDER: AgreementPhase[] = ['preparing', 'sent', 'signed'];

export function resolveOnboardingTenant(
  detail: LeasingPropertyDetail,
): LeasingApplicationDetail | null {
  const approved = getApprovedApplications(detail);
  if (approved.length === 0) return null;
  return approved.find((app) => Boolean(app.feedbackSentAt)) ?? approved[0] ?? null;
}

export function deriveAgreementPhase(agreement: LeasingAgreementState): AgreementPhase {
  if (agreement.signingStatus === 'signed') return 'signed';
  if (agreement.signingStatus === 'sent' || agreement.signingStatus === 'viewed') return 'sent';
  return 'preparing';
}

export function paymentConfirmationLabel(input: {
  kind: 'deposit' | 'bond';
  status: LeasingItemStatus;
  timeline: LeasingTimelineEvent[];
  ledgerEntryId?: string;
}): string {
  if (input.status === LEASING_ITEM_STATUS.WAITING) return 'Awaiting confirmation';
  if (input.status !== LEASING_ITEM_STATUS.DONE) return 'Not paid';

  const proofNeedle =
    input.kind === 'deposit' ? 'deposit proof approved' : 'bond proof approved';
  const markedNeedle = input.kind === 'deposit' ? 'deposit marked paid' : 'bond marked paid';

  const haystack = (input.timeline ?? []).map((entry) => entry.label.toLowerCase());
  if (haystack.some((label) => label.includes(proofNeedle))) {
    return 'Paid · Agent confirmed';
  }
  if (haystack.some((label) => label.includes(markedNeedle)) || input.ledgerEntryId) {
    return 'Paid · Admin confirmed';
  }
  return 'Paid';
}

export function onboardingAuditEntries(detail: LeasingPropertyDetail): LeasingTimelineEvent[] {
  const needles = [
    'deposit',
    'bond',
    'agreement',
    'onboarding',
    'key collection',
    'ingoing',
    'tenant login',
    'lease terms',
    'contract',
    'signed',
    'emailed',
    'email',
    'proof',
    'credentials',
    'approved',
    'feedback',
    'handover',
    'e-signature',
    'esign',
  ];
  return (detail.timeline ?? [])
    .filter((entry) => {
      const haystack = `${entry.label} ${entry.kind}`.toLowerCase();
      return needles.some((needle) => haystack.includes(needle));
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Display label for onboarding audit — enriches open-report summaries when needed. */
export function formatOnboardingAuditLabel(
  entry: LeasingTimelineEvent,
  detail: LeasingPropertyDetail,
): string {
  if (!/^open report generated/i.test(entry.label.trim())) return entry.label;
  if (/checked in/i.test(entry.label)) return entry.label;

  const approvedMatch = entry.label.match(/(\d+)\s+approved/i);
  const approvedCount = approvedMatch ? Number(approvedMatch[1]) : 0;
  const checkedInCount = detail.openReport.attendeeCount ?? 0;
  return `Open report generated — ${approvedCount} approved, ${checkedInCount} checked in`;
}

/** Display actor for onboarding audit — maps stored roles to Name (Role). */
export function formatOnboardingAuditActor(
  entry: LeasingTimelineEvent,
  detail: LeasingPropertyDetail,
): string {
  const actor = entry.actor.trim();
  const actorLower = actor.toLowerCase();
  const labelLower = entry.label.trim().toLowerCase();

  if (
    labelLower === 'applicant approved' ||
    actorLower === 'agent / property manager' ||
    actorLower === 'property manager'
  ) {
    return 'Property Manager';
  }

  if (
    actorLower === 'leasing officer' ||
    actorLower === 'agent' ||
    actorLower.endsWith('(agent)')
  ) {
    const agentName = detail.agentInfo.name?.trim();
    if (agentName && !/^awaiting assignment$/i.test(agentName)) {
      return `${agentName} (Agent)`;
    }
    return 'Agent';
  }

  if (actorLower === 'tenant' || actorLower.endsWith('(tenant)')) {
    const tenantName = resolveOnboardingTenant(detail)?.applicant?.trim();
    if (tenantName) return `${tenantName} (Tenant)`;
    return 'Tenant';
  }

  return actor;
}

export function confirmedLeaseTerms(detail: LeasingPropertyDetail) {
  const contract = detail.onboarding.agreement.contract;
  return {
    weeklyRent: contract.weeklyRent ?? detail.rental.rentPerWeek,
    startDate: contract.startDate ?? detail.rental.moveInDate ?? detail.rental.availableFrom,
    leaseTerm: contract.leaseTerm ?? detail.rental.leaseTerm,
  };
}
