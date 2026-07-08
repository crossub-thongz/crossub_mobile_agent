'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { PropertyWorkflowCreateDialog } from '@/components/agent/property-workflow-panel';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildPropertyWorkflowContext,
  tabActionsFor,
  type PropertyWorkflowAction,
  type PropertyWorkflowActionId,
} from '@/lib/property-workflow-actions';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceItem,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Leasing workflow action strip — mirrors crossub_web `PropertyPortalTabActions`.
 * Shown whenever a property has leasing activity so agents can still add rent review
 * or end leasing while a cycle is in progress.
 */
export function PropertyLeasingWorkflowActions({
  property,
  propertyId,
  leasingCycles,
  rentReviews,
  vacatingCases,
  maintenance,
  inspections,
  tribunalCases,
  tenantSelections,
  currentLease,
  onCreated,
}: {
  property: Property;
  propertyId: string;
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceItem[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  tenantSelections?: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  onCreated?: () => void;
}) {
  const { primaryAgency } = useAgentData();
  const { user } = useAuth();
  const userName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    : '';

  const ctx = useMemo(
    () =>
      buildPropertyWorkflowContext({
        propertyId,
        leasingCycles,
        rentReviews,
        vacatingCases,
        maintenance,
        inspections,
        tribunalCases,
        currentLease,
      }),
    [
      propertyId,
      leasingCycles,
      rentReviews,
      vacatingCases,
      maintenance,
      inspections,
      tribunalCases,
      currentLease,
    ],
  );

  const actions = tabActionsFor('leasing', ctx);
  const [activeAction, setActiveAction] = useState<PropertyWorkflowActionId | null>(null);

  if (actions.length === 0) return null;

  return (
    <>
      <div className="rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.06] via-card to-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
          Actions
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          New leasing cycles, rent reviews, and end leasing cases for this property.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <WorkflowActionButton
              key={action.id}
              action={action}
              onClick={() => setActiveAction(action.id)}
            />
          ))}
        </div>
      </div>

      <PropertyWorkflowCreateDialog
        actionId={activeAction}
        open={activeAction != null}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        property={property}
        propertyId={propertyId}
        agency={primaryAgency}
        userName={userName}
        currentLease={currentLease}
        leasingCycle={ctx.leasingCycles[0]}
        tenantSelections={tenantSelections}
        onSuccess={() => {
          setActiveAction(null);
          onCreated?.();
        }}
      />
    </>
  );
}

function WorkflowActionButton({
  action,
  onClick,
}: {
  action: PropertyWorkflowAction;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={action.primary ? 'default' : 'outline'}
      className={cn(
        'gap-1.5',
        action.primary && 'bg-teal-600 text-white hover:bg-teal-700',
      )}
      title={action.description}
      onClick={onClick}
    >
      <Plus className="size-3.5" />
      {action.label}
    </Button>
  );
}
