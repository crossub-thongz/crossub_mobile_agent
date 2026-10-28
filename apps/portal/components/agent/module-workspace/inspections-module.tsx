'use client';

import { ClipboardList } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import {
  ModuleLanePill,
  ModuleWorkspace,
  formatModuleDate,
  type ModuleWorkspaceColumn,
} from '@/components/agent/module-workspace/module-workspace';
import {
  DueCell,
  OutlineBadge,
  TaskPersonCell,
  TaskStatusPill,
  taskListDate,
} from '@/components/agent/module-workspace/task-list-cells';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import {
  INSPECTIONS_WORKSPACE_COPY,
  INSPECTION_LANE,
  INSPECTION_LANES,
  MODULE_FIELD_LABELS,
  MODULE_WORKSPACE_LABELS,
} from '@/constants/module-workspace';
import { inspectionDetail } from '@/constants/routes';
import { compareNumbers, compareSortTime, compareStrings } from '@/lib/client-table-sort';
import { formatTimeShort } from '@/lib/format-datetime';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import { findLaneDefinition, inspectionLane } from '@/lib/module-workspace-lanes';
import type { Inspection } from '@/lib/types';

type InspectionSortKey = 'property' | 'type' | 'lane' | 'due' | 'inspector';

/** Same type colours as the admin inspection worklist. */
const TYPE_CHIP: Record<Inspection['type'], string> = {
  INGOING: 'border-blue-600 bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-300',
  OUTGOING: 'border-orange-600 bg-orange-600/10 text-orange-600 dark:bg-orange-600/20 dark:text-orange-300',
  ROUTINE: 'border-cyan-600 bg-cyan-600/10 text-cyan-600 dark:bg-cyan-600/20 dark:text-cyan-300',
  OPEN: 'border-violet-600 bg-violet-600/10 text-violet-600 dark:bg-violet-600/20 dark:text-violet-300',
};

const laneOf = (i: Inspection) => findLaneDefinition(INSPECTION_LANES, inspectionLane(i));
const laneIndex = (i: Inspection) => INSPECTION_LANES.indexOf(laneOf(i));
/** Ingoing jobs not yet booked show the move-in target instead. */
const scheduledOf = (i: Inspection) => i.scheduledAt ?? i.moveInDate;
const settled = (i: Inspection) => {
  const lane = inspectionLane(i);
  return lane === INSPECTION_LANE.PUBLISHED || lane === INSPECTION_LANE.CANCELLED;
};

function AppointmentCell({ inspection }: { inspection: Inspection }) {
  if (!inspection.scheduledAt) {
    return <span className="text-muted-foreground text-sm">Not booked</span>;
  }
  const day = taskListDate(inspection.scheduledAt);
  const time = formatTimeShort(inspection.scheduledAt);
  const midnight = time === '12:00 am';
  return (
    <div className="tabular-nums">
      <p>{day}</p>
      {midnight ? null : <p className="text-muted-foreground text-xs">{time}</p>}
    </div>
  );
}

const COLUMNS: readonly ModuleWorkspaceColumn<Inspection, InspectionSortKey>[] = [
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.property,
    sortKey: 'property',
    className: 'pl-4',
    cell: (i) => (
      <div className="min-w-0 max-w-[22rem]">
        <p className="truncate font-medium" title={i.propertyAddress}>
          {i.propertyAddress}
        </p>
        <p className="text-muted-foreground truncate text-xs">{i.trackingNumber}</p>
      </div>
    ),
  },
  {
    id: 'type',
    label: MODULE_FIELD_LABELS.type,
    sortKey: 'type',
    cell: (i) => <OutlineBadge className={TYPE_CHIP[i.type]}>{INSPECTION_TYPE_LABEL[i.type]}</OutlineBadge>,
  },
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.status,
    sortKey: 'lane',
    cell: (i) => <TaskStatusPill lane={laneOf(i)} />,
  },
  {
    id: 'due',
    label: 'Due date',
    sortKey: 'due',
    cell: (i) => <DueCell iso={scheduledOf(i)} settled={settled(i)} />,
  },
  {
    id: 'appointment',
    label: MODULE_FIELD_LABELS.appointment,
    cell: (i) => <AppointmentCell inspection={i} />,
  },
  {
    id: 'inspector',
    label: MODULE_FIELD_LABELS.inspector,
    sortKey: 'inspector',
    className: 'pr-6',
    cell: (i) =>
      i.inspector ? (
        <TaskPersonCell name={i.inspector} />
      ) : (
        <span className="text-muted-foreground text-sm">{MODULE_WORKSPACE_LABELS.noValue}</span>
      ),
  },
];

const SORT: Record<InspectionSortKey, (a: Inspection, b: Inspection) => number> = {
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  type: (a, b) => compareStrings(INSPECTION_TYPE_LABEL[a.type], INSPECTION_TYPE_LABEL[b.type]),
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  due: (a, b) => compareSortTime(scheduledOf(a), scheduledOf(b)),
  inspector: (a, b) => compareStrings(a.inspector ?? '', b.inspector ?? ''),
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

/** Self-Manage Inspections list. A row opens the full inspection task. */
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
      defaultSortKey="due"
      defaultSortDirection="asc"
      detailPresentation="navigate"
      mobileRow={(i) => <MobileRow i={i} />}
    />
  );
}
