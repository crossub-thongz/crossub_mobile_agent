import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  FileText,
  FolderArchive,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  Receipt,
  Settings,
  Tags,
} from 'lucide-react';

import type { PortalNavAccess } from '@/lib/portal-service-level';
import { ROUTES } from '@/constants/routes';
import { ACCOUNTING_MODULE_LAUNCHED } from '@/constants/accounting-sections';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  portalAccess?: PortalNavAccess;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.PROPERTIES, label: 'Properties', icon: Building2 },
  { href: ROUTES.TASKS, label: 'Tasks', icon: ListTodo },
];

/** Workflow modules under the sidebar “More” section. */
export const MORE_NAV: NavItem[] = [
  // Sales service-agreement lock retired — hide until signing is required again.
  // { href: ROUTES.AGREEMENTS, label: 'Agreements', icon: FileSignature, portalAccess: 'full' },
  // Job hubs live on Tasks (view + create). Keep the list pages redirected.
  // { href: ROUTES.LEASING, label: 'Leasing', icon: FileText, portalAccess: 'full' },
  // { href: ROUTES.MAINTENANCE, label: 'Maintenance', icon: Wrench, portalAccess: 'full' },
  // { href: ROUTES.INSPECTIONS, label: 'Inspections', icon: ClipboardList },
  ...(ACCOUNTING_MODULE_LAUNCHED
    ? [{ href: ROUTES.ACCOUNTING, label: 'Accounting', icon: FileText } satisfies NavItem]
    : []),
  { href: ROUTES.BILL, label: 'Bills', icon: Receipt },
  // { href: ROUTES.TRIBUNAL, label: 'Tribunal', icon: FileText },
  { href: ROUTES.ARCHIVE, label: 'Archive', icon: FolderArchive },
];

/** Pinned below workflow modules — settings. */
export const MORE_NAV_FOOTER: NavItem[] = [
  { href: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
  { href: ROUTES.FAQ, label: 'FAQ', icon: HelpCircle },
  { href: ROUTES.PRICING, label: 'Pricing', icon: Tags },
];

/** Sidebar and mobile overflow — primary destinations plus workflow modules. */
export const MOBILE_MENU_NAV: NavItem[] = [
  ...PRIMARY_NAV,
  ...MORE_NAV,
  ...MORE_NAV_FOOTER,
];

/** @deprecated Sidebar no longer shows Message Center — empty for import compat. */
export const DESKTOP_NAV: NavItem[] = [];
