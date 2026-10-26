'use client';

import { TrendingUp } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { ModuleCaseDetail } from '@/components/agent/module-workspace/module-case-detail';
import {
  ModuleCellText,
  ModuleLanePill,
  ModuleWorkspace,
  formatModuleDate,
  type ModuleWorkspaceColumn,
} from '@/components/agent/module-workspace/module-workspace';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { RentReviewDetailView } from '@/components/rent-review/rent-review-detail-view';
import {
  MODULE_FIELD_LABELS,
  MODULE_WORKSPACE_LABELS,
  TENANCY_REVIEW_LANES,
  TENANCY_REVIEW_PANE_COPY,
  TENANCY_REVIEW_WORKSPACE_COPY,
} from '@/constants/module-workspace';
import { OWNER_DECISION_MODULE } from '@/constants/owner-decision';
import { rentReviewDetail } from '@/constants/routes';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import { compareNumbers, compareSortTime, compareStrings } from '@/lib/client-table-sort';
import { findLaneDefinition, tenancyReviewLane } from '@/lib/module-workspace-lanes';
import type { RentReviewCase } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

type TenancyReviewSortKey = 'lane' | 'reference' | 'property' | 'tenant' | 'rent' | 'due' | 'created';

/** Wide like the letting pane: it hosts the whole review workflow. */
const DETAIL_PANE_CLASS = 'lg:w-[500px] xl:w-[600px] 2xl:w-[720px]';

const laneOf = (r: RentReviewCase) => findLaneDefinition(TENANCY_REVIEW_LANES, tenancyReviewLane(r));
const laneIndex = (r: RentReviewCase) => TENANCY_REVIEW_LANES.indexOf(laneOf(r));
const referenceOf = (r: RentReviewCase) => workflowCaseReferenceLabel(r.id, 'rent_review');
const tenantOf = (r: RentReviewCase) => r.tenantName ?? MODULE_WORKSPACE_LABELS.noValue;

const COLUMNS: readonly ModuleWorkspaceColumn<RentReviewCase, TenancyReviewSortKey>[] = [
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.status,
    sortKey: 'lane',
    className: 'w-[15%]',
    cell: (r) => <ModuleLanePill lane={laneOf(r)} />,
  },
  {
    id: 'reference',
    label: MODULE_FIELD_LABELS.reference,
    sortKey: 'reference',
    className: 'w-[11%]',
    cell: (r) => <ModuleCellText muted className="font-mono text-xs">{referenceOf(r)}</ModuleCellText>,
  },
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.property,
    sortKey: 'property',
    className: 'w-[28%]',
    cell: (r) => <ModuleCellText className="font-medium">{r.propertyAddress}</ModuleCellText>,
  },
  {
    id: 'tenant',
    label: MODULE_FIELD_LABELS.tenant,
    sortKey: 'tenant',
    className: 'w-[16%]',
    cell: (r) => <ModuleCellText>{tenantOf(r)}</ModuleCellText>,
  },
  {
    id: 'rent',
    label: MODULE_FIELD_LABELS.rent,
    sortKey: 'rent',
    className: 'w-[10%]',
    cell: (r) => <ModuleCellText muted>{formatCurrency(r.currentRent)}</ModuleCellText>,
  },
  {
    id: 'due',
    label: MODULE_FIELD_LABELS.reviewDue,
    sortKey: 'due',
    className: 'w-[10%]',
    cell: (r) => <ModuleCellText muted>{formatModuleDate(r.reviewDue)}</ModuleCellText>,
  },
  {
    id: 'created',
    label: MODULE_FIELD_LABELS.created,
    sortKey: 'created',
    className: 'w-[10%]',
    cell: (r) => <ModuleCellText muted>{formatModuleDate(r.createdAt)}</ModuleCellText>,
  },
];

const SORT: Record<TenancyReviewSortKey, (a: RentReviewCase, b: RentReviewCase) => number> = {
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  reference: (a, b) => compareStrings(referenceOf(a), referenceOf(b)),
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  tenant: (a, b) => compareStrings(tenantOf(a), tenantOf(b)),
  rent: (a, b) => compareNumbers(a.currentRent, b.currentRent),
  due: (a, b) => compareSortTime(a.reviewDue, b.reviewDue),
  created: (a, b) => compareSortTime(a.createdAt, b.createdAt),
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

/**
 * Self-Manage Leasing page, Tenancy reviews: rent reviews and lease renewals the agency runs
 * itself, with the selected review's workflow in the split pane.
 */
export function TenancyReviewModule() {
  const { rentReviews, apiConnected } = useAgentData();
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
      defaultSortKey="created"
      mobileRow={(r) => <MobileRow r={r} />}
      detailClassName={DETAIL_PANE_CLASS}
      renderDetail={(r) => (
        <ModuleCaseDetail
          module={OWNER_DECISION_MODULE.TENANCY_REVIEW}
          caseId={r.id}
          propertyId={r.propertyId}
          propertyAddress={r.propertyAddress}
          reference={referenceOf(r)}
          title={r.status}
          lane={laneOf(r)}
          detailHref={rowHref(r)}
          actions={{
            title: TENANCY_REVIEW_PANE_COPY.title,
            content: (
              <RentReviewDetailView
                reviewId={r.id}
                leaseEndDate={r.leaseEnd || null}
                apiConnected={apiConnected}
                hideHeader
              />
            ),
          }}
          fields={[
            { label: MODULE_FIELD_LABELS.tenant, value: tenantOf(r) },
            { label: MODULE_FIELD_LABELS.rent, value: formatCurrency(r.currentRent) },
            { label: MODULE_FIELD_LABELS.reviewDue, value: formatModuleDate(r.reviewDue) },
            { label: MODULE_FIELD_LABELS.created, value: formatModuleDate(r.createdAt) },
          ]}
        />
      )}
    />
  );
}
