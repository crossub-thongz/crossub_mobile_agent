'use client';

import { FileText } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { LeasingCycleWorkspacePane } from '@/components/agent/module-workspace/leasing-cycle-workspace-pane';
import { ModuleCaseDetail } from '@/components/agent/module-workspace/module-case-detail';
import {
  ModuleCellText,
  ModuleLanePill,
  ModuleWorkspace,
  formatModuleDate,
  type ModuleWorkspaceColumn,
} from '@/components/agent/module-workspace/module-workspace';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import {
  LEASING_LANES,
  LEASING_WORKSPACE_COPY,
  LEASING_WORKSPACE_PANE_COPY,
  MODULE_FIELD_LABELS,
  MODULE_WORKSPACE_LABELS,
} from '@/constants/module-workspace';
import { OWNER_DECISION_MODULE } from '@/constants/owner-decision';
import { leasingCycleHref } from '@/constants/routes';
import { leasingLifecycleProgress, leasingOnboardingProgress } from '@/lib/case-workflows/leasing';
import { compareNumbers, compareSortTime, compareStrings } from '@/lib/client-table-sort';
import { findLaneDefinition, leasingCycleLane } from '@/lib/module-workspace-lanes';
import type { LeasingCycle } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { leasingCycleStageLabel, leasingCycleStatusLabel } from '@/utils/leasing-relet-decision';

type LeasingSortKey = 'lane' | 'reference' | 'property' | 'stage' | 'rent' | 'available' | 'created';

/** Wider than the other modules' panes: it hosts the whole letting workspace. */
const DETAIL_PANE_CLASS = 'lg:w-[500px] xl:w-[600px] 2xl:w-[720px]';

const laneOf = (c: LeasingCycle) => findLaneDefinition(LEASING_LANES, leasingCycleLane(c));
const laneIndex = (c: LeasingCycle) => LEASING_LANES.indexOf(laneOf(c));
const referenceOf = (c: LeasingCycle) => workflowCaseReferenceLabel(c.id, 'leasing');

/** Step text, with the onboarding sub-step when there is one. */
function stageOf(c: LeasingCycle): string {
  const step = leasingCycleStageLabel(c, leasingLifecycleProgress(c).currentStepLabel);
  const onboarding = leasingOnboardingProgress(c);
  return onboarding ? `${step} · ${onboarding.currentStepLabel}` : step;
}

const COLUMNS: readonly ModuleWorkspaceColumn<LeasingCycle, LeasingSortKey>[] = [
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.status,
    sortKey: 'lane',
    className: 'w-[15%]',
    cell: (c) => <ModuleLanePill lane={laneOf(c)} />,
  },
  {
    id: 'reference',
    label: MODULE_FIELD_LABELS.reference,
    sortKey: 'reference',
    className: 'w-[11%]',
    cell: (c) => <ModuleCellText muted className="font-mono text-xs">{referenceOf(c)}</ModuleCellText>,
  },
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.property,
    sortKey: 'property',
    className: 'w-[26%]',
    cell: (c) => <ModuleCellText className="font-medium">{c.propertyAddress}</ModuleCellText>,
  },
  {
    id: 'stage',
    label: MODULE_FIELD_LABELS.stage,
    sortKey: 'stage',
    className: 'w-[20%]',
    cell: (c) => <ModuleCellText>{stageOf(c)}</ModuleCellText>,
  },
  {
    id: 'rent',
    label: MODULE_FIELD_LABELS.rent,
    sortKey: 'rent',
    className: 'w-[9%]',
    cell: (c) => <ModuleCellText muted>{formatCurrency(c.rentPerWeek)}</ModuleCellText>,
  },
  {
    id: 'available',
    label: MODULE_FIELD_LABELS.available,
    sortKey: 'available',
    className: 'w-[10%]',
    cell: (c) => <ModuleCellText muted>{formatModuleDate(c.availableFrom)}</ModuleCellText>,
  },
  {
    id: 'created',
    label: MODULE_FIELD_LABELS.created,
    sortKey: 'created',
    className: 'w-[9%]',
    cell: (c) => <ModuleCellText muted>{formatModuleDate(c.createdAt)}</ModuleCellText>,
  },
];

const SORT: Record<LeasingSortKey, (a: LeasingCycle, b: LeasingCycle) => number> = {
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  reference: (a, b) => compareStrings(referenceOf(a), referenceOf(b)),
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  stage: (a, b) => compareStrings(stageOf(a), stageOf(b)),
  rent: (a, b) => compareNumbers(a.rentPerWeek ?? 0, b.rentPerWeek ?? 0),
  available: (a, b) => compareSortTime(a.availableFrom, b.availableFrom),
  created: (a, b) => compareSortTime(a.createdAt, b.createdAt),
};

function searchText(c: LeasingCycle): string {
  return [referenceOf(c), c.propertyAddress, stageOf(c), leasingCycleStatusLabel(c)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function MobileRow({ c }: { c: LeasingCycle }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{c.propertyAddress}</p>
        <ModuleLanePill lane={laneOf(c)} />
      </div>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">
        {referenceOf(c)} · {stageOf(c)}
      </p>
    </>
  );
}

/**
 * Self-Manage Leasing page body: letting cycles by status, with the selected cycle's summary and
 * its letting workspace in the split pane.
 */
export function LeasingModule() {
  const { leasingCycles } = useAgentData();
  const scope = useSelfManagedPropertyIds();
  const rows = useMemo(
    () => leasingCycles.filter((c) => scope.has(c.propertyId)),
    [leasingCycles, scope],
  );
  const isV2 = useIsAgentUiV2();
  const rowHref = useCallback((c: LeasingCycle) => leasingCycleHref(c, isV2), [isV2]);
  const rowId = useCallback((c: LeasingCycle) => c.id, []);

  return (
    <ModuleWorkspace
      copy={LEASING_WORKSPACE_COPY}
      emptyIcon={FileText}
      rows={rows}
      rowId={rowId}
      rowHref={rowHref}
      rowLane={leasingCycleLane}
      rowSearchText={searchText}
      lanes={LEASING_LANES}
      columns={COLUMNS}
      sortComparators={SORT}
      defaultSortKey="created"
      mobileRow={(c) => <MobileRow c={c} />}
      detailClassName={DETAIL_PANE_CLASS}
      renderDetail={(c) => (
        <ModuleCaseDetail
          module={OWNER_DECISION_MODULE.LEASING}
          caseId={c.id}
          propertyId={c.propertyId}
          propertyAddress={c.propertyAddress}
          reference={referenceOf(c)}
          title={stageOf(c)}
          lane={laneOf(c)}
          statusLabel={leasingCycleStatusLabel(c) ?? undefined}
          detailHref={rowHref(c)}
          actions={{
            title: LEASING_WORKSPACE_PANE_COPY.title,
            content:
              c.isActive === false ? (
                <p className="text-muted-foreground text-xs">{LEASING_WORKSPACE_PANE_COPY.closed}</p>
              ) : (
                <LeasingCycleWorkspacePane cycle={c} />
              ),
          }}
          fields={[
            {
              label: MODULE_FIELD_LABELS.status,
              value: leasingCycleStatusLabel(c) ?? laneOf(c).label,
            },
            { label: MODULE_FIELD_LABELS.stage, value: stageOf(c) },
            {
              label: MODULE_FIELD_LABELS.rent,
              value: c.rentPerWeek != null ? formatCurrency(c.rentPerWeek) : MODULE_WORKSPACE_LABELS.noValue,
            },
            { label: MODULE_FIELD_LABELS.available, value: formatModuleDate(c.availableFrom) },
            { label: MODULE_FIELD_LABELS.created, value: formatModuleDate(c.createdAt) },
          ]}
        />
      )}
    />
  );
}
