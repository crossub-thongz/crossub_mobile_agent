'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus } from 'lucide-react';

import { QuickCreateWorkflowDialog } from '@/components/agent/quick-create-workflow-dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useEmailVerificationGuard } from '@/hooks/use-email-verification-guard';
import { inspectionDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { createdWorkflowCaseHref } from '@/lib/property-job-href';
import {
  buildPropertyWorkflowContext,
  workflowMenuGroupsFor,
  type PropertyWorkflowAction,
  type PropertyWorkflowActionId,
} from '@/lib/property-workflow-actions';
import {
  isWorkflowCreatedCase,
  type PropertyWorkflowCreatedResult,
} from '@/lib/property-workflow-created';
import {
  notifyWorkflowTourCaseCreated,
  readPendingWorkflowTour,
  subscribeWorkflowTourOpenCreateMenu,
} from '@/lib/agent-workflow-tour';
import { cn } from '@/lib/utils';

export function NewTaskActionsMenu({ propertyId }: { propertyId?: string }) {
  const router = useRouter();
  const {
    hasFullManagementAccess,
    refresh,
    leasingCycles,
    rentReviews,
    vacating,
    maintenanceAll,
    inspections,
    tribunalCases,
    leasingRecords,
  } = useAgentData();
  const { blockIfUnverified } = useEmailVerificationGuard();
  const [open, setOpen] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<PropertyWorkflowActionId | null>(null);

  const groupedActions = useMemo(() => {
    const currentLease = propertyId
      ? leasingRecords.find((l) => l.propertyId === propertyId && l.status === 'current') ??
        leasingRecords.find((l) => l.propertyId === propertyId && l.status === 'upcoming')
      : undefined;
    const ctx = buildPropertyWorkflowContext({
      propertyId: propertyId ?? '',
      leasingCycles: propertyId ? leasingCycles : [],
      rentReviews: propertyId ? rentReviews : [],
      vacatingCases: propertyId ? vacating : [],
      maintenance: propertyId ? maintenanceAll : [],
      inspections: propertyId ? inspections : [],
      tribunalCases: propertyId ? tribunalCases : [],
      currentLease,
    });
    return workflowMenuGroupsFor(ctx, { hasFullAccess: hasFullManagementAccess }).map((group) => ({
      ...group,
      actions: propertyId
        ? group.actions
        : group.actions.map((action) => ({ ...action, disabled: false })),
    }));
  }, [
    hasFullManagementAccess,
    inspections,
    leasingCycles,
    leasingRecords,
    maintenanceAll,
    propertyId,
    rentReviews,
    tribunalCases,
    vacating,
  ]);

  const openAction = (action: PropertyWorkflowAction) => {
    if (action.disabled) return;
    if (blockIfUnverified()) return;
    setOpen(false);
    setWorkflowAction(action.id);
  };

  const handleCreated = (result?: PropertyWorkflowCreatedResult, createdPropertyId?: string) => {
    const pid = createdPropertyId ?? propertyId;
    setWorkflowAction(null);
    if (readPendingWorkflowTour()) {
      notifyWorkflowTourCaseCreated();
    }
    void refresh();
    if (!result || !pid) return;
    if (isWorkflowCreatedCase(result)) {
      router.push(createdWorkflowCaseHref(result, pid));
      return;
    }
    const inspectionId = result.inspectionId ?? result.inspection?.id;
    if (inspectionId) {
      router.push(inspectionDetail(inspectionId, fromProperty(pid, 'Tasks')));
    }
  };

  useEffect(() => {
    return subscribeWorkflowTourOpenCreateMenu(() => setOpen(true));
  }, []);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" className="rounded-xl" data-tour="tasks-new">
            <Plus className="size-4" />
            New task
            <ChevronDown className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(100vw-2rem,22rem)] p-0" data-tour="workflow-tour-new-menu">
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
                        data-tour={`workflow-tour-new-action-${action.id}`}
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

      <QuickCreateWorkflowDialog
        actionId={workflowAction}
        open={workflowAction != null}
        onOpenChange={(next) => {
          if (!next) setWorkflowAction(null);
        }}
        initialPropertyId={propertyId}
        onCreated={handleCreated}
      />
    </>
  );
}
