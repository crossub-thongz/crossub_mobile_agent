import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  UserPlus,
  Wrench,
} from 'lucide-react';

import { ROUTES } from '@/constants/routes';

export const PRIMARY_NAV = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.PROPERTIES, label: 'Properties', icon: Building2 },
  { href: ROUTES.TASKS, label: 'Need action', icon: ListTodo },
  { href: ROUTES.MESSAGES, label: 'Messages', icon: MessageSquare },
] as const;

export const MORE_NAV = [
  { href: ROUTES.AGENCIES, label: 'Agencies', icon: Building2 },
  { href: ROUTES.LEASING, label: 'Leasing', icon: FileText },
  { href: ROUTES.TRIBUNAL, label: 'Tribunal', icon: FileText },
  { href: ROUTES.MAINTENANCE, label: 'Maintenance', icon: Wrench },
  { href: ROUTES.INSPECTIONS, label: 'Inspections', icon: ClipboardList },
  { href: ROUTES.ACCOUNTING, label: 'Accounting', icon: FileText },
  { href: ROUTES.RENT_REVIEW, label: 'Rent review', icon: FileText },
  { href: ROUTES.TENANT_SELECTION, label: 'Tenant selection', icon: FileText },
  { href: ROUTES.TENANTS, label: 'Tenant accounts', icon: UserPlus },
  { href: ROUTES.VACATING, label: 'Vacating', icon: FileText },
  { href: ROUTES.REPORTS, label: 'Reports', icon: FileText },
  { href: ROUTES.NOTIFICATIONS, label: 'Alerts', icon: FileText },
  { href: ROUTES.PROFILE, label: 'Profile', icon: FileText },
  { href: ROUTES.SETTINGS, label: 'Settings', icon: FileText },
] as const;

/** Desktop-only — centralized message center */
export const DESKTOP_NAV = [
  {
    href: ROUTES.COMMUNICATIONS,
    label: 'Message Center',
    icon: Inbox,
    description: 'Emails, messages & connected accounts',
  },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}>;
