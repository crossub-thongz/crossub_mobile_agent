import { AGENCY_MEMBERSHIP_TIER, type AgencyMembershipTierValue } from '@/constants/api-enums';

/** The principal's invite form on the Team page. */
export const AGENCY_TEAM_INVITE_COPY = {
  heading: 'Invite a team member',
  roleLabel: 'Role',
  nameLabel: 'Name (optional)',
  emailLabel: 'Email',
  emailRequired: 'Enter their email',
  send: 'Send invite',
} as const;

/** One line under each invite role. */
export const AGENCY_INVITE_TIER_HINT: Partial<Record<AgencyMembershipTierValue, string>> = {
  [AGENCY_MEMBERSHIP_TIER.AGENT]: 'Works the properties you assign them.',
  [AGENCY_MEMBERSHIP_TIER.ACCOUNTANT]:
    'Runs your trust account on Self-Manage: receipts, bills, disbursements and reconciliation.',
};
