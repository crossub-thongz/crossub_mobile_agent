'use client';

import { LogOut } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import {
  ModuleLanePill,
  ModuleWorkspace,
  type ModuleWorkspaceColumn,
} from '@/components/agent/module-workspace/module-workspace';
import {
  DueCell,
  NextActionCell,
  sinceLabel,
} from '@/components/agent/module-workspace/task-list-cells';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import {
  MODULE_FIELD_LABELS,
  MODULE_WORKSPACE_LABELS,
  VACATING_LANE,
  VACATING_LANES,
  VACATING_WORKSPACE_COPY,
} from '@/constants/module-workspace';
import { vacatingDetail } from '@/constants/routes';
import { vacatingWorkflowProgress } from '@/lib/case-workflows/vacating';
import { compareNumbers, compareSortTime, compareStrings } from '@/lib/client-table-sort';
import { findLaneDefinition, vacatingLane } from '@/lib/module-workspace-lanes';
import type { VacatingCase } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

type VacatingSortKey = 'property' | 'lane' | 'stage' | 'vacate' | 'bond';

const laneOf = (item: VacatingCase) => findLaneDefinition(VACATING_LANES, vacatingLane(item));
const laneIndex = (item: VacatingCase) => VACATING_LANES.indexOf(laneOf(item));
const referenceOf = (item: VacatingCase) => workflowCaseReferenceLabel(item.id, 'end_leasing');
const closed = (item: VacatingCase) => vacatingLane(item) === VACATING_LANE.CLOSED;
const stageOf = (item: VacatingCase) => vacatingWorkflowProgress(item).currentStepLabel;

const COLUMNS: readonly ModuleWorkspaceColumn<VacatingCase, VacatingSortKey>[] = [
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.property,
    sortKey: 'property',
    className: 'pl-4',
    cell: (item) => (
      <div className="min-w-0 max-w-[18rem]">
        <p className="truncate text-sm font-medium" title={item.propertyAddress}>
          {item.propertyAddress}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{referenceOf(item)}</p>
      </div>
    ),
  },
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.stage,
    sortKey: 'lane',
    cell: (item) => <ModuleLanePill lane={laneOf(item)} />,
  },
  {
    id: 'stage',
    label: MODULE_FIELD_LABELS.nextAction,
    sortKey: 'stage',
    cell: (item) => (
      <NextActionCell
        action={closed(item) ? 'No further action' : stageOf(item)}
        since={closed(item) ? null : sinceLabel(item.createdAt)}
      />
    ),
  },
  {
    id: 'vacate',
    label: MODULE_FIELD_LABELS.vacateDate,
    sortKey: 'vacate',
    cell: (item) => <DueCell iso={item.vacateDate} settled={closed(item)} />,
  },
  {
    id: 'bond',
    label: MODULE_FIELD_LABELS.bond,
    sortKey: 'bond',
    cell: (item) => (
      <span className="text-[13px]">{item.bondStatus || MODULE_WORKSPACE_LABELS.noValue}</span>
    ),
  },
  {
    id: 'reason',
    label: MODULE_FIELD_LABELS.reason,
    className: 'pr-6',
    cell: (item) => (
      <span className="text-muted-foreground block max-w-[16rem] truncate text-[13px]" title={item.reason}>
        {item.reason || MODULE_WORKSPACE_LABELS.noValue}
      </span>
    ),
  },
];

const SORT: Record<VacatingSortKey, (a: VacatingCase, b: VacatingCase) => number> = {
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  stage: (a, b) => compareStrings(stageOf(a), stageOf(b)),
  vacate: (a, b) => compareSortTime(a.vacateDate, b.vacateDate),
  bond: (a, b) => compareStrings(a.bondStatus, b.bondStatus),
};

function searchText(item: VacatingCase): string {
  return [referenceOf(item), item.propertyAddress, item.reason, stageOf(item), item.bondStatus]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function MobileRow({ item }: { item: VacatingCase }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{item.propertyAddress}</p>
        <ModuleLanePill lane={laneOf(item)} />
      </div>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">
        {referenceOf(item)} · {stageOf(item)}
      </p>
    </>
  );
}

/** Self-Manage vacating list. A row opens the same end-of-lease task Tasks already uses. */
export function VacatingModule() {
  const { vacating } = useAgentData();
  const scope = useSelfManagedPropertyIds();
  const rows = useMemo(
    () => vacating.filter((item) => scope.has(item.propertyId)),
    [scope, vacating],
  );
  const rowHref = useCallback((item: VacatingCase) => vacatingDetail(item.id), []);
  const rowId = useCallback((item: VacatingCase) => item.id, []);

  return (
    <ModuleWorkspace
      copy={VACATING_WORKSPACE_COPY}
      emptyIcon={LogOut}
      rows={rows}
      rowId={rowId}
      rowHref={rowHref}
      rowLane={vacatingLane}
      rowSearchText={searchText}
      lanes={VACATING_LANES}
      columns={COLUMNS}
      sortComparators={SORT}
      defaultSortKey="vacate"
      defaultSortDirection="asc"
      detailPresentation="navigate"
      mobileRow={(item) => <MobileRow item={item} />}
    />
  );
}
