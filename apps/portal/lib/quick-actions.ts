import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  Gavel,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Wrench,
} from 'lucide-react';

import { messagesNew, propertyNew, ROUTES, inspectionNew, tenantNew } from '@/constants/routes';

export type BuiltinQuickActionId =
  | 'add-property'
  | 'add-tenant'
  | 'open-inspection'
  | 'maintenance'
  | 'rent-review'
  | 'tribunal'
  | 'message';

export interface BuiltinQuickAction {
  id: BuiltinQuickActionId;
  label: string;
  icon: LucideIcon;
  resolveHref: (propertyId?: string) => string;
}

export interface CustomQuickAction {
  id: string;
  label: string;
  href: string;
}

export const BUILTIN_QUICK_ACTIONS: BuiltinQuickAction[] = [
  {
    id: 'add-property',
    label: 'Add new property',
    icon: Building2,
    resolveHref: () => propertyNew(),
  },
  {
    id: 'add-tenant',
    label: 'Add tenant',
    icon: UserPlus,
    resolveHref: () => tenantNew(),
  },
  {
    id: 'open-inspection',
    label: 'Open inspection',
    icon: ClipboardList,
    resolveHref: (propertyId) => inspectionNew(propertyId),
  },
  {
    id: 'maintenance',
    label: 'Maintenance request',
    icon: Wrench,
    resolveHref: (propertyId) =>
      propertyId ? `${ROUTES.MAINTENANCE}?property=${propertyId}` : ROUTES.MAINTENANCE,
  },
  {
    id: 'rent-review',
    label: 'Rent review',
    icon: TrendingUp,
    resolveHref: () => ROUTES.RENT_REVIEW,
  },
  {
    id: 'tribunal',
    label: 'Tribunal case',
    icon: Gavel,
    resolveHref: () => ROUTES.TRIBUNAL,
  },
  {
    id: 'message',
    label: 'New message',
    icon: MessageSquare,
    resolveHref: () => messagesNew(),
  },
];

export type ResolvedQuickAction = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  builtin: boolean;
};

export function resolveQuickActions(
  hiddenBuiltinIds: BuiltinQuickActionId[],
  customActions: CustomQuickAction[],
  propertyId?: string,
): ResolvedQuickAction[] {
  const hidden = new Set(hiddenBuiltinIds);
  const builtins = BUILTIN_QUICK_ACTIONS.filter((a) => !hidden.has(a.id)).map((a) => ({
    id: a.id,
    label: a.label,
    href: a.resolveHref(propertyId),
    icon: a.icon,
    builtin: true,
  }));
  const custom = customActions.map((a) => ({
    id: a.id,
    label: a.label,
    href: a.href,
    icon: MessageSquare,
    builtin: false,
  }));
  return [...builtins, ...custom];
}
