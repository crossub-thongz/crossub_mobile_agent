import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  CreditCard,
  HelpCircle,
  History,
  MessageSquare,
  PlayCircle,
  Receipt,
  Tags,
  UserCog,
  Users,
} from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import type { PortalNavAccess } from '@/lib/portal-service-level';

/** Short copy for desktop-sidebar links when they appear on the mobile More tab. */
export const MORE_MENU_ITEM_DESCRIPTION: Partial<Record<string, string>> = {
  [ROUTES.LEASING]: 'Lettings, applicants and lease workflows.',
  [ROUTES.MAINTENANCE]: 'Repair jobs, quotes and contractors.',
  [ROUTES.INSPECTIONS]: 'Open, routine, ingoing and outgoing inspections.',
  [ROUTES.ACCOUNTING]: 'Rent and invoice arrears, plus rent chasing.',
  [ROUTES.TRIBUNAL]: 'Tribunal cases and rent chasing.',
  [ROUTES.ARCHIVE]: 'Archived properties and closed property tasks.',
  [ROUTES.BILL]: 'Platform invoices and payments.',
  [ROUTES.SETTINGS]: 'Preferences and account settings.',
  [ROUTES.FAQ]: 'Guides, tutorials and FAQs.',
  [ROUTES.PRICING]: 'Plans, fees and service inclusions.',
  [ROUTES.SUPPORT]: 'Intro video, contact, help centre and system status.',
};

export type MorePageItem = {
  id: string;
  title: string;
  description?: string;
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

export const SUPPORT_PAGE_SECTION: MorePageSection = {
  id: 'support',
  title: 'Support',
  icon: HelpCircle,
  tone: 'amber',
  items: [
    {
      id: 'intro-video',
      title: 'Intro video',
      description: 'Watch the agent portal welcome video again.',
      href: ROUTES.SUPPORT_GETTING_STARTED,
      icon: PlayCircle,
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
};

export const MORE_PAGE_SECTIONS: MorePageSection[] = [
  {
    id: 'agency',
    title: 'Agency',
    icon: Building2,
    tone: 'emerald',
    items: [
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
    title: 'Invoice',
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
