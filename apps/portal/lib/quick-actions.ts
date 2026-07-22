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

import { messagesNew, propertyNew, inspectionNew, tenantNew } from '@/constants/routes';
import type { PropertyWorkflowActionId } from '@/lib/property-workflow-actions';

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
  /** Opens an inline create workflow instead of navigating away. */
  workflowActionId?: PropertyWorkflowActionId;
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
    resolveHref: (propertyId) =>
      tenantNew(propertyId ? { propertyId } : undefined),
  },
  {
    id: 'open-inspection',
    label: 'Add inspection',
    icon: ClipboardList,
    resolveHref: (propertyId) => inspectionNew(propertyId),
  },
  {
    id: 'maintenance',
    label: 'Add new repair job',
    icon: Wrench,
    resolveHref: () => '',
    workflowActionId: 'start_maintenance',
  },
  {
    id: 'rent-review',
    label: 'Rent review',
    icon: TrendingUp,
    resolveHref: () => '',
    workflowActionId: 'start_rent_review',
  },
  {
    id: 'tribunal',
    label: 'Rent chasing',
    icon: Gavel,
    resolveHref: () => '',
    workflowActionId: 'open_rent_chasing',
  },
  {
    id: 'message',
    label: 'New message',
    icon: MessageSquare,
    resolveHref: (propertyId) =>
      messagesNew(propertyId ? { property: propertyId } : undefined),
  },
];

export type ResolvedQuickAction = {
  id: string;
  label: string;
  href: string;
  workflowActionId?: PropertyWorkflowActionId;
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
    workflowActionId: a.workflowActionId,
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
