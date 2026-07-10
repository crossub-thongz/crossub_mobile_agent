import type { BuiltinQuickActionId } from '@/lib/quick-actions';
import type { Agency } from '@/lib/types';
import { ROUTES } from '@/constants/routes';

export type AgentPortalServiceLevel =
  | 'LEVEL_1_INSPECTION_ONLY'
  | 'LEVEL_2_FULL_MANAGEMENT';

export const PORTAL_SERVICE_LEVEL_LABEL: Record<AgentPortalServiceLevel, string> = {
  LEVEL_1_INSPECTION_ONLY: 'Inspection only',
  LEVEL_2_FULL_MANAGEMENT: 'Full management',
};

export const DEFAULT_PORTAL_SERVICE_LEVEL: AgentPortalServiceLevel =
  'LEVEL_2_FULL_MANAGEMENT';

export function resolvePortalServiceLevel(
  level: AgentPortalServiceLevel | undefined,
): AgentPortalServiceLevel {
  return level ?? DEFAULT_PORTAL_SERVICE_LEVEL;
}

export function isInspectionOnlyLevel(level: AgentPortalServiceLevel): boolean {
  return level === 'LEVEL_1_INSPECTION_ONLY';
}

export function hasFullManagementAccess(agencies: Agency[]): boolean {
  return agencies.some(
    (a) => !isInspectionOnlyLevel(resolvePortalServiceLevel(a.portalServiceLevel)),
  );
}

/** True when every assigned agency is Level 1 (inspection-only). */
export function isInspectionOnlyAgent(agencies: Agency[]): boolean {
  if (agencies.length === 0) return false;
  return !hasFullManagementAccess(agencies);
}

export function getAgencyPortalLevel(
  agencies: Agency[],
  agencyId?: string,
): AgentPortalServiceLevel {
  if (!agencyId) return DEFAULT_PORTAL_SERVICE_LEVEL;
  const agency = agencies.find((a) => a.id === agencyId);
  return resolvePortalServiceLevel(agency?.portalServiceLevel);
}

export function isPropertyInspectionOnly(
  agencies: Agency[],
  propertyAgencyId?: string,
): boolean {
  return isInspectionOnlyLevel(getAgencyPortalLevel(agencies, propertyAgencyId));
}

export const FULL_MANAGEMENT_ROUTE_PREFIXES = [
  ROUTES.LEASING,
  ROUTES.TRIBUNAL,
  ROUTES.MAINTENANCE,
  ROUTES.ACCOUNTING,
  ROUTES.RENT_REVIEW,
  ROUTES.TENANT_SELECTION,
  ROUTES.TENANTS,
  ROUTES.VACATING,
  ROUTES.REPORTS,
  ROUTES.MESSAGES,
  ROUTES.COMMUNICATIONS,
  '/properties/new',
] as const;

export function isFullManagementRoute(pathname: string): boolean {
  return FULL_MANAGEMENT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export type PortalNavAccess = 'any' | 'full';

export function filterNavByAccess<T extends { portalAccess?: PortalNavAccess }>(
  items: readonly T[],
  hasFullAccess: boolean,
): T[] {
  return items.filter((item) => item.portalAccess !== 'full' || hasFullAccess);
}

export const INSPECTION_ONLY_HIDDEN_QUICK_ACTIONS: BuiltinQuickActionId[] = [
  'add-property',
  'add-tenant',
  'maintenance',
  'rent-review',
  'tribunal',
  'message',
];

export const PROPERTY_DETAIL_TABS = [
  'Overview',
  'Documents',
  'Rent Review',
  'Leasing',
  'Maintenance',
  'Inspection',
  'Accounting',
  'History',
] as const;

export type PropertyDetailTab = (typeof PROPERTY_DETAIL_TABS)[number];

const INSPECTION_ONLY_PROPERTY_TABS: PropertyDetailTab[] = [
  'Overview',
  'Documents',
  'Inspection',
];

const FULL_MANAGEMENT_PROPERTY_TABS: PropertyDetailTab[] = [...PROPERTY_DETAIL_TABS];

export function propertyDetailTabsForAgency(
  agencies: Agency[],
  propertyAgencyId?: string,
): PropertyDetailTab[] {
  return isPropertyInspectionOnly(agencies, propertyAgencyId)
    ? INSPECTION_ONLY_PROPERTY_TABS
    : FULL_MANAGEMENT_PROPERTY_TABS;
}
