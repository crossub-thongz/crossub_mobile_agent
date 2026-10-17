'use client';

import { Wrench } from 'lucide-react';
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
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import {
  MAINTENANCE_LANES,
  MAINTENANCE_WORKSPACE_COPY,
  MODULE_FIELD_LABELS,
  MODULE_WORKSPACE_LABELS,
} from '@/constants/module-workspace';
import { OWNER_DECISION_MODULE } from '@/constants/owner-decision';
import { maintenanceDetail } from '@/constants/routes';
import { compareNumbers, compareSortTime, compareStrings } from '@/lib/client-table-sort';
import { findLaneDefinition, maintenanceLane } from '@/lib/module-workspace-lanes';
import type { MaintenanceRequest } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type MaintenanceSortKey = 'lane' | 'reference' | 'property' | 'job' | 'tradie' | 'logged' | 'updated';

const laneOf = (m: MaintenanceRequest) => findLaneDefinition(MAINTENANCE_LANES, maintenanceLane(m));
const laneIndex = (m: MaintenanceRequest) => MAINTENANCE_LANES.indexOf(laneOf(m));

const COLUMNS: readonly ModuleWorkspaceColumn<MaintenanceRequest, MaintenanceSortKey>[] = [
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.status,
    sortKey: 'lane',
    className: 'w-[17%]',
    cell: (m) => <ModuleLanePill lane={laneOf(m)} />,
  },
  {
    id: 'reference',
    label: MODULE_FIELD_LABELS.reference,
    sortKey: 'reference',
    className: 'w-[11%]',
    cell: (m) => <ModuleCellText muted className="font-mono text-xs">{m.trackingNumber}</ModuleCellText>,
  },
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.property,
    sortKey: 'property',
    className: 'w-[24%]',
    cell: (m) => <ModuleCellText className="font-medium">{m.propertyAddress}</ModuleCellText>,
  },
  {
    id: 'job',
    label: MODULE_FIELD_LABELS.job,
    sortKey: 'job',
    className: 'w-[18%]',
    cell: (m) => <ModuleCellText>{m.title}</ModuleCellText>,
  },
  {
    id: 'tradie',
    label: MODULE_FIELD_LABELS.tradie,
    sortKey: 'tradie',
    className: 'w-[12%]',
    cell: (m) => (
      <ModuleCellText muted>{m.contractorName ?? MODULE_WORKSPACE_LABELS.noValue}</ModuleCellText>
    ),
  },
  {
    id: 'logged',
    label: MODULE_FIELD_LABELS.logged,
    sortKey: 'logged',
    className: 'w-[9%]',
    cell: (m) => <ModuleCellText muted>{formatModuleDate(m.createdAt)}</ModuleCellText>,
  },
  {
    id: 'updated',
    label: MODULE_FIELD_LABELS.updated,
    sortKey: 'updated',
    className: 'w-[9%]',
    cell: (m) => <ModuleCellText muted>{formatModuleDate(m.updatedAt)}</ModuleCellText>,
  },
];

const SORT: Record<MaintenanceSortKey, (a: MaintenanceRequest, b: MaintenanceRequest) => number> = {
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  reference: (a, b) => compareStrings(a.trackingNumber, b.trackingNumber),
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  job: (a, b) => compareStrings(a.title, b.title),
  tradie: (a, b) => compareStrings(a.contractorName ?? '', b.contractorName ?? ''),
  logged: (a, b) => compareSortTime(a.createdAt, b.createdAt),
  updated: (a, b) => compareSortTime(a.updatedAt, b.updatedAt),
};

function searchText(m: MaintenanceRequest): string {
  return [m.trackingNumber, m.propertyAddress, m.title, m.description, m.contractorName, m.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function MobileRow({ m }: { m: MaintenanceRequest }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{m.propertyAddress}</p>
        <ModuleLanePill lane={laneOf(m)} />
      </div>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">
        {m.trackingNumber} · {m.title}
      </p>
    </>
  );
}

function Detail({ m }: { m: MaintenanceRequest }) {
  return (
    <ModuleCaseDetail
      module={OWNER_DECISION_MODULE.MAINTENANCE}
      caseId={m.id}
      propertyId={m.propertyId}
      propertyAddress={m.propertyAddress}
      reference={m.trackingNumber}
      title={m.title}
      lane={laneOf(m)}
      statusLabel={m.status}
      detailHref={maintenanceDetail(m.id)}
      fields={[
        { label: MODULE_FIELD_LABELS.status, value: m.status },
        { label: MODULE_FIELD_LABELS.tradie, value: m.contractorName ?? MODULE_WORKSPACE_LABELS.noValue },
        {
          label: MODULE_FIELD_LABELS.quote,
          value: m.quoteAmount != null ? formatCurrency(m.quoteAmount) : MODULE_WORKSPACE_LABELS.noValue,
        },
        { label: MODULE_FIELD_LABELS.logged, value: formatModuleDate(m.createdAt) },
        { label: MODULE_FIELD_LABELS.updated, value: formatModuleDate(m.updatedAt) },
        {
          label: MODULE_FIELD_LABELS.description,
          value: m.description.trim() || MODULE_WORKSPACE_LABELS.noValue,
        },
      ]}
    />
  );
}

/** Self-Manage Maintenance page body — every job by lane, with the case summary beside it. */
export function MaintenanceModule() {
  const { maintenanceAll } = useAgentData();
  const scope = useSelfManagedPropertyIds();
  const rows = useMemo(
    () => maintenanceAll.filter((m) => scope.has(m.propertyId)),
    [maintenanceAll, scope],
  );
  const rowId = useCallback((m: MaintenanceRequest) => m.id, []);
  const rowHref = useCallback((m: MaintenanceRequest) => maintenanceDetail(m.id), []);

  return (
    <ModuleWorkspace
      copy={MAINTENANCE_WORKSPACE_COPY}
      emptyIcon={Wrench}
      rows={rows}
      rowId={rowId}
      rowHref={rowHref}
      rowLane={maintenanceLane}
      rowSearchText={searchText}
      lanes={MAINTENANCE_LANES}
      columns={COLUMNS}
      sortComparators={SORT}
      defaultSortKey="updated"
      mobileRow={(m) => <MobileRow m={m} />}
      renderDetail={(m) => <Detail m={m} />}
    />
  );
}
