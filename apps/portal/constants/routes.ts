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
  NOTIFICATIONS: '/notifications',
  REPORTS: '/reports',
  SEARCH: '/search',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  SYSTEM_ACCESS_AGREEMENT: '/system-access-agreement',
  TENANT_SELECTION: '/tenant-selection',
  TENANTS: '/tenants',
  TENANTS_NEW: '/tenants/new',
  PROPERTY_TRANSFER: '/leasing/transfer',
  ARCHIVE: '/archive',
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
export const agencyDetail = (id: string) => `/agencies/${id}`;
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
export const tenantNew = (query?: Record<string, string>) => {
  if (!query || Object.keys(query).length === 0) return ROUTES.TENANTS_NEW;
  const params = new URLSearchParams(query);
  return `${ROUTES.TENANTS_NEW}?${params.toString()}`;
};
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
export const communicationsThread = (threadId: string) =>
  `${ROUTES.COMMUNICATIONS}?threadId=${encodeURIComponent(threadId)}`;
export const messageDetailParty = (id: string, party: 'tenant' | 'owner') =>
  `/messages/${id}?party=${party}`;
export const tenantSelectionDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/tenant-selection/${id}`, ctx);
export const tribunalDetail = (id: string, ctx?: DetailNavContext) =>
  appendDetailNavContext(`/tribunal/${id}`, ctx);
