import { ROUTES } from '@/constants/routes';

/**
 * Screen awareness for Cros: which module the agent is on, sent as `pageModule` with every
 * turn. The server names the screen in Cros's prompt and treats the property on it as the
 * subject, so "this one" never needs an address.
 */
export const GII_PAGE_MODULE = {
  DASHBOARD: 'dashboard',
  TASKS: 'tasks',
  REMINDING: 'reminding',
  NOTIFICATIONS: 'notifications',
  SEARCH: 'search',
  PROPERTIES: 'properties',
  ARCHIVE: 'archive',
  MAINTENANCE: 'maintenance',
  INSPECTIONS: 'inspections',
  LEASING: 'leasing',
  PROPERTY_TRANSFER: 'property_transfer',
  TENANT_SELECTION: 'tenant_selection',
  RENT_REVIEW: 'rent_review',
  VACATING: 'vacating',
  TRIBUNAL: 'tribunal',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  COMMUNICATIONS: 'communications',
  TRUST: 'trust',
  ACCOUNTING: 'accounting',
  BILLING: 'billing',
  REPORTS: 'reports',
  PEOPLE: 'people',
  TENANTS: 'tenants',
  AGENCIES: 'agencies',
  TEAM: 'team',
  AGREEMENTS: 'agreements',
  SETTINGS: 'settings',
  SUPPORT: 'support',
} as const;

export type GiiPageModule = (typeof GII_PAGE_MODULE)[keyof typeof GII_PAGE_MODULE];

export type GiiPageRoute = {
  route: string;
  module: GiiPageModule;
  /** The list or landing screen. */
  label: string;
  /** One record opened under the route (`/maintenance/[id]`). Absent: same as `label`. */
  detailLabel?: string;
};

/**
 * Route → screen. Matched on the route or anything under it, longest route first, so
 * `/leasing/transfer` wins over `/leasing`.
 */
export const GII_PAGE_ROUTES: readonly GiiPageRoute[] = [
  { route: ROUTES.DASHBOARD, module: GII_PAGE_MODULE.DASHBOARD, label: 'Dashboard' },
  { route: ROUTES.TASKS, module: GII_PAGE_MODULE.TASKS, label: 'Tasks' },
  { route: ROUTES.REMINDING, module: GII_PAGE_MODULE.REMINDING, label: 'Reminders' },
  { route: ROUTES.NOTIFICATIONS, module: GII_PAGE_MODULE.NOTIFICATIONS, label: 'Notifications' },
  { route: ROUTES.SEARCH, module: GII_PAGE_MODULE.SEARCH, label: 'Search' },
  {
    route: ROUTES.PROPERTIES,
    module: GII_PAGE_MODULE.PROPERTIES,
    label: 'Properties',
    detailLabel: 'Property profile',
  },
  { route: ROUTES.ARCHIVE, module: GII_PAGE_MODULE.ARCHIVE, label: 'Archived properties' },
  {
    route: ROUTES.MAINTENANCE,
    module: GII_PAGE_MODULE.MAINTENANCE,
    label: 'Maintenance',
    detailLabel: 'Maintenance job',
  },
  {
    route: ROUTES.INSPECTIONS,
    module: GII_PAGE_MODULE.INSPECTIONS,
    label: 'Inspections',
    detailLabel: 'Inspection',
  },
  {
    route: ROUTES.PROPERTY_TRANSFER,
    module: GII_PAGE_MODULE.PROPERTY_TRANSFER,
    label: 'Property transfer',
  },
  {
    route: ROUTES.LEASING,
    module: GII_PAGE_MODULE.LEASING,
    label: 'Leasing',
    detailLabel: 'Leasing record',
  },
  {
    route: ROUTES.TENANT_SELECTION,
    module: GII_PAGE_MODULE.TENANT_SELECTION,
    label: 'Tenant selection',
    detailLabel: 'Tenant application',
  },
  {
    route: ROUTES.RENT_REVIEW,
    module: GII_PAGE_MODULE.RENT_REVIEW,
    label: 'Rent review',
    detailLabel: 'Rent review',
  },
  {
    route: ROUTES.VACATING,
    module: GII_PAGE_MODULE.VACATING,
    label: 'Vacating',
    detailLabel: 'Vacate case',
  },
  {
    route: ROUTES.TRIBUNAL,
    module: GII_PAGE_MODULE.TRIBUNAL,
    label: 'Tribunal',
    detailLabel: 'Tribunal case',
  },
  { route: ROUTES.CONVERSATIONS, module: GII_PAGE_MODULE.CONVERSATIONS, label: 'Conversations' },
  {
    route: ROUTES.MESSAGES,
    module: GII_PAGE_MODULE.MESSAGES,
    label: 'Messages',
    detailLabel: 'Message thread',
  },
  { route: ROUTES.COMMUNICATIONS, module: GII_PAGE_MODULE.COMMUNICATIONS, label: 'Communications' },
  { route: ROUTES.TRUST, module: GII_PAGE_MODULE.TRUST, label: 'Trust accounting' },
  { route: ROUTES.ACCOUNTING, module: GII_PAGE_MODULE.ACCOUNTING, label: 'Accounting' },
  { route: ROUTES.BILL, module: GII_PAGE_MODULE.BILLING, label: 'Bill' },
  { route: ROUTES.BILLING_OVERDUE, module: GII_PAGE_MODULE.BILLING, label: 'Overdue billing' },
  { route: ROUTES.PRICING, module: GII_PAGE_MODULE.BILLING, label: 'Pricing' },
  { route: ROUTES.REPORTS, module: GII_PAGE_MODULE.REPORTS, label: 'Reports' },
  { route: ROUTES.PEOPLE, module: GII_PAGE_MODULE.PEOPLE, label: 'People', detailLabel: 'Person' },
  { route: ROUTES.TENANTS_NEW, module: GII_PAGE_MODULE.TENANTS, label: 'New tenant' },
  { route: ROUTES.TENANTS, module: GII_PAGE_MODULE.TENANTS, label: 'Tenants' },
  { route: ROUTES.AGENCIES, module: GII_PAGE_MODULE.AGENCIES, label: 'Agencies', detailLabel: 'Agency' },
  { route: ROUTES.TEAM, module: GII_PAGE_MODULE.TEAM, label: 'Team' },
  { route: ROUTES.AGREEMENTS, module: GII_PAGE_MODULE.AGREEMENTS, label: 'Agreements' },
  { route: ROUTES.SETTINGS, module: GII_PAGE_MODULE.SETTINGS, label: 'Settings' },
  { route: ROUTES.PROFILE, module: GII_PAGE_MODULE.SETTINGS, label: 'Profile' },
  { route: ROUTES.SUPPORT, module: GII_PAGE_MODULE.SUPPORT, label: 'Support' },
  { route: ROUTES.FAQ, module: GII_PAGE_MODULE.SUPPORT, label: 'FAQ' },
].sort((a, b) => b.route.length - a.route.length);

/** A path segment under a route that is a form, not a record (`/inspections/new`). */
export const GII_PAGE_NON_RECORD_SEGMENTS: ReadonlySet<string> = new Set(['new']);

/** Server limit on `GiiChatContextDto.pageLabel` (`@MaxLength`). */
export const GII_PAGE_LABEL_MAX_LENGTH = 240;

/** Joins the screen name and the property on it in `pageLabel`. */
export const GII_PAGE_LABEL_SEPARATOR = ' · ';
