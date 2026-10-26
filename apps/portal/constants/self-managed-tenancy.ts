/**
 * Self-Manage "Create tenancy" (Daniel, Oct 2026): under Results the agency records the tenants and
 * the lease it agreed itself, and the letting closes onto that tenancy. It replaces the application
 * path on Self-Manage. Value sets are typed off the contract DTO.
 */

import type { components } from '@crossub-thongz/api-contract';

type RecordAgencyTenancy = components['schemas']['RecordAgencyTenancyDto'];
export type AgencyTenancyRentProfileStatus =
  components['schemas']['AgentCreateTenancyResultDto']['rentProfileStatus'];

export type AgencyTenancyLeaseType = RecordAgencyTenancy['leaseType'];
export type AgencyTenancyRentPeriod = RecordAgencyTenancy['rentPeriod'];

export const AGENCY_TENANCY_LEASE_TYPE = {
  FIXED: 'fixed',
  PERIODIC: 'periodic',
} as const satisfies Record<string, AgencyTenancyLeaseType>;

export const AGENCY_TENANCY_RENT_PERIOD = {
  WEEKLY: 'weekly',
  FORTNIGHTLY: 'fortnightly',
  MONTHLY: 'monthly',
} as const satisfies Record<string, AgencyTenancyRentPeriod>;

export const AGENCY_TENANCY_LEASE_TYPE_LABEL: Record<AgencyTenancyLeaseType, string> = {
  [AGENCY_TENANCY_LEASE_TYPE.FIXED]: 'Fixed term',
  [AGENCY_TENANCY_LEASE_TYPE.PERIODIC]: 'Periodic',
};

export const AGENCY_TENANCY_RENT_PERIOD_LABEL: Record<AgencyTenancyRentPeriod, string> = {
  [AGENCY_TENANCY_RENT_PERIOD.WEEKLY]: 'Per week',
  [AGENCY_TENANCY_RENT_PERIOD.FORTNIGHTLY]: 'Per fortnight',
  [AGENCY_TENANCY_RENT_PERIOD.MONTHLY]: 'Per month',
};

export const AGENCY_TENANCY_RENT_PROFILE_STATUS = {
  SET: 'SET',
  NOT_TRUST_TIER: 'NOT_TRUST_TIER',
  TRUST_NOT_SET_UP: 'TRUST_NOT_SET_UP',
  NO_TENANT_LEDGER: 'NO_TENANT_LEDGER',
  ALREADY_SET: 'ALREADY_SET',
  FAILED: 'FAILED',
} as const satisfies Record<string, AgencyTenancyRentProfileStatus>;

/** What Create tenancy did with the tenant ledger's rent in Trust. */
export const AGENCY_TENANCY_RENT_PROFILE_MESSAGE: Record<AgencyTenancyRentProfileStatus, string> = {
  [AGENCY_TENANCY_RENT_PROFILE_STATUS.SET]: 'The rent is set on the tenant ledger in Trust.',
  [AGENCY_TENANCY_RENT_PROFILE_STATUS.NOT_TRUST_TIER]:
    'Ask the agency principal or accountant to set the rent in Trust.',
  [AGENCY_TENANCY_RENT_PROFILE_STATUS.TRUST_NOT_SET_UP]:
    'Trust is not set up for this agency, so the rent was not set there.',
  [AGENCY_TENANCY_RENT_PROFILE_STATUS.NO_TENANT_LEDGER]:
    'No tenant ledger opened in Trust yet. Open it from Trust, then set the rent.',
  [AGENCY_TENANCY_RENT_PROFILE_STATUS.ALREADY_SET]: 'The tenant ledger already had a rent; it was kept.',
  [AGENCY_TENANCY_RENT_PROFILE_STATUS.FAILED]: 'The rent could not be set in Trust. Set it there.',
};

/** The primary tenant plus as many co-tenants as the server accepts. */
export const AGENCY_TENANCY_MAX_TENANTS = 6;

export const CREATE_TENANCY_COPY = {
  // Results card
  title: 'Create tenancy',
  hint: 'Found your tenant? Record them and the lease you agreed. The property shows the new tenancy and this letting closes.',
  open: '+ Create tenancy',
  approvedApplicant: 'An applicant is already approved on this letting. Finish their onboarding under Tenancy.',

  // Dialog
  dialogTitle: 'Create tenancy',
  dialogDescription: 'Record the tenants and the lease. The tenancy is saved as signed.',
  tenantsHeading: 'Tenants',
  primaryTenant: 'Primary tenant',
  coTenant: (index: number) => `Co-tenant ${index}`,
  name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  addCoTenant: 'Add co-tenant',
  removeTenant: 'Remove',
  leaseHeading: 'Lease',
  leaseType: 'Lease type',
  leaseStart: 'Lease starts',
  leaseEnd: 'Lease ends',
  rent: 'Rent ($)',
  rentPeriod: 'Rent period',
  bond: 'Bond ($)',
  notes: 'Notes (optional)',
  notesPlaceholder: 'Anything to keep on the letting history',
  submit: 'Create tenancy',
  submitting: 'Creating…',
  cancel: 'Cancel',
  created: 'Tenancy created. The property now shows it.',

  // Recorded tenancy
  recordedTitle: 'Tenancy recorded',
  recordedHint: 'You recorded this tenancy. The letting is closed.',
  tenants: 'Tenants',
  weeklyRent: 'Rent/wk',
  leaseTerm: 'Term',
  starts: 'Starts',
  ends: 'Ends',
  noValue: '—',
  openProperty: 'Open property',
  nextStepsTitle: 'Next',
  nextSteps: [
    'Receipt the bond and the first rent in Trust.',
    'Book the ingoing inspection from Inspections.',
  ],
  invitesTitle: 'Tenant app',
  invitesHint: 'Nobody is emailed until you invite them. Each invite emails that tenant a login.',
  invite: 'Invite to tenant app',
  inviting: 'Inviting…',
  invited: 'Invited',
  inviteSent: (email: string) => `Tenant app login emailed to ${email}`,
  noEmail: 'No email on file',
  invitesLoading: 'Loading tenants…',
  invitesNone: 'No tenant contacts on the property for this tenancy.',
  tenancyWaiting: 'No tenancy yet. Create it under Results once you have found your tenant.',
  goToResults: 'Go to Results',

  errors: {
    primaryName: 'Enter the primary tenant’s name.',
    primaryContact: 'Enter an email or phone for the primary tenant.',
    coTenantName: 'Enter a name for each co-tenant, or remove the row.',
    startDate: 'Enter the lease start date.',
    endDate: 'Enter the lease end date for a fixed term.',
    endBeforeStart: 'The lease must end after it starts.',
    rent: 'Enter the rent.',
    bond: 'Enter a valid bond, or leave it blank.',
  },
} as const;
