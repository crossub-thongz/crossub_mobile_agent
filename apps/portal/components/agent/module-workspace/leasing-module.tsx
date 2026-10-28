'use client';

import { FileText } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import {
  ModuleLanePill,
  ModuleWorkspace,
  type ModuleWorkspaceColumn,
} from '@/components/agent/module-workspace/module-workspace';
import {
  DueCell,
  NextActionCell,
  TaskStatusPill,
  daysUntil,
  sinceLabel,
} from '@/components/agent/module-workspace/task-list-cells';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import {
  LEASING_LANE,
  LEASING_LANES,
  LEASING_WORKSPACE_COPY,
  MODULE_FIELD_LABELS,
  MODULE_WORKSPACE_LABELS,
} from '@/constants/module-workspace';
import { leasingDetail } from '@/constants/routes';
import { leasingLifecycleProgress, leasingOnboardingProgress } from '@/lib/case-workflows/leasing';
import { compareNumbers, compareSortTime, compareStrings } from '@/lib/client-table-sort';
import { findLaneDefinition, leasingCycleLane } from '@/lib/module-workspace-lanes';
import type { LeasingCycle } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { leasingCycleStageLabel, leasingCycleStatusLabel } from '@/utils/leasing-relet-decision';

type LeasingSortKey = 'property' | 'lane' | 'stage' | 'available' | 'vacant';

const laneOf = (c: LeasingCycle) => findLaneDefinition(LEASING_LANES, leasingCycleLane(c));
const laneIndex = (c: LeasingCycle) => LEASING_LANES.indexOf(laneOf(c));
const referenceOf = (c: LeasingCycle) => workflowCaseReferenceLabel(c.id, 'leasing');
const settled = (c: LeasingCycle) => {
  const lane = leasingCycleLane(c);
  return lane === LEASING_LANE.COMPLETED || lane === LEASING_LANE.CANCELLED;
};

/** Step text, with the onboarding sub-step when there is one. */
function stageOf(c: LeasingCycle): string {
  const step = leasingCycleStageLabel(c, leasingLifecycleProgress(c).currentStepLabel);
  const onboarding = leasingOnboardingProgress(c);
  return onboarding ? `${step} · ${onboarding.currentStepLabel}` : step;
}

/** Days the property has been empty, once the available date has passed. */
function vacantDays(c: LeasingCycle): number | null {
  if (settled(c)) return null;
  const remaining = daysUntil(c.availableFrom);
  if (remaining == null || remaining > 0) return null;
  return -remaining;
}

const COLUMNS: readonly ModuleWorkspaceColumn<LeasingCycle, LeasingSortKey>[] = [
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.property,
    sortKey: 'property',
    className: 'pl-4',
    cell: (c) => (
      <div className="min-w-0 max-w-[18rem]">
        <p className="truncate text-sm font-medium" title={c.propertyAddress}>
          {c.propertyAddress}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{referenceOf(c)}</p>
      </div>
    ),
  },
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.stage,
    sortKey: 'lane',
    cell: (c) => <TaskStatusPill lane={laneOf(c)} />,
  },
  {
    id: 'stage',
    label: MODULE_FIELD_LABELS.nextAction,
    sortKey: 'stage',
    cell: (c) => {
      const closed = settled(c);
      const yours = leasingCycleLane(c) === LEASING_LANE.AWAITING_YOU;
      return (
        <div className="flex min-w-0 max-w-[20rem] items-center gap-2">
          {closed ? null : (
            <span
              className={
                yours
                  ? 'shrink-0 rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-200'
                  : 'border-border text-muted-foreground shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium'
              }
            >
              {yours ? 'Your turn' : 'Waiting'}
            </span>
          )}
          <NextActionCell
            action={closed ? 'No further action' : stageOf(c)}
            since={closed ? null : sinceLabel(c.createdAt)}
          />
        </div>
      );
    },
  },
  {
    id: 'available',
    label: MODULE_FIELD_LABELS.due,
    sortKey: 'available',
    cell: (c) => <DueCell iso={c.availableFrom} settled={settled(c)} />,
  },
  {
    id: 'vacant',
    label: MODULE_FIELD_LABELS.vacant,
    sortKey: 'vacant',
    className: 'text-right',
    cell: (c) => {
      const days = vacantDays(c);
      return (
        <span className={days == null ? 'text-muted-foreground text-[13px]' : 'text-[13px] tabular-nums'}>
          {days == null ? MODULE_WORKSPACE_LABELS.noValue : `${days}d`}
        </span>
      );
    },
  },
  {
    id: 'apps',
    label: MODULE_FIELD_LABELS.applications,
    className: 'text-right',
    cell: () => <span className="text-muted-foreground text-[13px]">{MODULE_WORKSPACE_LABELS.noValue}</span>,
  },
  {
    id: 'tenant',
    label: MODULE_FIELD_LABELS.tenant,
    className: 'pr-6',
    cell: () => <span className="text-muted-foreground text-[13px]">{MODULE_WORKSPACE_LABELS.noValue}</span>,
  },
];

const SORT: Record<LeasingSortKey, (a: LeasingCycle, b: LeasingCycle) => number> = {
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  stage: (a, b) => compareStrings(stageOf(a), stageOf(b)),
  available: (a, b) => compareSortTime(a.availableFrom, b.availableFrom),
  vacant: (a, b) => compareNumbers(vacantDays(a) ?? -1, vacantDays(b) ?? -1),
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

/** Self-Manage lettings list. A row opens the full leasing task. */
export function LeasingModule() {
  const { leasingCycles } = useAgentData();
  const scope = useSelfManagedPropertyIds();
  const rows = useMemo(
    () => leasingCycles.filter((c) => scope.has(c.propertyId)),
    [leasingCycles, scope],
  );
  const rowHref = useCallback((c: LeasingCycle) => leasingDetail(c.id), []);
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
      defaultSortKey="available"
      defaultSortDirection="asc"
      detailPresentation="navigate"
      mobileRow={(c) => <MobileRow c={c} />}
    />
  );
}
