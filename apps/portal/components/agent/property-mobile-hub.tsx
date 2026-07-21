'use client';

import { useState } from 'react';
import { ChevronDown, ClipboardList, FileText, Sparkles, Wrench } from 'lucide-react';

import {
  PropertyWorkflowCreateDialog,
} from '@/components/agent/property-workflow-panel';
import { CreateTribunalRentChasingDialog } from '@/components/agent/create-tribunal-rent-chasing-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { PropertyWorkflowActionId } from '@/lib/property-workflow-actions';
import { useShellDockStore } from '@/lib/shell-dock-store';
import type {
  LeasingCycle,
  LeasingRecord,
  Property,
  TenantSelectionCase,
} from '@/lib/types';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

const CREATE_TILES = [
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    prompt: 'Create a maintenance job for this property.',
    actionId: 'start_maintenance' as PropertyWorkflowActionId,
    tone: 'from-orange-500/15 to-amber-500/5 text-orange-700 dark:text-orange-300',
  },
  {
    id: 'inspection',
    label: 'Inspection',
    icon: ClipboardList,
    prompt: 'Schedule an inspection for this property.',
    actionId: 'schedule_routine_inspection' as PropertyWorkflowActionId,
    tone: 'from-sky-500/15 to-blue-500/5 text-sky-700 dark:text-sky-300',
  },
  {
    id: 'leasing',
    label: 'Leasing',
    icon: FileText,
    prompt: 'Start a new leasing cycle for this property.',
    actionId: 'start_leasing' as PropertyWorkflowActionId,
    tone: 'from-violet-500/15 to-purple-500/5 text-violet-700 dark:text-violet-300',
  },
] as const;

export function PropertyMobileHub({
  property,
  propertyId,
  leasingCycles,
  tenantSelections,
  currentLease,
  onWorkflowCreated,
  readOnly = false,
}: {
  property: Property;
  propertyId: string;
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  onWorkflowCreated?: () => void;
  readOnly?: boolean;
}) {
  const openGii = useShellDockStore((s) => s.openGii);
  const { primaryAgency, properties } = useAgentData();
  const [formsOpen, setFormsOpen] = useState(false);
  const [manualAction, setManualAction] = useState<PropertyWorkflowActionId | null>(null);

  const fullAddress = formatPropertyFullAddress(property);

  const openGiiForProperty = (prompt?: string) => {
    openGii({
      propertyId,
      propertyAddress: fullAddress,
      initialPrompt: prompt,
    });
  };

  if (readOnly) return null;

  return (
    <div className="space-y-3 lg:hidden">
      {/* <button
        type="button"
        onClick={() => openGiiForProperty()}
        className="w-full rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card to-emerald-500/8 p-4 text-left shadow-sm transition active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Ask Gii, your Property Manager</p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              Tell Gii what you need — maintenance jobs, inspections, leasing, or a quick status
              check for this property.
            </p>
          </div>
        </div>
      </button> */}

      {/* Quick Gii prompt chips — hidden for now; use Ask Gii or Create a case tiles instead.
      <div className="flex flex-wrap gap-1.5">
        {PROPERTY_GII_PROMPTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openGiiForProperty(item.prompt)}
            className="rounded-full border border-border/80 bg-card px-2.5 py-1 text-[11px] font-medium transition hover:border-primary/30 hover:bg-primary/5"
          >
            {item.label}
          </button>
        ))}
      </div>
      */}

      <div>
        <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
          Create a case
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CREATE_TILES.map(({ id, label, icon: Icon, prompt, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => openGiiForProperty(prompt)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-b px-2 py-3.5 text-center transition active:scale-[0.98]',
                tone,
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-xs font-semibold leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border/80">
        <button
          type="button"
          onClick={() => setFormsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium"
        >
          <span>Create with form instead</span>
          <ChevronDown
            className={cn('size-4 transition', formsOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
        {formsOpen ? (
          <div className="space-y-2 border-t px-3 py-3">
            {CREATE_TILES.map(({ id, label, actionId }) => (
              <button
                key={id}
                type="button"
                onClick={() => setManualAction(actionId)}
                className="flex w-full items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5 text-sm font-medium hover:bg-muted/40"
              >
                {label}
                <span className="text-muted-foreground text-xs">Open form</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <PropertyWorkflowCreateDialog
        actionId={manualAction}
        open={manualAction != null && manualAction !== 'open_tribunal'}
        onOpenChange={(open) => {
          if (!open) setManualAction(null);
        }}
        property={property}
        propertyId={propertyId}
        agency={primaryAgency}
        currentLease={currentLease}
        leasingCycle={leasingCycles[0]}
        tenantSelections={tenantSelections}
        onSuccess={(result) => {
          setManualAction(null);
          onWorkflowCreated?.(result);
        }}
      />

      <CreateTribunalRentChasingDialog
        open={manualAction === 'open_tribunal'}
        onOpenChange={(open) => {
          if (!open) setManualAction(null);
        }}
        propertyId={propertyId}
        properties={properties}
        onCreated={() => {
          setManualAction(null);
          onWorkflowCreated?.();
        }}
      />
    </div>
  );
}
