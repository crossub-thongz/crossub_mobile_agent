'use client';

import { ClipboardList } from 'lucide-react';
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
  INSPECTIONS_WORKSPACE_COPY,
  INSPECTION_LANES,
  MODULE_FIELD_LABELS,
  MODULE_WORKSPACE_LABELS,
} from '@/constants/module-workspace';
import { OWNER_DECISION_MODULE } from '@/constants/owner-decision';
import { inspectionDetail } from '@/constants/routes';
import { compareNumbers, compareSortTime, compareStrings } from '@/lib/client-table-sort';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import { findLaneDefinition, inspectionLane } from '@/lib/module-workspace-lanes';
import type { Inspection } from '@/lib/types';
import { inspectionRefSourceId } from '@/lib/workflow-case-reference';

type InspectionSortKey = 'lane' | 'reference' | 'property' | 'type' | 'inspector' | 'scheduled' | 'created';

const laneOf = (i: Inspection) => findLaneDefinition(INSPECTION_LANES, inspectionLane(i));
const laneIndex = (i: Inspection) => INSPECTION_LANES.indexOf(laneOf(i));
/** Ingoing jobs not yet booked show the move-in target instead. */
const scheduledOf = (i: Inspection) => i.scheduledAt ?? i.moveInDate;

const COLUMNS: readonly ModuleWorkspaceColumn<Inspection, InspectionSortKey>[] = [
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.status,
    sortKey: 'lane',
    className: 'w-[17%]',
    cell: (i) => <ModuleLanePill lane={laneOf(i)} />,
  },
  {
    id: 'reference',
    label: MODULE_FIELD_LABELS.reference,
    sortKey: 'reference',
    className: 'w-[11%]',
    cell: (i) => <ModuleCellText muted className="font-mono text-xs">{i.trackingNumber}</ModuleCellText>,
  },
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.property,
    sortKey: 'property',
    className: 'w-[26%]',
    cell: (i) => <ModuleCellText className="font-medium">{i.propertyAddress}</ModuleCellText>,
  },
  {
    id: 'type',
    label: MODULE_FIELD_LABELS.type,
    sortKey: 'type',
    className: 'w-[13%]',
    cell: (i) => <ModuleCellText>{INSPECTION_TYPE_LABEL[i.type]}</ModuleCellText>,
  },
  {
    id: 'inspector',
    label: MODULE_FIELD_LABELS.inspector,
    sortKey: 'inspector',
    className: 'w-[13%]',
    cell: (i) => <ModuleCellText muted>{i.inspector ?? MODULE_WORKSPACE_LABELS.noValue}</ModuleCellText>,
  },
  {
    id: 'scheduled',
    label: MODULE_FIELD_LABELS.scheduled,
    sortKey: 'scheduled',
    className: 'w-[10%]',
    cell: (i) => <ModuleCellText muted>{formatModuleDate(scheduledOf(i))}</ModuleCellText>,
  },
  {
    id: 'created',
    label: MODULE_FIELD_LABELS.created,
    sortKey: 'created',
    className: 'w-[10%]',
    cell: (i) => <ModuleCellText muted>{formatModuleDate(i.createdAt)}</ModuleCellText>,
  },
];

const SORT: Record<InspectionSortKey, (a: Inspection, b: Inspection) => number> = {
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  reference: (a, b) => compareStrings(a.trackingNumber, b.trackingNumber),
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  type: (a, b) => compareStrings(INSPECTION_TYPE_LABEL[a.type], INSPECTION_TYPE_LABEL[b.type]),
  inspector: (a, b) => compareStrings(a.inspector ?? '', b.inspector ?? ''),
  scheduled: (a, b) => compareSortTime(scheduledOf(a), scheduledOf(b)),
  created: (a, b) => compareSortTime(a.createdAt, b.createdAt),
};

function searchText(i: Inspection): string {
  return [i.trackingNumber, i.propertyAddress, INSPECTION_TYPE_LABEL[i.type], i.inspector, i.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function MobileRow({ i }: { i: Inspection }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{i.propertyAddress}</p>
        <ModuleLanePill lane={laneOf(i)} />
      </div>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">
        {i.trackingNumber} · {INSPECTION_TYPE_LABEL[i.type]} · {formatModuleDate(scheduledOf(i))}
      </p>
    </>
  );
}

function Detail({ i }: { i: Inspection }) {
  return (
    <ModuleCaseDetail
      module={OWNER_DECISION_MODULE.INSPECTIONS}
      caseId={inspectionRefSourceId(i)}
      propertyId={i.propertyId}
      propertyAddress={i.propertyAddress}
      reference={i.trackingNumber}
      title={INSPECTION_TYPE_LABEL[i.type]}
      lane={laneOf(i)}
      statusLabel={i.status}
      detailHref={inspectionDetail(i.id)}
      fields={[
        { label: MODULE_FIELD_LABELS.status, value: i.status },
        { label: MODULE_FIELD_LABELS.inspector, value: i.inspector ?? MODULE_WORKSPACE_LABELS.noValue },
        { label: MODULE_FIELD_LABELS.scheduled, value: formatModuleDate(scheduledOf(i)) },
        { label: MODULE_FIELD_LABELS.completed, value: formatModuleDate(i.completedAt) },
        { label: MODULE_FIELD_LABELS.created, value: formatModuleDate(i.createdAt) },
      ]}
    />
  );
}

/** Self-Manage Inspections page body — booking to published report, by lane. */
export function InspectionsModule() {
  const { inspections } = useAgentData();
  const scope = useSelfManagedPropertyIds();
  const rows = useMemo(
    () => inspections.filter((i) => scope.has(i.propertyId)),
    [inspections, scope],
  );
  const rowId = useCallback((i: Inspection) => i.id, []);
  const rowHref = useCallback((i: Inspection) => inspectionDetail(i.id), []);

  return (
    <ModuleWorkspace
      copy={INSPECTIONS_WORKSPACE_COPY}
      emptyIcon={ClipboardList}
      rows={rows}
      rowId={rowId}
      rowHref={rowHref}
      rowLane={inspectionLane}
      rowSearchText={searchText}
      lanes={INSPECTION_LANES}
      columns={COLUMNS}
      sortComparators={SORT}
      defaultSortKey="scheduled"
      mobileRow={(i) => <MobileRow i={i} />}
      renderDetail={(i) => <Detail i={i} />}
    />
  );
}
