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
  COMMUNICATIONS: '/communications',
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

import {
  appendDetailNavContext,
  type DetailNavContext,
} from '@/lib/detail-navigation';

export type { DetailNavContext };

export const propertyDetail = (id: string) => `/properties/${id}`;
export const propertyLeasePackage = (propertyId: string, leaseId: string) =>
  `/properties/${propertyId}/lease/${leaseId}`;
export const propertyNew = () => `/properties/new`;
export const inspectionDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/inspections/${id}`, ctx);
export const inspectionNew = (propertyId?: string) =>
  propertyId ? `/inspections/new?property=${propertyId}` : '/inspections/new';
export const maintenanceDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/maintenance/${id}`, ctx);
export const rentReviewDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/rent-review/${id}`, ctx);
export const vacatingDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/vacating/${id}`, ctx);
export const messagesNew = () => '/messages/new';
export const messageDetail = (id: string) => `/messages/${id}`;
export const messageDetailParty = (id: string, party: 'tenant' | 'owner') =>
  `/messages/${id}?party=${party}`;
export const tenantSelectionDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/tenant-selection/${id}`, ctx);
export const tribunalDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/tribunal/${id}`, ctx);
