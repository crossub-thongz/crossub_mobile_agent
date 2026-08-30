'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { CreateTribunalRentChasingDialog } from '@/components/agent/create-tribunal-rent-chasing-dialog';
import { PropertyWorkflowCreateDialog } from '@/components/agent/property-workflow-panel';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { useEmailVerificationGuard } from '@/hooks/use-email-verification-guard';
import { tribunalDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { createdWorkflowCaseHref } from '@/lib/property-job-href';
import {
  buildPropertyWorkflowContext,
  tabActionsFor,
  type PropertyWorkflowAction,
  type PropertyWorkflowActionId,
  type PropertyWorkflowTab,
} from '@/lib/property-workflow-actions';
import { isWorkflowCreatedCase, type PropertyWorkflowCreatedResult } from '@/lib/property-workflow-created';
import type {
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import type { Inspection } from '@/lib/types';
import { cn } from '@/lib/utils';

const ACTION_GROUPS: { title: string; tab: PropertyWorkflowTab }[] = [
  { title: 'Leasing', tab: 'leasing' },
  { title: 'Rent review', tab: 'rent_review' },
  { title: 'Maintenance', tab: 'maintenance' },
  { title: 'Inspection', tab: 'inspection' },
  { title: 'Financial', tab: 'accounting' },
  { title: 'Tribunal', tab: 'tribunal' },
];

export function PropertyProfileActionsMenu({
  property,
  propertyId,
  leasingCycles,
  rentReviews,
  vacatingCases,
  maintenance,
  inspections,
  tribunalCases,
  currentLease,
  tenantSelections,
  onRefresh,
  onCustomAction,
}: {
  property: Property;
  propertyId: string;
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  currentLease?: LeasingRecord;
  tenantSelections: TenantSelectionCase[];
  onRefresh?: () => void;
  onCustomAction?: (actionId: PropertyWorkflowActionId) => boolean;
}) {
  const router = useRouter();
  const isV2 = useIsAgentUiV2();
  const { primaryAgency, properties } = useAgentData();
  const { blockIfUnverified } = useEmailVerificationGuard();
  const [open, setOpen] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<PropertyWorkflowActionId | null>(null);
  const activeCycle = leasingCycles[0];

  const groupedActions = useMemo(() => {
    const ctx = buildPropertyWorkflowContext({
      propertyId,
      leasingCycles,
      rentReviews,
      vacatingCases,
      maintenance,
      inspections,
      tribunalCases,
      currentLease,
    });
    return ACTION_GROUPS.map((group) => ({
      ...group,
      actions: tabActionsFor(group.tab, ctx),
    })).filter((group) => group.actions.length > 0);
  }, [
    propertyId,
    leasingCycles,
    rentReviews,
    vacatingCases,
    maintenance,
    inspections,
    tribunalCases,
    currentLease,
  ]);

  const openAction = (action: PropertyWorkflowAction) => {
    if (action.disabled) return;
    if (onCustomAction?.(action.id)) {
      setOpen(false);
      return;
    }
    if (blockIfUnverified()) return;
    setOpen(false);
    setWorkflowAction(action.id);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="rounded-xl">
            Actions
            <ChevronDown className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
          <div className="max-h-[min(70vh,26rem)] overflow-y-auto p-2">
            {groupedActions.map((group, groupIndex) => (
              <div
                key={group.tab}
                className={cn(groupIndex > 0 && 'border-border/60 mt-2 border-t pt-2')}
              >
                <p className="text-muted-foreground px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {group.actions.map((action) => (
                    <li key={action.id}>
                      <button
                        type="button"
                        disabled={action.disabled}
                        onClick={() => openAction(action)}
                        className={cn(
                          'hover:bg-muted/60 w-full rounded-lg px-2 py-2 text-left transition',
                          action.disabled && 'text-muted-foreground cursor-not-allowed opacity-60',
                        )}
                      >
                        <span className="block text-sm font-medium">{action.label}</span>
                        {action.description ? (
                          <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                            {action.description}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <PropertyWorkflowCreateDialog
        actionId={workflowAction}
        open={
          workflowAction != null &&
          workflowAction !== 'open_tribunal' &&
          workflowAction !== 'open_rent_chasing'
        }
        onOpenChange={(next) => {
          if (!next) setWorkflowAction(null);
        }}
        property={property}
        propertyId={propertyId}
        agency={primaryAgency}
        currentLease={currentLease}
        leasingCycle={activeCycle}
        tenantSelections={tenantSelections}
        onSuccess={(result?: PropertyWorkflowCreatedResult) => {
          setWorkflowAction(null);
          onRefresh?.();
          if (isV2 && result && isWorkflowCreatedCase(result)) {
            router.push(createdWorkflowCaseHref(result, propertyId));
          }
        }}
      />

      <CreateTribunalRentChasingDialog
        open={workflowAction === 'open_tribunal' || workflowAction === 'open_rent_chasing'}
        onOpenChange={(next) => {
          if (!next) setWorkflowAction(null);
        }}
        propertyId={propertyId}
        properties={properties}
        mode={workflowAction === 'open_tribunal' ? 'tribunal' : 'rent_chasing'}
        onCreated={(caseId) => {
          setWorkflowAction(null);
          onRefresh?.();
          if (isV2 && caseId) {
            router.push(tribunalDetail(caseId, fromProperty(propertyId, 'Tasks')));
          }
        }}
      />
    </>
  );
}
