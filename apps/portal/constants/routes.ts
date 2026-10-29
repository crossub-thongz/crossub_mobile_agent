export const ROUTES = {
  STATUS: '/status',
  REMINDING: '/reminding',
  TASKS: '/tasks',
  NEED_ACTION: '/tasks',
  TRIBUNAL: '/tribunal',
  DASHBOARD: '/dashboard',
  ACCOUNTING: '/accounting',
  LOGIN: '/login',
  BILLING_OVERDUE: '/billing/overdue',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  CHANGE_PASSWORD: '/change-password',
  PROPERTIES: '/properties',
  AGENCIES: '/agencies',
  INSPECTIONS: '/inspections',
  MAINTENANCE: '/maintenance',
  LEASING: '/leasing',
  RENT_REVIEW: '/rent-review',
  VACATING: '/vacating',
  MESSAGES: '/messages',
  COMMUNICATIONS: '/communications',
  /** Self-Manage three-pane inbox (threads, conversation, job context). */
  CONVERSATIONS: '/conversations',
  /**
   * Self-Manage Accounting, the trust accounting module (principals and accountants). The path
   * stays `/trust`: `/accounting` is the existing Accounting page.
   */
  TRUST: '/trust',
  /** Self-Manage People: the agency's tenants, owners, suppliers and applicants with CP references. */
  PEOPLE: '/people',
  NOTIFICATIONS: '/notifications',
  REPORTS: '/reports',
  SEARCH: '/search',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  FAQ: '/faq',
  BILL: '/bill',
  PRICING: '/pricing',
  /** Pricing page, scrolled to the Full management section. */
  PRICING_FULL_MANAGEMENT: '/pricing#full-management',
  SYSTEM_ACCESS_AGREEMENT: '/system-access-agreement',
  TENANT_SELECTION: '/tenant-selection',
  TENANTS: '/tenants',
  TENANTS_NEW: '/tenants/new',
  PROPERTY_TRANSFER: '/leasing/transfer',
  ARCHIVE: '/archive',
  MORE: '/more',
  TEAM: '/team',
  SUPPORT: '/support',
  SUPPORT_CONTACT: '/support/contact',
  SUPPORT_GETTING_STARTED: '/support/getting-started',
  SUPPORT_TUTORIAL: '/support/tutorial',
  SUPPORT_TRAINING: '/support/training',
  SUPPORT_WORKFLOW_TOURS: '/support/workflow-tours',
  AGREEMENTS: '/agreements',
} as const;

export const PUBLIC_ROUTE_PATTERNS = [
  /^\/login\/?$/,
  /^\/register\/?$/,
  /^\/register\/invite(\/|$)/,
  /^\/register\/team-invite(\/|$)/,
  /^\/forgot-password\/?$/,
  /^\/reset-password(\/|$)/,
  /^\/verify-email(\/|$)/,
  // Mic self-check. Public on purpose: it diagnoses hardware and browser support, reads no
  // account data, and the people who need it are the ones a broken mic is blocking.
  /^\/voice-check\/?$/,
];

export const isPublicRoute = (pathname: string): boolean =>
  PUBLIC_ROUTE_PATTERNS.some((rx) => rx.test(pathname));

/** First-login / invite screens — the welcome video waits until the portal itself. */
export function isPortalWelcomeDeferredRoute(pathname: string): boolean {
  if (!pathname || isPublicRoute(pathname)) return true;
  return (
    pathname === ROUTES.CHANGE_PASSWORD ||
    pathname.startsWith(`${ROUTES.CHANGE_PASSWORD}/`) ||
    pathname === ROUTES.SYSTEM_ACCESS_AGREEMENT ||
    pathname.startsWith(`${ROUTES.SYSTEM_ACCESS_AGREEMENT}/`)
  );
}

import {
  appendDetailNavContext,
  type DetailNavContext,
} from '@/lib/detail-navigation';

export type { DetailNavContext };

export const propertyDetail = (id: string) => `/properties/${id}`;

/** Property hub Financials tab (v2) / Accounting tab (v1). */
export function propertyFinancialsHref(
  id: string,
  options?: { focusArrears?: boolean },
): string {
  const params = new URLSearchParams({
    section: 'financials',
    tab: 'Accounting',
  });
  if (options?.focusArrears) params.set('focus', 'arrears');
  return `${propertyDetail(id)}?${params.toString()}`;
}
export const agencyDetail = (id: string) => `/agencies/${id}`;
/** People list, opened on one agency when the agent runs several Self-Manage agencies. */
export const peopleList = (agencyId?: string) =>
  agencyId ? `${ROUTES.PEOPLE}?agencyId=${encodeURIComponent(agencyId)}` : ROUTES.PEOPLE;
/** One person's profile; the API scopes it to the agency, so the agency travels with the link. */
export const personDetail = (personId: string, agencyId: string) =>
  `${ROUTES.PEOPLE}/${encodeURIComponent(personId)}?agencyId=${encodeURIComponent(agencyId)}`;
export const propertyLeasePackage = (propertyId: string, leaseId: string) =>
  `/properties/${propertyId}/lease/${leaseId}`;
export const propertyArchivedLandlord = (propertyId: string, archiveKey: string) =>
  `/properties/${propertyId}/landlord-archive/${archiveKey}`;

export const propertyLeasingWorkflow = (propertyId: string) =>
  `/properties/${propertyId}/leasing-workflow`;
export const propertyTransfer = () => ROUTES.PROPERTY_TRANSFER;
export const propertyNew = () => `/properties/new`;
export const propertyRegistryResume = (propertyId: string) =>
  `/properties/new?propertyId=${encodeURIComponent(propertyId)}`;
export const propertyHref = (property: { id: string; registryIntakeComplete?: boolean }) =>
  property.registryIntakeComplete === false
    ? propertyRegistryResume(property.id)
    : propertyDetail(property.id);
export const tenantNew = (query?: Record<string, string>) => {
  if (!query || Object.keys(query).length === 0) return ROUTES.TENANTS_NEW;
  const params = new URLSearchParams(query);
  return `${ROUTES.TENANTS_NEW}?${params.toString()}`;
};
export const inspectionDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/inspections/${id}`, ctx);
/** Query flag that opens an inspection's "Use a CROSSUB inspector?" step. */
export const INSPECTION_CROSSUB_QUERY = 'crossub';
/** An inspection with its "Use a CROSSUB inspector?" step opened (Self-Manage). */
export const inspectionCrossubInspector = (id: string) =>
  `${inspectionDetail(id)}?${INSPECTION_CROSSUB_QUERY}=1`;
export const inspectionNew = (propertyId?: string) =>
  propertyId ? `/inspections/new?property=${propertyId}` : '/inspections/new';
export const maintenanceDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/maintenance/${id}`, ctx);
export const rentReviewDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/rent-review/${id}`, ctx);
export const vacatingDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/vacating/${id}`, ctx);
export const leasingDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/leasing/${id}`, ctx);
/** `/leasing/[id]` is the V2 task page (V1 sends it to Tasks), so V1 opens the property's workflow. */
export const leasingCycleHref = (cycle: { id: string; propertyId: string }, isV2: boolean) =>
  isV2 ? leasingDetail(cycle.id) : propertyLeasingWorkflow(cycle.propertyId);
export const messagesNew = (query?: { property?: string }) => {
  if (!query?.property) return '/messages/new';
  return `/messages/new?property=${encodeURIComponent(query.property)}`;
};
export const messageDetail = (id: string) => `/messages/${id}`;

export const messagesForProperty = (propertyId: string) =>
  `/messages?property=${encodeURIComponent(propertyId)}`;
export const needActionsForProperty = (propertyId: string) =>
  `/tasks?property=${encodeURIComponent(propertyId)}`;
/** A Self-Manage Conversations thread, opened on load (the inbox has no per-thread route). */
export const CONVERSATION_THREAD_PARAM = 'thread';
export const conversationThread = (conversationId: string) =>
  `${ROUTES.CONVERSATIONS}?${CONVERSATION_THREAD_PARAM}=${encodeURIComponent(conversationId)}`;
export const communicationsThread = (threadId: string) =>
  `${ROUTES.COMMUNICATIONS}?threadId=${encodeURIComponent(threadId)}`;
export const messageDetailParty = (id: string, party: 'tenant' | 'owner') =>
  `/messages/${id}?party=${party}`;
export const tenantSelectionDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/tenant-selection/${id}`, ctx);
export const tribunalDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/tribunal/${id}`, ctx);
