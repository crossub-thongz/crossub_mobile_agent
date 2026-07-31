import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileSignature,
  FileText,
  FolderArchive,
  LayoutDashboard,
  Receipt,
  Settings,
  Tags,
  Wrench,
} from 'lucide-react';

import type { PortalNavAccess } from '@/lib/portal-service-level';
import { ROUTES } from '@/constants/routes';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  portalAccess?: PortalNavAccess;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.PROPERTIES, label: 'Properties', icon: Building2 },
];

/** Workflow modules under the sidebar “More” section. */
export const MORE_NAV: NavItem[] = [
  { href: ROUTES.AGREEMENTS, label: 'Agreements', icon: FileSignature },
  { href: ROUTES.LEASING, label: 'Leasing', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.MAINTENANCE, label: 'Maintenance', icon: Wrench, portalAccess: 'full' },
  { href: ROUTES.INSPECTIONS, label: 'Inspections', icon: ClipboardList },
  { href: ROUTES.ACCOUNTING, label: 'Accounting', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.TRIBUNAL, label: 'Tribunal', icon: FileText },
  { href: ROUTES.ARCHIVE, label: 'Archive', icon: FolderArchive, portalAccess: 'full' },
];

/** Pinned below workflow modules — settings & billing. */
export const MORE_NAV_FOOTER: NavItem[] = [
  { href: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
  { href: ROUTES.PRICING, label: 'Pricing', icon: Tags },
  { href: ROUTES.BILL, label: 'Bill', icon: Receipt },
];

/** @deprecated Sidebar no longer shows Message Center — empty for import compat. */
export const DESKTOP_NAV: NavItem[] = [];
