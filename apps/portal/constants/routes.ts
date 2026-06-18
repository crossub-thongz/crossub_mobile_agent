export const ROUTES = {
  STATUS: '/status',
  REMINDING: '/reminding',
  TASKS: '/tasks',
  NEED_ACTION: '/tasks',
  TRIBUNAL: '/tribunal',
  DASHBOARD: '/dashboard',
  ACCOUNTING: '/accounting',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PROPERTIES: '/properties',
  INSPECTIONS: '/inspections',
  MAINTENANCE: '/maintenance',
  LEASING: '/leasing',
  RENT_REVIEW: '/rent-review',
  VACATING: '/vacating',
  MESSAGES: '/messages',
  NOTIFICATIONS: '/notifications',
  REPORTS: '/reports',
  SEARCH: '/search',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  TENANT_SELECTION: '/tenant-selection',
} as const;

export const PUBLIC_ROUTE_PATTERNS = [
  /^\/login\/?$/,
  /^\/register\/?$/,
  /^\/forgot-password\/?$/,
  /^\/reset-password(\/|$)/,
];

export const isPublicRoute = (pathname: string): boolean =>
  PUBLIC_ROUTE_PATTERNS.some((rx) => rx.test(pathname));

export const propertyDetail = (id: string) => `/properties/${id}`;
export const propertyLeasePackage = (propertyId: string, leaseId: string) =>
  `/properties/${propertyId}/lease/${leaseId}`;
export const propertyNew = () => `/properties/new`;
export const inspectionDetail = (id: string) => `/inspections/${id}`;
export const inspectionNew = (propertyId?: string) =>
  propertyId ? `/inspections/new?property=${propertyId}` : '/inspections/new';
export const maintenanceDetail = (id: string) => `/maintenance/${id}`;
export const rentReviewDetail = (id: string) => `/rent-review/${id}`;
export const vacatingDetail = (id: string) => `/vacating/${id}`;
export const messagesNew = () => '/messages/new';
export const messageDetail = (id: string) => `/messages/${id}`;
export const messageDetailParty = (id: string, party: 'tenant' | 'owner') =>
  `/messages/${id}?party=${party}`;
export const tenantSelectionDetail = (id: string) => `/tenant-selection/${id}`;
export const tribunalDetail = (id: string) => `/tribunal/${id}`;
