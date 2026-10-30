'use client';

import { TrendingUp } from 'lucide-react';
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
  sinceLabel,
} from '@/components/agent/module-workspace/task-list-cells';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  MODULE_FIELD_LABELS,
  MODULE_WORKSPACE_LABELS,
  TENANCY_REVIEW_LANE,
  TENANCY_REVIEW_LANES,
  TENANCY_REVIEW_WORKSPACE_COPY,
} from '@/constants/module-workspace';
import { rentReviewDetail } from '@/constants/routes';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import { rentReviewWorkflowProgress } from '@/lib/case-workflows/rent-review';
import { compareNumbers, compareSortTime, compareStrings } from '@/lib/client-table-sort';
import { findLaneDefinition, tenancyReviewLane } from '@/lib/module-workspace-lanes';
import type { RentReviewCase } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

type TenancyReviewSortKey = 'property' | 'lane' | 'stage' | 'due' | 'tenant' | 'rent';

const laneOf = (r: RentReviewCase) => findLaneDefinition(TENANCY_REVIEW_LANES, tenancyReviewLane(r));
const laneIndex = (r: RentReviewCase) => TENANCY_REVIEW_LANES.indexOf(laneOf(r));
const referenceOf = (r: RentReviewCase) => workflowCaseReferenceLabel(r.id, 'rent_review');
const tenantOf = (r: RentReviewCase) => r.tenantName ?? MODULE_WORKSPACE_LABELS.noValue;
const settled = (r: RentReviewCase) => {
  const lane = tenancyReviewLane(r);
  return lane === TENANCY_REVIEW_LANE.COMPLETED || lane === TENANCY_REVIEW_LANE.CLOSED;
};
const stageOf = (r: RentReviewCase) => rentReviewWorkflowProgress(r).currentStepLabel;

const COLUMNS: readonly ModuleWorkspaceColumn<RentReviewCase, TenancyReviewSortKey>[] = [
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.property,
    sortKey: 'property',
    className: 'pl-4',
    cell: (r) => (
      <div className="min-w-0 max-w-[18rem]">
        <p className="truncate text-sm font-medium" title={r.propertyAddress}>
          {r.propertyAddress}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{referenceOf(r)}</p>
      </div>
    ),
  },
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.stage,
    sortKey: 'lane',
    cell: (r) => <TaskStatusPill lane={laneOf(r)} />,
  },
  {
    id: 'stage',
    label: MODULE_FIELD_LABELS.nextAction,
    sortKey: 'stage',
    cell: (r) => {
      const closed = settled(r);
      const yours = tenancyReviewLane(r) === TENANCY_REVIEW_LANE.AWAITING_YOU;
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
            action={closed ? 'No further action' : stageOf(r)}
            since={closed ? null : sinceLabel(r.createdAt)}
          />
        </div>
      );
    },
  },
  {
    id: 'due',
    label: MODULE_FIELD_LABELS.reviewDue,
    sortKey: 'due',
    cell: (r) => <DueCell iso={r.reviewDue} settled={settled(r)} />,
  },
  {
    id: 'tenant',
    label: MODULE_FIELD_LABELS.tenant,
    sortKey: 'tenant',
    cell: (r) => <span className="block max-w-[12rem] truncate text-[13px]">{tenantOf(r)}</span>,
  },
  {
    id: 'rent',
    label: MODULE_FIELD_LABELS.rent,
    sortKey: 'rent',
    className: 'pr-6 text-right',
    cell: (r) => <span className="text-[13px] tabular-nums">{formatCurrency(r.currentRent)}</span>,
  },
];

const SORT: Record<TenancyReviewSortKey, (a: RentReviewCase, b: RentReviewCase) => number> = {
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  stage: (a, b) => compareStrings(stageOf(a), stageOf(b)),
  due: (a, b) => compareSortTime(a.reviewDue, b.reviewDue),
  tenant: (a, b) => compareStrings(tenantOf(a), tenantOf(b)),
  rent: (a, b) => compareNumbers(a.currentRent, b.currentRent),
};

function searchText(r: RentReviewCase): string {
  return [referenceOf(r), r.propertyAddress, r.tenantName, r.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function MobileRow({ r }: { r: RentReviewCase }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{r.propertyAddress}</p>
        <ModuleLanePill lane={laneOf(r)} />
      </div>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">
        {referenceOf(r)} · {tenantOf(r)}
      </p>
    </>
  );
}

/** Self-Manage tenancy reviews. A row opens the full rent-review task. */
export function TenancyReviewModule() {
  const { rentReviews } = useAgentData();
  const scope = useSelfManagedPropertyIds();
  const rows = useMemo(
    () => rentReviews.filter((r) => scope.has(r.propertyId)),
    [rentReviews, scope],
  );
  const rowHref = useCallback((r: RentReviewCase) => rentReviewDetail(r.id), []);
  const rowId = useCallback((r: RentReviewCase) => r.id, []);

  return (
    <ModuleWorkspace
      copy={TENANCY_REVIEW_WORKSPACE_COPY}
      emptyIcon={TrendingUp}
      rows={rows}
      rowId={rowId}
      rowHref={rowHref}
      rowLane={tenancyReviewLane}
      rowSearchText={searchText}
      lanes={TENANCY_REVIEW_LANES}
      columns={COLUMNS}
      sortComparators={SORT}
      defaultSortKey="due"
      defaultSortDirection="asc"
      detailPresentation="navigate"
      mobileRow={(r) => <MobileRow r={r} />}
    />
  );
}
