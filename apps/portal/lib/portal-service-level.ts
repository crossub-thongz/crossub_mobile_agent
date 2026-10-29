import type { BuiltinQuickActionId } from '@/lib/quick-actions';
import type { Agency } from '@/lib/types';
import { ROUTES } from '@/constants/routes';
import { AGENCY_MEMBERSHIP_TIER, AGENCY_TRUST_TIERS } from '@/constants/api-enums';
import { AGENT_COPY_VARIANT, type AgentCopyVariant } from '@/constants/agent-copy-variant';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';

export type AgentPortalServiceLevel =
  | 'LEVEL_1_INSPECTION_ONLY'
  | 'LEVEL_2_FULL_MANAGEMENT'
  | 'LEVEL_3_LEGACY'
  | 'SELF_MANAGED';

export const PORTAL_SERVICE_LEVEL = {
  INSPECTION_ONLY: 'LEVEL_1_INSPECTION_ONLY',
  FULL_MANAGEMENT: 'LEVEL_2_FULL_MANAGEMENT',
  LEGACY: 'LEVEL_3_LEGACY',
  SELF_MANAGED: 'SELF_MANAGED',
} as const satisfies Record<string, AgentPortalServiceLevel>;

export const PORTAL_SERVICE_LEVEL_LABEL: Record<AgentPortalServiceLevel, string> = {
  LEVEL_1_INSPECTION_ONLY: 'Inspection & tribunal',
  LEVEL_2_FULL_MANAGEMENT: 'Full management',
  LEVEL_3_LEGACY: 'Legacy clients',
  SELF_MANAGED: 'Self-Manage',
};

/** The plans an agency can pick at signup or switch between in Settings. Legacy is staff-set. */
export type RegisterablePortalServiceLevel =
  | 'SELF_MANAGED'
  | 'LEVEL_1_INSPECTION_ONLY'
  | 'LEVEL_2_FULL_MANAGEMENT';

/** User-facing labels on the registration flow. */
export const REGISTER_SERVICE_LEVEL_LABEL: Record<RegisterablePortalServiceLevel, string> = {
  SELF_MANAGED: 'Self-Manage',
  LEVEL_1_INSPECTION_ONLY: 'Inspection Only Service',
  LEVEL_2_FULL_MANAGEMENT: 'Full Service',
};

/** Price tag beside each plan: Self-Manage is the free core (Daniel, 17 Oct 2026). */
export const REGISTER_SERVICE_LEVEL_PRICE_TAG: Record<RegisterablePortalServiceLevel, string> = {
  SELF_MANAGED: 'Free',
  LEVEL_1_INSPECTION_ONLY: 'Optional, paid',
  LEVEL_2_FULL_MANAGEMENT: 'Optional, paid',
};

/** Where a new agency starts. Inspection Only and Full Service are optional paid layers. */
export const DEFAULT_REGISTER_SERVICE_LEVEL: RegisterablePortalServiceLevel = 'SELF_MANAGED';

export const REGISTER_SERVICE_LEVEL_DESCRIPTION: Record<
  RegisterablePortalServiceLevel,
  string
> = {
  SELF_MANAGED:
    `Run your whole portfolio yourself with free software and ${CROS_ASSISTANT_NAME} AI — maintenance, inspections, leasing, conversations and accounting. Owners get a copy of your decisions by email.`,
  LEVEL_1_INSPECTION_ONLY:
    'Add properties and order inspections and tribunal support. Pay when you place the order. Inspection module only — upgrade anytime for leasing, maintenance, and accounting.',
  LEVEL_2_FULL_MANAGEMENT:
    'Full property management — inspections, leasing, maintenance, accounting, and more. Included routine/ingoing/outgoing inspections per property; monthly invoice for platform fees.',
};

export const PORTAL_SERVICE_LEVEL_ORDER: RegisterablePortalServiceLevel[] = [
  'SELF_MANAGED',
  'LEVEL_1_INSPECTION_ONLY',
  'LEVEL_2_FULL_MANAGEMENT',
];

export const PORTAL_SERVICE_LEVEL_TAG: Record<AgentPortalServiceLevel, string> = {
  LEVEL_1_INSPECTION_ONLY: 'Level 1',
  LEVEL_2_FULL_MANAGEMENT: 'Level 2',
  LEVEL_3_LEGACY: 'Level 3',
  SELF_MANAGED: 'Free',
};

export function isRegisterablePortalServiceLevel(
  level: AgentPortalServiceLevel,
): level is RegisterablePortalServiceLevel {
  return (PORTAL_SERVICE_LEVEL_ORDER as readonly string[]).includes(level);
}

export const DEFAULT_PORTAL_SERVICE_LEVEL: AgentPortalServiceLevel =
  'LEVEL_2_FULL_MANAGEMENT';

export function resolvePortalServiceLevel(
  level: AgentPortalServiceLevel | undefined,
): AgentPortalServiceLevel {
  return level ?? DEFAULT_PORTAL_SERVICE_LEVEL;
}

export function isInspectionOnlyLevel(level: AgentPortalServiceLevel): boolean {
  return level === PORTAL_SERVICE_LEVEL.INSPECTION_ONLY;
}

/** Self-Manage: the agency does the work CROSSUB staff do on the other tiers. */
export function isSelfManagedLevel(level: AgentPortalServiceLevel): boolean {
  return level === PORTAL_SERVICE_LEVEL.SELF_MANAGED;
}

/** True when any assigned agency is Self-Manage — the desktop module pages and "you" copy switch on. */
export function hasSelfManagedAgency(agencies: Agency[]): boolean {
  return selfManagedAgencies(agencies).length > 0;
}

/** Assigned agencies that are Self-Manage, whatever the agent's tier there (People). */
export function selfManagedAgencies(agencies: Agency[]): Agency[] {
  return agencies.filter((a) => isSelfManagedLevel(resolvePortalServiceLevel(a.portalServiceLevel)));
}

export function isPropertySelfManaged(agencies: Agency[], propertyAgencyId?: string): boolean {
  return isSelfManagedLevel(getAgencyPortalLevel(agencies, propertyAgencyId));
}

/** True when the agent is a principal of a Self-Manage agency — Trust is theirs (Phase 3). */
export function hasSelfManagedPrincipalAccess(agencies: Agency[]): boolean {
  return agencies.some(
    (a) =>
      isSelfManagedLevel(resolvePortalServiceLevel(a.portalServiceLevel)) &&
      a.membershipTier === AGENCY_MEMBERSHIP_TIER.PRINCIPAL,
  );
}

/** True when the tier runs a Self-Manage agency's trust account: principal or accountant. */
export function isAgencyTrustTier(tier: Agency['membershipTier']): boolean {
  return tier != null && (AGENCY_TRUST_TIERS as readonly string[]).includes(tier);
}

/** Self-Manage agencies whose trust account the agent runs (principal or accountant). */
export function selfManagedTrustAgencies(agencies: Agency[]): Agency[] {
  return agencies.filter(
    (a) =>
      isSelfManagedLevel(resolvePortalServiceLevel(a.portalServiceLevel)) &&
      isAgencyTrustTier(a.membershipTier),
  );
}

/**
 * True when the agent may record a letting's deposit or bond as received on this property: its
 * agency is Self-Manage and the agent is the principal or accountant (the API refuses others).
 */
export function canRecordLettingMoney(agencies: Agency[], propertyAgencyId?: string): boolean {
  if (!propertyAgencyId) return false;
  return selfManagedTrustAgencies(agencies).some((a) => a.id === propertyAgencyId);
}

/** True when the agent runs the trust account of a Self-Manage agency — Trust is theirs. */
export function hasSelfManagedTrustAccess(agencies: Agency[]): boolean {
  return selfManagedTrustAgencies(agencies).length > 0;
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
  return level === PORTAL_SERVICE_LEVEL.LEGACY;
}

/**
 * Level 1 and 2 see an add-card prompt until a card is saved or dismissed (Level 2: once per day).
 * Self-Manage is free; it pays only at booking for a CROSSUB job it chooses, so no standing prompt.
 */
export function usesGlobalPaymentMethodPrompt(
  level: AgentPortalServiceLevel | string | undefined,
): boolean {
  const resolved = resolvePortalServiceLevel(level as AgentPortalServiceLevel | undefined);
  return !isLegacyLevel(resolved) && !isSelfManagedLevel(resolved);
}

/** Narrow an untyped API value (billing summary, pricing catalog) to a known tier. */
export function isAgentPortalServiceLevel(value: unknown): value is AgentPortalServiceLevel {
  return (Object.values(PORTAL_SERVICE_LEVEL) as readonly unknown[]).includes(value);
}

/** Level 2 and Level 3 accrue to a monthly platform invoice. Self-Manage and Level 1 do not. */
export function usesMonthlyPlatformInvoice(level: unknown): boolean {
  return (
    level === PORTAL_SERVICE_LEVEL.FULL_MANAGEMENT || level === PORTAL_SERVICE_LEVEL.LEGACY
  );
}

/**
 * True when every assigned agency is Self-Manage — portfolio-wide copy (tours, Tasks buckets,
 * CROS's role) speaks to the agent as "you". A mixed book keeps the CROSSUB-serviced copy.
 */
export function isSelfManagedAgent(agencies: Agency[]): boolean {
  if (agencies.length === 0) return false;
  return agencies.every((a) => isSelfManagedLevel(resolvePortalServiceLevel(a.portalServiceLevel)));
}

/**
 * Properties whose agency is Self-Manage. The Self-Manage screens (module pages, Conversations)
 * show only these, so an agent who also works for an Inspection Only or Full Service agency
 * keeps that agency's jobs where they are today (Daniel, 17 Oct 2026).
 */
export function selfManagedPropertyIds(
  agencies: Agency[],
  properties: ReadonlyArray<{ id: string; agencyId?: string }>,
): Set<string> {
  return new Set(
    properties.filter((p) => isPropertySelfManaged(agencies, p.agencyId)).map((p) => p.id),
  );
}

/** Which copy set a screen shows: Self-Manage speaks to the agent; every other tier to CROSSUB's work. */
export function agentCopyVariant(selfManaged: boolean): AgentCopyVariant {
  return selfManaged ? AGENT_COPY_VARIANT.SELF_MANAGED : AGENT_COPY_VARIANT.SERVICED;
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
  ROUTES.CONVERSATIONS,
  ROUTES.PEOPLE,
  ROUTES.TRUST,
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

/**
 * `self` — only agents with a Self-Manage agency (the desktop module pages).
 * `self-principal` — only principals of a Self-Manage agency.
 * `self-trust` — only principals or accountants of a Self-Manage agency (Trust).
 */
export type PortalNavAccess = 'any' | 'full' | 'self' | 'self-principal' | 'self-trust';

export const PORTAL_NAV_ACCESS = {
  ANY: 'any',
  FULL: 'full',
  SELF_MANAGED: 'self',
  SELF_MANAGED_PRINCIPAL: 'self-principal',
  SELF_MANAGED_TRUST: 'self-trust',
} as const satisfies Record<string, PortalNavAccess>;

/** Self-Manage flags for {@link filterNavByAccess}. Omitted, Self-Manage-only entries stay hidden. */
export type SelfManagedNavAccess = {
  selfManaged: boolean;
  selfManagedPrincipal: boolean;
  selfManagedTrust: boolean;
};

export function filterNavByAccess<
  T extends { portalAccess?: PortalNavAccess; label?: string; selfManagedTrustLabel?: string },
>(items: readonly T[], hasFullAccess: boolean, selfManagedAccess?: SelfManagedNavAccess): T[] {
  const seesTrust = selfManagedAccess?.selfManagedTrust === true;
  return items
    .filter((item) => {
      if (item.portalAccess === PORTAL_NAV_ACCESS.FULL) return hasFullAccess;
      if (item.portalAccess === PORTAL_NAV_ACCESS.SELF_MANAGED) {
        return selfManagedAccess?.selfManaged === true;
      }
      if (item.portalAccess === PORTAL_NAV_ACCESS.SELF_MANAGED_PRINCIPAL) {
        return selfManagedAccess?.selfManagedPrincipal === true;
      }
      if (item.portalAccess === PORTAL_NAV_ACCESS.SELF_MANAGED_TRUST) {
        return seesTrust;
      }
      return true;
    })
    .map((item) => (seesTrust && item.selfManagedTrustLabel ? { ...item, label: item.selfManagedTrustLabel } : item));
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
