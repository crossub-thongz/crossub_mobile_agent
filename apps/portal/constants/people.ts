/** Self-Manage People page: roles, filters, status labels and copy. */
import type {
  AgencyPeopleFolioRef,
  AgencyPersonApplication,
  AgencyPersonJob,
  AgencyPersonRole,
  AgencyPersonTenancy,
} from '@/lib/crossub-api/agent-client';

export const PEOPLE_PAGE_SIZE = 25;
export const PEOPLE_SEARCH_DEBOUNCE_MS = 300;
/** The API answers 404 for a person outside the agency (or an agency outside the agent's book). */
export const PEOPLE_NOT_FOUND_STATUS = 404;
/** Query parameter that carries the agency between the list and a profile. */
export const PEOPLE_AGENCY_PARAM = 'agencyId';

export const PERSON_ROLE = {
  TENANT: 'TENANT',
  OWNER: 'OWNER',
  SUPPLIER: 'SUPPLIER',
  APPLICANT: 'APPLICANT',
  AGENCY_STAFF: 'AGENCY_STAFF',
} as const satisfies Record<string, AgencyPersonRole>;

export const PERSON_ROLE_LABEL: Record<AgencyPersonRole, string> = {
  TENANT: 'Tenant',
  OWNER: 'Owner',
  SUPPLIER: 'Supplier',
  APPLICANT: 'Applicant',
  AGENCY_STAFF: 'Agency staff',
};

export const PERSON_ROLE_TONE: Record<AgencyPersonRole, string> = {
  TENANT: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  OWNER: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  SUPPLIER: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  APPLICANT: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  AGENCY_STAFF: 'bg-muted text-muted-foreground',
};

/** Role chips: every role, or one at a time (sent as the API's `role` filter). */
export const PEOPLE_ROLE_FILTER_ALL = 'ALL' as const;
export type PeopleRoleFilter = AgencyPersonRole | typeof PEOPLE_ROLE_FILTER_ALL;

export const PEOPLE_ROLE_FILTERS: readonly { id: PeopleRoleFilter; label: string }[] = [
  { id: PEOPLE_ROLE_FILTER_ALL, label: 'All' },
  { id: PERSON_ROLE.TENANT, label: 'Tenants' },
  { id: PERSON_ROLE.OWNER, label: 'Owners' },
  { id: PERSON_ROLE.SUPPLIER, label: 'Suppliers' },
  { id: PERSON_ROLE.APPLICANT, label: 'Applicants' },
  { id: PERSON_ROLE.AGENCY_STAFF, label: 'Agency staff' },
];

type TenancyStatus = AgencyPersonTenancy['status'];
type TenancyMemberRole = AgencyPersonTenancy['role'];
type TenancyMemberStatus = AgencyPersonTenancy['memberStatus'];
type FolioStatus = AgencyPeopleFolioRef['status'];
type JobStatus = AgencyPersonJob['status'];
type ApplicationStatus = AgencyPersonApplication['status'];

const TONE = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  INFO: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  ENDED: 'bg-muted text-muted-foreground',
  BAD: 'bg-destructive/15 text-destructive',
} as const;

export const TENANCY_STATUS_LABEL: Record<TenancyStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  PERIODIC: 'Periodic',
  VACATING: 'Vacating',
  ENDED: 'Ended',
};

export const TENANCY_STATUS_TONE: Record<TenancyStatus, string> = {
  PENDING: TONE.PENDING,
  ACTIVE: TONE.ACTIVE,
  PERIODIC: TONE.ACTIVE,
  VACATING: TONE.INFO,
  ENDED: TONE.ENDED,
};

export const TENANCY_MEMBER_ROLE_LABEL: Record<TenancyMemberRole, string> = {
  PRIMARY_TENANT: 'Primary tenant',
  CO_TENANT: 'Co-tenant',
  OCCUPANT: 'Occupant',
  GUARANTOR: 'Guarantor',
};

export const TENANCY_MEMBER_STATUS = {
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
} as const satisfies Record<string, TenancyMemberStatus>;

export const FOLIO_STATUS_LABEL: Record<FolioStatus, string> = {
  OPEN: 'Open',
  CLOSED: 'Closed',
};

export const FOLIO_STATUS_TONE: Record<FolioStatus, string> = {
  OPEN: TONE.ACTIVE,
  CLOSED: TONE.ENDED,
};

export const PERSON_JOB_STATUS_LABEL: Record<JobStatus, string> = {
  OPEN: 'Open',
  APPROVED: 'Approved',
  QUOTING: 'Quoting',
  SCHEDULED: 'Scheduled',
  INVOICED: 'Invoiced',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const PERSON_JOB_STATUS_TONE: Record<JobStatus, string> = {
  OPEN: TONE.PENDING,
  APPROVED: TONE.INFO,
  QUOTING: TONE.PENDING,
  SCHEDULED: TONE.INFO,
  INVOICED: TONE.INFO,
  COMPLETED: TONE.ACTIVE,
  CANCELLED: TONE.ENDED,
};

export const PERSON_APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  LEASED: 'Leased',
  WITHDRAWN: 'Withdrawn',
};

export const PERSON_APPLICATION_STATUS_TONE: Record<ApplicationStatus, string> = {
  DRAFT: TONE.ENDED,
  SUBMITTED: TONE.PENDING,
  APPROVED: TONE.ACTIVE,
  DECLINED: TONE.BAD,
  LEASED: TONE.ACTIVE,
  WITHDRAWN: TONE.ENDED,
};

export const PEOPLE_COPY = {
  title: 'People',
  agencyLabel: 'Agency',
  searchPlaceholder: 'Search name, email, phone or CP reference',
  loading: 'Loading people…',
  loadFailed: "Couldn't load people.",
  retry: 'Try again',
  loadMore: 'Load more',
  emptyTitle: 'No people yet',
  emptyDescription: "Tenants, owners, suppliers and applicants on this agency's properties appear here.",
  noMatchTitle: 'No one matches',
  noMatchDescription: 'Try another name, email, phone or CP reference, or clear the role filter.',
  noAgencyTitle: 'No Self-Manage agency',
  noAgencyDescription: 'People lists the people on your Self-Manage agencies.',
  /** "Showing 25 of 140". */
  shownOf: (shown: number, total: number) => `Showing ${shown} of ${total}`,
  noEmail: 'No email',
  noPhone: 'No phone',
} as const;

export const PERSON_PROFILE_COPY = {
  backLabel: 'People',
  loading: 'Loading profile…',
  loadFailed: "Couldn't load this person.",
  notFoundTitle: 'Person not found',
  notFoundDescription: 'This person is not on this agency, or the link is missing its agency.',
  hasLogin: 'Has app login',
  primary: 'Primary',
  archived: 'Archived',
  blacklisted: 'Blacklisted',
  leftTenancy: 'Left',
  noDates: 'No dates',
  noFolio: 'No folio yet',
  trustNotManaged: 'Trust not managed by Crossub',
  folioLabel: 'Folio',
  sections: {
    tenancies: 'Tenancies',
    tenantContacts: 'Tenant contact with no tenancy',
    owned: 'Owns',
    supplier: 'Supplier',
    supplierAgencies: 'Agencies',
    recentJobs: 'Recent jobs',
    supplierFolios: 'Folios',
    applications: 'Applications',
  },
  /** "12 jobs". */
  jobCount: (count: number) => `${count} ${count === 1 ? 'job' : 'jobs'}`,
  /** "Start 01/02/2026 · End 31/01/2027". */
  dateRange: (start: string | null, end: string | null) =>
    [start ? `Start ${start}` : null, end ? `End ${end}` : null].filter(Boolean).join(' · '),
  /** "Applied 03/10/2026". */
  applied: (date: string) => `Applied ${date}`,
  /** "Raised 03/10/2026". */
  raised: (date: string) => `Raised ${date}`,
  jobNoReference: 'Job',
  noProperty: 'No property',
} as const;
