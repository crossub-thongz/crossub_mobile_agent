'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { PropertyWorkflowCreateDialog } from '@/components/agent/property-workflow-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildPropertyWorkflowContext,
  tabActionsFor,
  type PropertyWorkflowAction,
  type PropertyWorkflowActionId,
  type PropertyWorkflowTab,
} from '@/lib/property-workflow-actions';
import type { PropertyWorkflowCreatedResult } from '@/lib/property-workflow-created';
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
 * Property workflow action strip — mirrors crossub_web `PropertyPortalTabActions`.
 * Used on Leasing (new cycle / end leasing) and Rent Review (add rent review) tabs.
 */
export function PropertyLeasingWorkflowActions({
  property,
  propertyId,
  tab = 'leasing',
  leasingCycles,
  rentReviews,
  vacatingCases,
  maintenance,
  inspections,
  tribunalCases,
  tenantSelections,
  currentLease,
  onCreated,
  inline = false,
}: {
  property: Property;
  propertyId: string;
  tab?: PropertyWorkflowTab;
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceItem[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  tenantSelections?: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  onCreated?: (result?: PropertyWorkflowCreatedResult) => void;
  /** When true, only render action buttons + dialog (no Actions card wrapper). */
  inline?: boolean;
}) {
  const { primaryAgency } = useAgentData();

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

  const actions = tabActionsFor(tab, ctx);
  const [activeAction, setActiveAction] = useState<PropertyWorkflowActionId | null>(null);

  if (actions.length === 0) return null;

  const description =
    tab === 'rent_review'
      ? 'Open a rent review case for this property.'
      : 'Add new leasing cycles and end leasing cases for this property.';

  return (
    <>
      {inline ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <WorkflowActionButton
              key={action.id}
              action={action}
              onClick={() => {
                if (action.disabled) return;
                setActiveAction(action.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.06] via-card to-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
            Actions
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <WorkflowActionButton
                key={action.id}
                action={action}
                onClick={() => {
                if (action.disabled) return;
                setActiveAction(action.id);
              }}
              />
            ))}
          </div>
        </div>
      )}

      <PropertyWorkflowCreateDialog
        actionId={activeAction}
        open={activeAction != null}
        onOpenChange={(open) => {
          if (!open) setActiveAction(null);
        }}
        property={property}
        propertyId={propertyId}
        agency={primaryAgency}
        currentLease={currentLease}
        leasingCycle={ctx.leasingCycles[0]}
        tenantSelections={tenantSelections}
        onSuccess={(result) => {
          setActiveAction(null);
          onCreated?.(result);
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
      disabled={action.disabled}
      onClick={onClick}
    >
      <Plus className="size-3.5" />
      {action.label}
    </Button>
  );
}
