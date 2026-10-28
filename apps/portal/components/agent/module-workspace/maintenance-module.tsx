'use client';

import { Wrench } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import {
  ModuleLanePill,
  ModuleWorkspace,
  type ModuleWorkspaceColumn,
} from '@/components/agent/module-workspace/module-workspace';
import {
  AddressIssueCell,
  DueCell,
  NextActionCell,
  SelfManagedAgentCell,
  TaskIdCell,
  TaskStatusPill,
  sinceLabel,
} from '@/components/agent/module-workspace/task-list-cells';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import {
  MAINTENANCE_LANE,
  MAINTENANCE_LANES,
  MAINTENANCE_WORKSPACE_COPY,
  MODULE_FIELD_LABELS,
} from '@/constants/module-workspace';
import { maintenanceDetail } from '@/constants/routes';
import { compareNumbers, compareStrings } from '@/lib/client-table-sort';
import { findLaneDefinition, maintenanceLane } from '@/lib/module-workspace-lanes';
import type { MaintenanceRequest } from '@/lib/types';

type MaintenanceSortKey = 'reference' | 'property' | 'lane' | 'nextAction';

const RESPONSIBILITY_LABEL: Record<MaintenanceRequest['responsibility'], string> = {
  landlord: 'Landlord',
  tenant: 'Tenant',
  strata: 'Strata',
  pending: 'Pending',
};

const laneOf = (m: MaintenanceRequest) => findLaneDefinition(MAINTENANCE_LANES, maintenanceLane(m));
const laneIndex = (m: MaintenanceRequest) => MAINTENANCE_LANES.indexOf(laneOf(m));

/** The one next step a self-managed agent can act on, in the admin worklist's words. */
function nextActionOf(m: MaintenanceRequest): string {
  const lane = maintenanceLane(m);
  if (lane === MAINTENANCE_LANE.DONE) return 'No further action';
  if (m.requiresApproval) return 'Review quote and send for approval';
  if (m.scheduleProposal && !m.scheduleProposal.tenantDecision) return 'Waiting on the tenant';
  if (lane === MAINTENANCE_LANE.AWAITING_CONTRACTOR) {
    return m.contractorName ? 'Contractor to book the visit' : 'Invite contractors to quote';
  }
  if (lane === MAINTENANCE_LANE.AWAITING_TENANT) return 'Awaiting the tenant';
  if (lane === MAINTENANCE_LANE.NEEDS_ACTION) return 'Your action is needed';
  return 'Work in progress';
}

function issueChips(m: MaintenanceRequest): { label: string; tone?: 'neutral' | 'positive' | 'urgent' }[] {
  const chips: { label: string; tone?: 'neutral' | 'positive' | 'urgent' }[] = [];
  if (m.endLeasingMaintenance) chips.push({ label: 'End of Lease Maintenance' });
  if (m.responsibility) {
    chips.push({
      label: RESPONSIBILITY_LABEL[m.responsibility],
      tone: m.responsibility === 'landlord' ? 'positive' : 'neutral',
    });
  }
  if (m.priority === 'urgent') chips.push({ label: 'Urgent', tone: 'urgent' });
  return chips;
}

const COLUMNS: readonly ModuleWorkspaceColumn<MaintenanceRequest, MaintenanceSortKey>[] = [
  {
    id: 'reference',
    label: MODULE_FIELD_LABELS.taskId,
    sortKey: 'reference',
    className: 'w-[9rem] pl-4',
    cell: (m) => <TaskIdCell reference={m.trackingNumber} loggedAt={m.createdAt} />,
  },
  {
    id: 'property',
    label: MODULE_FIELD_LABELS.addressIssue,
    sortKey: 'property',
    cell: (m) => (
      <AddressIssueCell address={m.propertyAddress} issue={m.title} chips={issueChips(m)} />
    ),
  },
  {
    id: 'lane',
    label: MODULE_FIELD_LABELS.status,
    sortKey: 'lane',
    className: 'w-[10rem]',
    cell: (m) => <TaskStatusPill lane={laneOf(m)} />,
  },
  {
    id: 'nextAction',
    label: MODULE_FIELD_LABELS.nextAction,
    sortKey: 'nextAction',
    cell: (m) => <NextActionCell action={nextActionOf(m)} since={sinceLabel(m.updatedAt ?? m.createdAt)} />,
  },
  {
    id: 'agent',
    label: MODULE_FIELD_LABELS.agent,
    className: 'w-[12rem]',
    cell: () => <SelfManagedAgentCell />,
  },
  {
    id: 'due',
    label: MODULE_FIELD_LABELS.due,
    className: 'w-[9rem] pr-6',
    cell: (m) => (
      <DueCell iso={m.quoteExpiry} settled={maintenanceLane(m) === MAINTENANCE_LANE.DONE} />
    ),
  },
];

const SORT: Record<MaintenanceSortKey, (a: MaintenanceRequest, b: MaintenanceRequest) => number> = {
  reference: (a, b) => compareStrings(a.trackingNumber, b.trackingNumber),
  property: (a, b) => compareStrings(a.propertyAddress, b.propertyAddress),
  lane: (a, b) => compareNumbers(laneIndex(a), laneIndex(b)),
  nextAction: (a, b) => compareStrings(nextActionOf(a), nextActionOf(b)),
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

/** Self-Manage Maintenance list. A row opens the full maintenance task. */
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
      defaultSortKey="lane"
      defaultSortDirection="asc"
      detailPresentation="navigate"
      mobileRow={(m) => <MobileRow m={m} />}
    />
  );
}
