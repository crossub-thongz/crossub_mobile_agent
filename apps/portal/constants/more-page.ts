import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  HelpCircle,
  History,
  LogOut,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Tags,
  UserCog,
  Users,
} from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import type { PortalNavAccess } from '@/lib/portal-service-level';

export type MorePageItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  portalAccess?: PortalNavAccess;
  action?: 'sign-out';
  external?: boolean;
};

export type MorePageSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  tone: 'emerald' | 'violet' | 'amber' | 'slate';
  items: MorePageItem[];
};

export const MORE_PAGE_SECTIONS: MorePageSection[] = [
  {
    id: 'agency',
    title: 'Agency',
    icon: Building2,
    tone: 'emerald',
    items: [
      {
        id: 'agency-profile',
        title: 'Agency profile',
        description: 'View and update your agency details, license and contacts.',
        href: ROUTES.AGENCIES,
        icon: Building2,
      },
      {
        id: 'team-users',
        title: 'Team & users',
        description: 'View your agency team and colleagues on shared agencies.',
        href: ROUTES.TEAM,
        icon: Users,
      },
      {
        id: 'service-plan',
        title: 'Service plan',
        description: 'View your current plan and service configuration.',
        href: ROUTES.PRICING,
        icon: Tags,
      },
      {
        id: 'portfolio-settings',
        title: 'Portfolio settings',
        description: 'Manage default settings for your portfolio and tasks.',
        href: ROUTES.SETTINGS,
        icon: UserCog,
        portalAccess: 'full',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    icon: CreditCard,
    tone: 'violet',
    items: [
      {
        id: 'invoices',
        title: 'Invoices',
        description: 'View and download your invoices and statements.',
        href: ROUTES.BILL,
        icon: Receipt,
      },
      {
        id: 'payment-methods',
        title: 'Payment methods',
        description: 'Manage your saved payment methods.',
        href: ROUTES.BILL,
        icon: CreditCard,
      },
      {
        id: 'pricing-fees',
        title: 'Pricing & fees',
        description: 'View our pricing, fees and service inclusions.',
        href: ROUTES.PRICING,
        icon: Tags,
      },
      {
        id: 'billing-history',
        title: 'Billing history',
        description: 'View your payment and billing history.',
        href: ROUTES.BILL,
        icon: History,
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    icon: HelpCircle,
    tone: 'amber',
    items: [
      {
        id: 'ask-cros',
        title: 'Ask CROS',
        description: 'Get help from our AI assistant.',
        href: ROUTES.DASHBOARD,
        icon: Sparkles,
      },
      {
        id: 'contact-am',
        title: 'Contact account manager',
        description: 'Message or call CROSSUB support for your portfolio.',
        href: ROUTES.SUPPORT_CONTACT,
        icon: MessageSquare,
      },
      {
        id: 'help-centre',
        title: 'Help centre',
        description: 'Find guides, tutorials and FAQs.',
        href: ROUTES.FAQ,
        icon: HelpCircle,
      },
      {
        id: 'system-status',
        title: 'System status',
        description: 'Check system status and announcements.',
        href: ROUTES.NOTIFICATIONS,
        icon: Bell,
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Settings',
    icon: Settings,
    tone: 'slate',
    items: [
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Manage your notification preferences.',
        href: ROUTES.SETTINGS,
        icon: Bell,
      },
      {
        id: 'security',
        title: 'Security',
        description: 'Password, two-factor authentication and security.',
        href: ROUTES.CHANGE_PASSWORD,
        icon: Shield,
      },
      {
        id: 'settings',
        title: 'Settings',
        description: 'General preferences and system settings.',
        href: ROUTES.SETTINGS,
        icon: Settings,
      },
      {
        id: 'privacy',
        title: 'Privacy',
        description: 'Privacy policy and data preferences.',
        href: ROUTES.SYSTEM_ACCESS_AGREEMENT,
        icon: FileText,
      },
      {
        id: 'terms',
        title: 'Terms & conditions',
        description: 'View terms of use and policies.',
        href: ROUTES.SYSTEM_ACCESS_AGREEMENT,
        icon: FileText,
      },
      {
        id: 'sign-out',
        title: 'Sign out',
        description: 'Sign out of your CROSSUB account.',
        icon: LogOut,
        action: 'sign-out',
      },
    ],
  },
];

export const MORE_PAGE_SECTION_TONE: Record<
  MorePageSection['tone'],
  { icon: string; header: string; row: string }
> = {
  emerald: {
    icon: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    header: 'text-emerald-800 dark:text-emerald-200',
    row: 'hover:bg-emerald-500/6',
  },
  violet: {
    icon: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
    header: 'text-violet-800 dark:text-violet-200',
    row: 'hover:bg-violet-500/6',
  },
  amber: {
    icon: 'bg-amber-500/12 text-amber-800 dark:text-amber-200',
    header: 'text-amber-900 dark:text-amber-100',
    row: 'hover:bg-amber-500/6',
  },
  slate: {
    icon: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
    header: 'text-slate-800 dark:text-slate-200',
    row: 'hover:bg-slate-500/6',
  },
};
