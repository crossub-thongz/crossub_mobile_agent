import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Bell,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  UserPlus,
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
  { href: ROUTES.TASKS, label: 'Need action', icon: ListTodo },
  { href: ROUTES.MESSAGES, label: 'Messages', icon: MessageSquare, portalAccess: 'full' },
];

export const MORE_NAV: NavItem[] = [
  { href: ROUTES.AGENCIES, label: 'Agencies', icon: Building2 },
  { href: ROUTES.LEASING, label: 'Leasing', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.TRIBUNAL, label: 'Tribunal', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.MAINTENANCE, label: 'Maintenance', icon: Wrench, portalAccess: 'full' },
  { href: ROUTES.INSPECTIONS, label: 'Inspections', icon: ClipboardList },
  { href: ROUTES.ACCOUNTING, label: 'Accounting', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.RENT_REVIEW, label: 'Rent review', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.TENANT_SELECTION, label: 'Tenant selection', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.TENANTS, label: 'Tenant accounts', icon: UserPlus, portalAccess: 'full' },
  { href: ROUTES.VACATING, label: 'Vacating', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.REPORTS, label: 'Reports', icon: FileText, portalAccess: 'full' },
  { href: ROUTES.NOTIFICATIONS, label: 'Alerts', icon: Bell },
  { href: ROUTES.PROFILE, label: 'Profile', icon: FileText },
  { href: ROUTES.SETTINGS, label: 'Settings', icon: FileText },
];

/** Desktop-only — centralized message center */
export const DESKTOP_NAV = [
  {
    href: ROUTES.COMMUNICATIONS,
    label: 'Message Center',
    icon: Inbox,
    description: 'Emails, messages & connected accounts',
    portalAccess: 'full' as const,
  },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  portalAccess?: PortalNavAccess;
}>;
