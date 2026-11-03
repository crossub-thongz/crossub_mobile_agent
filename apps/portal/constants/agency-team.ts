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

/** Switches a principal uses to hide Billing or Accounting from someone under the agency. */
export const AGENCY_TEAM_MODULE_COPY = {
  heading: 'Access',
  billing: 'Billing',
  billingHint: 'Invoices, bills and the card on file.',
  accounting: 'Accounting',
  accountingHint: 'Self-Manage trust: receipts, bills, disbursements and reconciliation.',
  principalNote: 'A principal always has billing and accounting.',
} as const;

/** One line under each invite role. */
export const AGENCY_INVITE_TIER_HINT: Partial<Record<AgencyMembershipTierValue, string>> = {
  [AGENCY_MEMBERSHIP_TIER.AGENT]: 'Works the properties you assign them.',
  [AGENCY_MEMBERSHIP_TIER.ACCOUNTANT]:
    'Runs your trust account on Self-Manage: receipts, bills, disbursements and reconciliation.',
};
