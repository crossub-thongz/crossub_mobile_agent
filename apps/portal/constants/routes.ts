export const ROUTES = {
  STATUS: '/status',
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PROPERTIES: '/properties',
  INSPECTIONS: '/inspections',
  MAINTENANCE: '/maintenance',
  RENT_REVIEW: '/rent-review',
  VACATING: '/vacating',
  MESSAGES: '/messages',
  NOTIFICATIONS: '/notifications',
  REPORTS: '/reports',
  SEARCH: '/search',
  TENANT_SELECTION: '/tenant-selection',
} as const;

export const PUBLIC_ROUTE_PATTERNS = [
  /^\/login\/?$/,
  /^\/forgot-password\/?$/,
  /^\/reset-password(\/|$)/,
];

export const isPublicRoute = (pathname: string): boolean =>
  PUBLIC_ROUTE_PATTERNS.some((rx) => rx.test(pathname));

export const propertyDetail = (id: string) => `/properties/${id}`;
export const inspectionDetail = (id: string) => `/inspections/${id}`;
export const maintenanceDetail = (id: string) => `/maintenance/${id}`;
export const rentReviewDetail = (id: string) => `/rent-review/${id}`;
export const vacatingDetail = (id: string) => `/vacating/${id}`;
export const messageDetail = (id: string) => `/messages/${id}`;
export const tenantSelectionDetail = (id: string) => `/tenant-selection/${id}`;
