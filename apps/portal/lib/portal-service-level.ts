import type { BuiltinQuickActionId } from '@/lib/quick-actions';
import type { Agency } from '@/lib/types';
import { ROUTES } from '@/constants/routes';

export type AgentPortalServiceLevel =
  | 'LEVEL_1_INSPECTION_ONLY'
  | 'LEVEL_2_FULL_MANAGEMENT'
  | 'LEVEL_3_LEGACY';

export const PORTAL_SERVICE_LEVEL_LABEL: Record<AgentPortalServiceLevel, string> = {
  LEVEL_1_INSPECTION_ONLY: 'Inspection & tribunal',
  LEVEL_2_FULL_MANAGEMENT: 'Full management',
  LEVEL_3_LEGACY: 'Legacy clients',
};

export type RegisterablePortalServiceLevel =
  | 'LEVEL_1_INSPECTION_ONLY'
  | 'LEVEL_2_FULL_MANAGEMENT';

/** User-facing labels on the registration flow. */
export const REGISTER_SERVICE_LEVEL_LABEL: Record<RegisterablePortalServiceLevel, string> = {
  LEVEL_1_INSPECTION_ONLY: 'Inspection Only Service',
  LEVEL_2_FULL_MANAGEMENT: 'Full Service',
};

export const REGISTER_SERVICE_LEVEL_DESCRIPTION: Record<
  RegisterablePortalServiceLevel,
  string
> = {
  LEVEL_1_INSPECTION_ONLY:
    'Add properties and order inspections and tribunal support. Pay when you place the order. Inspection module only — upgrade anytime for leasing, maintenance, and accounting.',
  LEVEL_2_FULL_MANAGEMENT:
    'Full property management — inspections, leasing, maintenance, accounting, and more. Included routine/ingoing/outgoing inspections per property; monthly invoice for platform fees.',
};

export const PORTAL_SERVICE_LEVEL_ORDER: RegisterablePortalServiceLevel[] = [
  'LEVEL_1_INSPECTION_ONLY',
  'LEVEL_2_FULL_MANAGEMENT',
];

export const PORTAL_SERVICE_LEVEL_TAG: Record<AgentPortalServiceLevel, string> = {
  LEVEL_1_INSPECTION_ONLY: 'Level 1',
  LEVEL_2_FULL_MANAGEMENT: 'Level 2',
  LEVEL_3_LEGACY: 'Level 3',
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

/** True when every assigned agency is Level 1 (inspection + tribunal only). */
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

export function isLegacyLevel(level: AgentPortalServiceLevel): boolean {
  return level === 'LEVEL_3_LEGACY';
}

/** Level 1 and 2 see a blocking add-card prompt on every portal page until a card is saved. */
export function usesGlobalPaymentMethodPrompt(
  level: AgentPortalServiceLevel | string | undefined,
): boolean {
  return !isLegacyLevel(resolvePortalServiceLevel(level as AgentPortalServiceLevel | undefined));
}

export function isPropertyInspectionOnly(
  agencies: Agency[],
  propertyAgencyId?: string,
): boolean {
  return isInspectionOnlyLevel(getAgencyPortalLevel(agencies, propertyAgencyId));
}

/** Property tab + section heading: Level 1 Bills, Level 2 Invoice. */
export function propertyBillingTabLabel(isInspectionOnly: boolean): 'Bills' | 'Invoice' {
  return isInspectionOnly ? 'Bills' : 'Invoice';
}

/** Module name for the agency invoice page and leftover nav links. */
export function agencyBillingNavLabel(_hasFullManagementAccess?: boolean): 'Invoice' {
  return 'Invoice';
}

export const FULL_MANAGEMENT_ROUTE_PREFIXES = [
  ROUTES.LEASING,
  ROUTES.MAINTENANCE,
  ROUTES.RENT_REVIEW,
  ROUTES.TENANT_SELECTION,
  ROUTES.TENANTS,
  ROUTES.VACATING,
  ROUTES.REPORTS,
  ROUTES.MESSAGES,
  ROUTES.COMMUNICATIONS,
  ROUTES.AGREEMENTS,
  ROUTES.ACCOUNTING,
] as const;

/** Dashboard portfolio charts visible on Level 1 (inspection + tribunal only). */
export const INSPECTION_ONLY_DASHBOARD_CHART_KEYS = [
  'properties',
  'inspection',
  'tribunal',
] as const;

export type DashboardChartKey =
  | 'properties'
  | 'maintenance'
  | 'inspection'
  | 'tribunal'
  | 'leasing'
  | 'accounting';

export function isDashboardChartAllowedForAgent(
  chartKey: DashboardChartKey,
  hasFullAccess: boolean,
): boolean {
  if (hasFullAccess) return true;
  return (INSPECTION_ONLY_DASHBOARD_CHART_KEYS as readonly string[]).includes(chartKey);
}

export function isDashboardKpiWidgetAllowedForAgent(
  widgetId: string,
  hasFullAccess: boolean,
): boolean {
  const map: Record<string, DashboardChartKey> = {
    kpi_properties: 'properties',
    kpi_maintenance: 'maintenance',
    kpi_inspections: 'inspection',
    kpi_tribunal: 'tribunal',
    kpi_leasing: 'leasing',
    kpi_accounting: 'accounting',
  };
  const key = map[widgetId];
  if (!key) return true;
  return isDashboardChartAllowedForAgent(key, hasFullAccess);
}

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
  'add-tenant',
  'maintenance',
  'rent-review',
  'message',
];

/** Task-list categories Level 1 may see. Leasing, maintenance and rent review are Level 2. */
export const INSPECTION_ONLY_TASK_CATEGORIES = ['inspection', 'tribunal'] as const;

export function isInspectionOnlyTaskCategory(category: string): boolean {
  return (INSPECTION_ONLY_TASK_CATEGORIES as readonly string[]).includes(category);
}

export function isTaskCategoryAllowedForAgent(
  category: string,
  hasFullAccess: boolean,
): boolean {
  if (hasFullAccess) return true;
  return category === 'all' || isInspectionOnlyTaskCategory(category);
};

export const PROPERTY_DETAIL_TABS = [
  'Gii',
  'Documents',
  'Fees',
  'Bills',
  'Rent Review',
  'Leasing',
  'Maintenance',
  'Inspection',
  'Accounting',
  'Tribunal',
  'Archive',
] as const;

export type PropertyDetailTab = (typeof PROPERTY_DETAIL_TABS)[number];

const INSPECTION_ONLY_PROPERTY_TABS: PropertyDetailTab[] = [
  'Gii',
  'Documents',
  'Fees',
  'Bills',
  'Inspection',
  'Tribunal',
  'Archive',
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
