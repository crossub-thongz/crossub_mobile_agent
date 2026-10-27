import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileText,
  FolderArchive,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  ListTodo,
  MessagesSquare,
  Settings,
  Tags,
  Users,
  Wrench,
} from 'lucide-react';

import { PORTAL_NAV_ACCESS, type PortalNavAccess } from '@/lib/portal-service-level';
import { ROUTES } from '@/constants/routes';
import { ACCOUNTING_MODULE_LAUNCHED } from '@/constants/accounting-sections';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  portalAccess?: PortalNavAccess;
  /** Label shown instead when the agent also sees Accounting (the trust module), so the two differ. */
  selfManagedTrustLabel?: string;
};

/** Production v1 — module hubs on the sidebar, matching live. */
export const V1_PRIMARY_NAV: NavItem[] = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.PROPERTIES, label: 'Properties', icon: Building2 },
];

/** Self-Manage inbox — threads, conversation and job context. */
const CONVERSATIONS_NAV_ITEM: NavItem = {
  href: ROUTES.CONVERSATIONS,
  label: 'Conversations',
  icon: MessagesSquare,
  portalAccess: PORTAL_NAV_ACCESS.SELF_MANAGED,
};

/** Self-Manage People — tenants, owners, suppliers and applicants with CP references. */
const PEOPLE_NAV_ITEM: NavItem = {
  href: ROUTES.PEOPLE,
  label: 'People',
  icon: Users,
  portalAccess: PORTAL_NAV_ACCESS.SELF_MANAGED,
};

/** Self-Manage Accounting (the trust accounting module) — principals and accountants. */
const TRUST_NAV_ITEM: NavItem = {
  href: ROUTES.TRUST,
  label: 'Accounting',
  icon: Landmark,
  portalAccess: PORTAL_NAV_ACCESS.SELF_MANAGED_TRUST,
};

/**
 * Self-Manage desktop module pages on the redesign, where the job hubs otherwise live on
 * Tasks. V1 already lists Leasing, Maintenance and Inspections, so it only adds the last two.
 */
const V2_SELF_MANAGED_NAV: NavItem[] = [
  {
    href: ROUTES.MAINTENANCE,
    label: 'Maintenance',
    icon: Wrench,
    portalAccess: PORTAL_NAV_ACCESS.SELF_MANAGED,
  },
  {
    href: ROUTES.INSPECTIONS,
    label: 'Inspections',
    icon: ClipboardList,
    portalAccess: PORTAL_NAV_ACCESS.SELF_MANAGED,
  },
  {
    href: ROUTES.LEASING,
    label: 'Leasing',
    icon: FileText,
    portalAccess: PORTAL_NAV_ACCESS.SELF_MANAGED,
  },
  CONVERSATIONS_NAV_ITEM,
  PEOPLE_NAV_ITEM,
  TRUST_NAV_ITEM,
];

export const V1_MORE_NAV: NavItem[] = [
  { href: ROUTES.LEASING, label: 'Leasing', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.MAINTENANCE, label: 'Maintenance', icon: Wrench, portalAccess: 'full' },
  { href: ROUTES.INSPECTIONS, label: 'Inspections', icon: ClipboardList },
  CONVERSATIONS_NAV_ITEM,
  PEOPLE_NAV_ITEM,
  TRUST_NAV_ITEM,
  {
    href: ROUTES.ACCOUNTING,
    label: 'Accounting',
    icon: FileText,
    portalAccess: 'full',
    selfManagedTrustLabel: 'Arrears',
  },
  { href: ROUTES.TRIBUNAL, label: 'Tribunal', icon: FileText },
  { href: ROUTES.ARCHIVE, label: 'History', icon: FolderArchive, portalAccess: 'full' },
];

export const V1_MORE_NAV_FOOTER: NavItem[] = [
  { href: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
  { href: ROUTES.FAQ, label: 'FAQ', icon: HelpCircle },
  { href: ROUTES.PRICING, label: 'Pricing', icon: Tags },
];

/** Redesign — job hubs live on Tasks. Full Accounting stays off until launch. */
export const V2_PRIMARY_NAV: NavItem[] = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.PROPERTIES, label: 'Properties', icon: Building2 },
  { href: ROUTES.TASKS, label: 'Tasks', icon: ListTodo },
];

export const V2_MORE_NAV: NavItem[] = [
  ...V2_SELF_MANAGED_NAV,
  ...(ACCOUNTING_MODULE_LAUNCHED
    ? [
        {
          href: ROUTES.ACCOUNTING,
          label: 'Accounting',
          icon: FileText,
          portalAccess: 'full' as const,
        },
      ]
    : []),
  { href: ROUTES.ARCHIVE, label: 'History', icon: FolderArchive },
];

export const V2_MORE_NAV_FOOTER: NavItem[] = [
  { href: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
  { href: ROUTES.FAQ, label: 'FAQ', icon: HelpCircle },
  { href: ROUTES.PRICING, label: 'Pricing', icon: Tags },
];

export function primaryNavForUi(isV2: boolean): NavItem[] {
  return isV2 ? V2_PRIMARY_NAV : V1_PRIMARY_NAV;
}

export function moreNavForUi(isV2: boolean): NavItem[] {
  return isV2 ? V2_MORE_NAV : V1_MORE_NAV;
}

export function moreNavFooterForUi(isV2: boolean): NavItem[] {
  return isV2 ? V2_MORE_NAV_FOOTER : V1_MORE_NAV_FOOTER;
}

export const V2_SIDEBAR_FOOTER_NAV: NavItem[] = [
  { href: ROUTES.SUPPORT, label: 'Support', icon: HelpCircle },
];

export function sidebarFooterNavForUi(isV2: boolean): NavItem[] {
  return isV2 ? V2_SIDEBAR_FOOTER_NAV : [];
}

/**
 * Desktop sidebar destinations that are not on the mobile bottom tab bar.
 * Mobile surfaces these on the More tab (`/more`) when the sidebar hides.
 */
export function sidebarOverflowNavForUi(isV2: boolean): NavItem[] {
  return [...moreNavForUi(isV2), ...moreNavFooterForUi(isV2)];
}

export function menuNavForUi(isV2: boolean): NavItem[] {
  return [...primaryNavForUi(isV2), ...moreNavForUi(isV2), ...moreNavFooterForUi(isV2)];
}

/** @deprecated Prefer `primaryNavForUi`. Defaults to v1 so accidental imports cannot drift onto Tasks. */
export const PRIMARY_NAV: NavItem[] = V1_PRIMARY_NAV;
export const MORE_NAV: NavItem[] = V1_MORE_NAV;
export const MORE_NAV_FOOTER: NavItem[] = V1_MORE_NAV_FOOTER;
export const MOBILE_MENU_NAV: NavItem[] = menuNavForUi(false);

/** @deprecated Sidebar no longer shows Message Center — empty for import compat. */
export const DESKTOP_NAV: NavItem[] = [];
