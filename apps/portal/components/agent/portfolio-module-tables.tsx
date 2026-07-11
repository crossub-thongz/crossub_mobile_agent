'use client';

import { useMemo } from 'react';

import {
  ModuleListTable,
  ModuleSortableTableHead,
  ModuleTableChevronCell,
  ModuleTableHead,
  ModuleTableLinkCell,
} from '@/components/agent/module-list-table';
import { StatusBadge } from '@/components/agent/status-badge';
import {
  accountingArrearsProgress,
  inspectionWorkflowProgress,
  leasingLifecycleProgress,
  leasingOnboardingProgress,
  maintenanceWorkflowProgress,
  rentReviewWorkflowProgress,
  tribunalWorkflowProgress,
} from '@/lib/case-workflows';
import {
  applySortDirection,
  compareNumbers,
  compareSortTime,
  compareStrings,
  useClientTableSort,
} from '@/lib/client-table-sort';
import {
  inspectionDetail,
  maintenanceDetail,
  propertyDetail,
  tenantSelectionDetail,
  tribunalDetail,
} from '@/constants/routes';
import {
  inspectionCreatedAtIso,
  leasingCycleCreatedAtIso,
  leasingRecordCreatedAtIso,
  maintenanceCreatedAtIso,
  rentReviewCreatedAtIso,
  tenantSelectionCreatedAtIso,
} from '@/lib/record-created-at';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  PropertyAccounting,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
} from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { cn, formatCurrency, formatDate, formatDateTime, formatScheduledAt } from '@/lib/utils';

function capitalize(value: string): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCreatedAt(value?: string): string {
  return value ? formatDateTime(value) : '—';
}

function rentReviewLeaseLabel(review: RentReviewCase): string {
  if (review.leaseType === 'periodic') return 'Periodic';
  if (review.fixedTermWeeks) return `Fixed · ${review.fixedTermWeeks} wks`;
  return 'Fixed';
}

type MaintenanceSortKey =
  | 'id'
  | 'createdAt'
  | 'subject'
  | 'address'
  | 'status'
  | 'responsibility'
  | 'priority';

export function MaintenanceListTable({ items }: { items: MaintenanceRequest[] }) {
  const { sortKey, sortDirection, onSort } = useClientTableSort<MaintenanceSortKey>(
    'createdAt',
    'desc',
  );

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'id':
          cmp = compareStrings(a.trackingNumber, b.trackingNumber);
          break;
        case 'createdAt':
          cmp = compareSortTime(
            maintenanceCreatedAtIso(a),
            maintenanceCreatedAtIso(b),
          );
          break;
        case 'subject':
          cmp = compareStrings(a.title, b.title);
          break;
        case 'address':
          cmp = compareStrings(a.propertyAddress, b.propertyAddress);
          break;
        case 'status':
          cmp = compareStrings(maintenanceWorkflowProgress(a).currentStepLabel, maintenanceWorkflowProgress(b).currentStepLabel);
          break;
        case 'responsibility':
          cmp = compareStrings(a.responsibility, b.responsibility);
          break;
        case 'priority':
          cmp = compareStrings(a.priority, b.priority);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return rows;
  }, [items, sortDirection, sortKey]);

  return (
    <ModuleListTable minWidth={1080}>
      <ModuleSortableTableHead
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
        columns={[
          { kind: 'sortable', label: 'ID', sortKey: 'id' },
          { kind: 'sortable', label: 'Date created', sortKey: 'createdAt', defaultDirection: 'desc' },
          { kind: 'sortable', label: 'Subject', sortKey: 'subject' },
          { kind: 'sortable', label: 'Address', sortKey: 'address' },
          { kind: 'sortable', label: 'Status', sortKey: 'status' },
          { kind: 'sortable', label: 'Responsibility', sortKey: 'responsibility' },
          { kind: 'sortable', label: 'Priority', sortKey: 'priority' },
          { kind: 'static', label: '' },
        ]}
      />
      <tbody className="divide-y">
        {sorted.map((m) => {
          const href = maintenanceDetail(m.id);
          const progress = maintenanceWorkflowProgress(m);
          return (
            <tr
              key={m.id}
              className={cn(
                'transition-colors hover:bg-muted/20',
                m.requiresApproval && 'bg-destructive/[0.03]',
              )}
            >
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {m.trackingNumber}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {formatCreatedAt(maintenanceCreatedAtIso(m))}
              </td>
              <ModuleTableLinkCell href={href} className="max-w-[12rem]">
                <span className="line-clamp-2">{m.title}</span>
              </ModuleTableLinkCell>
              <td className="max-w-[14rem] px-3 py-3 text-muted-foreground">
                <span className="line-clamp-2">{m.propertyAddress}</span>
              </td>
              <td className="px-3 py-3 text-xs font-medium text-primary">{progress.currentStepLabel}</td>
              <td className="px-3 py-3 text-xs text-muted-foreground">{capitalize(m.responsibility)}</td>
              <td className="px-3 py-3">
                <span
                  className={cn(
                    'text-xs font-semibold uppercase',
                    m.priority === 'urgent' ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {m.priority}
                </span>
              </td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

type RentReviewSortKey =
  | 'id'
  | 'property'
  | 'tenant'
  | 'lease'
  | 'createdAt'
  | 'due'
  | 'currentRent'
  | 'stage';

export function RentReviewListTable({
  items,
  detailHref,
}: {
  items: RentReviewCase[];
  detailHref: (id: string) => string;
}) {
  const { sortKey, sortDirection, onSort } = useClientTableSort<RentReviewSortKey>(
    'createdAt',
    'desc',
  );

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'id':
          cmp = compareStrings(workflowCaseReferenceLabel(a.id, 'rent_review'), workflowCaseReferenceLabel(b.id, 'rent_review'));
          break;
        case 'property':
          cmp = compareStrings(a.propertyAddress, b.propertyAddress);
          break;
        case 'tenant':
          cmp = compareStrings(a.tenantName ?? '', b.tenantName ?? '');
          break;
        case 'lease':
          cmp = compareStrings(rentReviewLeaseLabel(a), rentReviewLeaseLabel(b));
          break;
        case 'createdAt':
          cmp = compareSortTime(rentReviewCreatedAtIso(a), rentReviewCreatedAtIso(b));
          break;
        case 'due':
          cmp = compareSortTime(a.reviewDue, b.reviewDue);
          break;
        case 'currentRent':
          cmp = compareNumbers(a.currentRent, b.currentRent);
          break;
        case 'stage':
          cmp = compareStrings(rentReviewWorkflowProgress(a).currentStepLabel, rentReviewWorkflowProgress(b).currentStepLabel);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return rows;
  }, [items, sortDirection, sortKey]);

  return (
    <ModuleListTable minWidth={1160}>
      <ModuleSortableTableHead
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
        columns={[
          { kind: 'sortable', label: 'ID', sortKey: 'id' },
          { kind: 'sortable', label: 'Property', sortKey: 'property' },
          { kind: 'sortable', label: 'Tenant', sortKey: 'tenant' },
          { kind: 'sortable', label: 'Lease', sortKey: 'lease' },
          { kind: 'sortable', label: 'Date created', sortKey: 'createdAt', defaultDirection: 'desc' },
          { kind: 'sortable', label: 'Due', sortKey: 'due', defaultDirection: 'asc' },
          { kind: 'sortable', label: 'Current rent', sortKey: 'currentRent' },
          { kind: 'sortable', label: 'Stage', sortKey: 'stage' },
          { kind: 'static', label: '' },
        ]}
      />
      <tbody className="divide-y">
        {sorted.map((r) => {
          const href = detailHref(r.id);
          const progress = rentReviewWorkflowProgress(r);
          return (
            <tr
              key={r.id}
              className={cn(
                'transition-colors hover:bg-muted/20',
                r.requiresApproval && 'bg-destructive/[0.03]',
              )}
            >
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {workflowCaseReferenceLabel(r.id, 'rent_review')}
              </td>
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{r.propertyAddress}</span>
              </ModuleTableLinkCell>
              <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                <span className="line-clamp-2">{r.tenantName ?? '—'}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                {rentReviewLeaseLabel(r)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {formatCreatedAt(rentReviewCreatedAtIso(r))}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                {formatDate(r.reviewDue)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums">
                {formatCurrency(r.currentRent)}/wk
              </td>
              <td className="px-3 py-3 text-xs font-medium text-primary">{progress.currentStepLabel}</td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

export function TribunalListTable({ items }: { items: TribunalCase[] }) {
  return (
    <ModuleListTable minWidth={960}>
      <ModuleTableHead
        columns={['Case', 'Type', 'Property / tenant', 'Claimed', 'Hearing', 'Status', '']}
      />
      <tbody className="divide-y">
        {items.map((c) => {
          const href = tribunalDetail(c.id);
          const progress = tribunalWorkflowProgress(c);
          return (
            <tr
              key={c.id}
              className={cn(
                'transition-colors hover:bg-muted/20',
                c.requiresAction && c.status === 'active' && 'bg-destructive/[0.03]',
              )}
            >
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {c.caseNumber ?? workflowCaseReferenceLabel(c.id, 'tribunal')}
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">{c.tribunalType ?? '—'}</td>
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{c.propertyAddress}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">{c.tenantName}</span>
              </ModuleTableLinkCell>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {c.amountClaimed != null ? formatCurrency(c.amountClaimed) : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {c.hearingDate ? formatDateTime(c.hearingDate) : '—'}
              </td>
              <td className="px-3 py-3 text-xs font-medium text-primary">{progress.currentStepLabel}</td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

type InspectionSortKey =
  | 'ref'
  | 'property'
  | 'type'
  | 'inspector'
  | 'createdAt'
  | 'scheduled'
  | 'stage';

export function InspectionsListTable({ items }: { items: Inspection[] }) {
  const { sortKey, sortDirection, onSort } = useClientTableSort<InspectionSortKey>(
    'createdAt',
    'desc',
  );

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'ref':
          cmp = compareStrings(a.trackingNumber, b.trackingNumber);
          break;
        case 'property':
          cmp = compareStrings(a.propertyAddress, b.propertyAddress);
          break;
        case 'type':
          cmp = compareStrings(a.type, b.type);
          break;
        case 'inspector':
          cmp = compareStrings(a.inspector ?? '', b.inspector ?? '');
          break;
        case 'createdAt':
          cmp = compareSortTime(inspectionCreatedAtIso(a), inspectionCreatedAtIso(b));
          break;
        case 'scheduled':
          cmp = compareSortTime(a.scheduledAt, b.scheduledAt);
          break;
        case 'stage':
          cmp = compareStrings(inspectionWorkflowProgress(a).currentStepLabel, inspectionWorkflowProgress(b).currentStepLabel);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return rows;
  }, [items, sortDirection, sortKey]);

  return (
    <ModuleListTable minWidth={1040}>
      <ModuleSortableTableHead
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
        columns={[
          { kind: 'sortable', label: 'Ref', sortKey: 'ref' },
          { kind: 'sortable', label: 'Property', sortKey: 'property' },
          { kind: 'sortable', label: 'Type', sortKey: 'type' },
          { kind: 'sortable', label: 'Inspector', sortKey: 'inspector' },
          { kind: 'sortable', label: 'Date created', sortKey: 'createdAt', defaultDirection: 'desc' },
          { kind: 'sortable', label: 'Scheduled', sortKey: 'scheduled', defaultDirection: 'desc' },
          { kind: 'sortable', label: 'Stage', sortKey: 'stage' },
          { kind: 'static', label: '' },
        ]}
      />
      <tbody className="divide-y">
        {sorted.map((i) => {
          const href = inspectionDetail(i.id);
          const progress = inspectionWorkflowProgress(i);
          return (
            <tr key={i.id} className="transition-colors hover:bg-muted/20">
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {i.trackingNumber}
              </td>
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{i.propertyAddress}</span>
              </ModuleTableLinkCell>
              <td className="px-3 py-3 text-xs font-medium">{i.type}</td>
              <td className="max-w-[9rem] px-3 py-3 text-xs text-muted-foreground">
                <span className="line-clamp-2">{i.inspector ?? 'Pending'}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {formatCreatedAt(inspectionCreatedAtIso(i))}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {formatScheduledAt(i.scheduledAt)}
              </td>
              <td className="px-3 py-3 text-xs font-medium text-primary">{progress.currentStepLabel}</td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

export function AccountingListTable({ items }: { items: PropertyAccounting[] }) {
  return (
    <ModuleListTable minWidth={1000}>
      <ModuleTableHead
        columns={['Property', 'Tenant', 'Paid YTD', 'Outstanding', 'Balance', 'Arrears', '']}
      />
      <tbody className="divide-y">
        {items.map((a) => {
          const href = `${propertyDetail(a.propertyId)}?tab=Accounting`;
          const arrearsLabel =
            a.arrearsAmount > 0
              ? `${formatCurrency(a.arrearsAmount)} (${a.daysInArrears}d)`
              : 'None';
          const progress = accountingArrearsProgress(a);
          return (
            <tr
              key={a.propertyId}
              className={cn(
                'transition-colors hover:bg-muted/20',
                a.arrearsAmount > 0 && 'bg-destructive/[0.03]',
              )}
            >
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{a.propertyAddress}</span>
              </ModuleTableLinkCell>
              <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                <span className="line-clamp-2">{a.tenantName}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatCurrency(a.rentPaidYtd)}</td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(a.rentOutstanding)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(a.currentBalance)}
              </td>
              <td className="px-3 py-3">
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    a.arrearsAmount > 0 ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {arrearsLabel}
                </span>
                {a.arrearsAmount > 0 ? (
                  <p className="text-primary mt-0.5 text-[11px]">{progress.currentStepLabel}</p>
                ) : null}
              </td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

type LeasingCycleSortKey =
  | 'property'
  | 'lifecycle'
  | 'onboarding'
  | 'rent'
  | 'createdAt'
  | 'available';

export function LeasingCyclesTable({ items }: { items: LeasingCycle[] }) {
  const { sortKey, sortDirection, onSort } = useClientTableSort<LeasingCycleSortKey>(
    'createdAt',
    'desc',
  );

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'property':
          cmp = compareStrings(a.propertyAddress, b.propertyAddress);
          break;
        case 'lifecycle':
          cmp = compareStrings(leasingLifecycleProgress(a).currentStepLabel, leasingLifecycleProgress(b).currentStepLabel);
          break;
        case 'onboarding':
          cmp = compareStrings(leasingOnboardingProgress(a)?.currentStepLabel ?? '', leasingOnboardingProgress(b)?.currentStepLabel ?? '');
          break;
        case 'rent':
          cmp = compareNumbers(a.rentPerWeek ?? 0, b.rentPerWeek ?? 0);
          break;
        case 'createdAt':
          cmp = compareSortTime(leasingCycleCreatedAtIso(a), leasingCycleCreatedAtIso(b));
          break;
        case 'available':
          cmp = compareSortTime(a.availableFrom, b.availableFrom);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return rows;
  }, [items, sortDirection, sortKey]);

  return (
    <ModuleListTable minWidth={980}>
      <ModuleSortableTableHead
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
        columns={[
          { kind: 'sortable', label: 'Property', sortKey: 'property' },
          { kind: 'sortable', label: 'Lifecycle stage', sortKey: 'lifecycle' },
          { kind: 'sortable', label: 'Onboarding', sortKey: 'onboarding' },
          { kind: 'sortable', label: 'Rent/wk', sortKey: 'rent' },
          { kind: 'sortable', label: 'Date created', sortKey: 'createdAt', defaultDirection: 'desc' },
          { kind: 'sortable', label: 'Available', sortKey: 'available', defaultDirection: 'asc' },
          { kind: 'static', label: '' },
        ]}
      />
      <tbody className="divide-y">
        {sorted.map((cycle) => {
          const href = propertyDetail(cycle.propertyId);
          const lifecycle = leasingLifecycleProgress(cycle);
          const onboarding = leasingOnboardingProgress(cycle);
          return (
            <tr key={cycle.id} className="transition-colors hover:bg-muted/20">
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{cycle.propertyAddress}</span>
              </ModuleTableLinkCell>
              <td className="px-3 py-3 text-xs font-medium text-primary">
                {lifecycle.currentStepLabel}
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {onboarding?.currentStepLabel ?? '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {cycle.rentPerWeek != null ? `${formatCurrency(cycle.rentPerWeek)}/wk` : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {formatCreatedAt(leasingCycleCreatedAtIso(cycle))}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {cycle.availableFrom ? formatDateTime(cycle.availableFrom) : '—'}
              </td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

type TenantSelectionSortKey =
  | 'property'
  | 'applicant'
  | 'rent'
  | 'term'
  | 'createdAt'
  | 'status';

export function TenantSelectionsTable({ items }: { items: TenantSelectionCase[] }) {
  const { sortKey, sortDirection, onSort } = useClientTableSort<TenantSelectionSortKey>(
    'createdAt',
    'desc',
  );

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'property':
          cmp = compareStrings(a.propertyAddress, b.propertyAddress);
          break;
        case 'applicant':
          cmp = compareStrings(a.applicantName, b.applicantName);
          break;
        case 'rent':
          cmp = compareNumbers(a.proposedRent, b.proposedRent);
          break;
        case 'term':
          cmp = compareStrings(a.leaseTerm, b.leaseTerm);
          break;
        case 'createdAt':
          cmp = compareSortTime(tenantSelectionCreatedAtIso(a), tenantSelectionCreatedAtIso(b));
          break;
        case 'status':
          cmp = compareStrings(a.status, b.status);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return rows;
  }, [items, sortDirection, sortKey]);

  return (
    <ModuleListTable minWidth={980}>
      <ModuleSortableTableHead
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
        columns={[
          { kind: 'sortable', label: 'Property', sortKey: 'property' },
          { kind: 'sortable', label: 'Applicant', sortKey: 'applicant' },
          { kind: 'sortable', label: 'Rent', sortKey: 'rent' },
          { kind: 'sortable', label: 'Term', sortKey: 'term' },
          { kind: 'sortable', label: 'Date created', sortKey: 'createdAt', defaultDirection: 'desc' },
          { kind: 'sortable', label: 'Status', sortKey: 'status' },
          { kind: 'static', label: '' },
        ]}
      />
      <tbody className="divide-y">
        {sorted.map((t) => {
          const href = tenantSelectionDetail(t.id);
          return (
            <tr
              key={t.id}
              className={cn(
                'transition-colors hover:bg-muted/20',
                t.requiresApproval && 'bg-destructive/[0.03]',
              )}
            >
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{t.propertyAddress}</span>
              </ModuleTableLinkCell>
              <td className="max-w-[10rem] px-3 py-3">
                <span className="line-clamp-2">{t.applicantName}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(t.proposedRent)}/wk
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">{t.leaseTerm}</td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {formatCreatedAt(tenantSelectionCreatedAtIso(t))}
              </td>
              <td className="px-3 py-3">
                {t.requiresApproval ? (
                  <StatusBadge label="Action required" variant="approval" />
                ) : (
                  <span className="text-primary text-xs font-medium">{t.status}</span>
                )}
              </td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

type LeasingHistorySortKey =
  | 'property'
  | 'tenant'
  | 'createdAt'
  | 'leasePeriod'
  | 'rent'
  | 'status';

export function LeasingHistoryTable({
  items,
}: {
  items: (LeasingRecord & { address: string })[];
}) {
  const { sortKey, sortDirection, onSort } = useClientTableSort<LeasingHistorySortKey>(
    'createdAt',
    'desc',
  );

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'property':
          cmp = compareStrings(a.address, b.address);
          break;
        case 'tenant':
          cmp = compareStrings(a.approvedTenant, b.approvedTenant);
          break;
        case 'createdAt':
          cmp = compareSortTime(leasingRecordCreatedAtIso(a), leasingRecordCreatedAtIso(b));
          break;
        case 'leasePeriod':
          cmp = compareSortTime(a.leaseStart, b.leaseStart);
          break;
        case 'rent':
          cmp = compareNumbers(a.rentWeekly, b.rentWeekly);
          break;
        case 'status':
          cmp = compareStrings(a.status, b.status);
          break;
      }
      return applySortDirection(cmp, sortDirection);
    });
    return rows;
  }, [items, sortDirection, sortKey]);

  return (
    <ModuleListTable minWidth={980}>
      <ModuleSortableTableHead
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
        columns={[
          { kind: 'sortable', label: 'Property', sortKey: 'property' },
          { kind: 'sortable', label: 'Tenant', sortKey: 'tenant' },
          { kind: 'sortable', label: 'Date created', sortKey: 'createdAt', defaultDirection: 'desc' },
          { kind: 'sortable', label: 'Lease period', sortKey: 'leasePeriod', defaultDirection: 'desc' },
          { kind: 'sortable', label: 'Rent', sortKey: 'rent' },
          { kind: 'sortable', label: 'Status', sortKey: 'status' },
          { kind: 'static', label: '' },
        ]}
      />
      <tbody className="divide-y">
        {sorted.map((l) => {
          const href = `${propertyDetail(l.propertyId)}?tab=Leasing`;
          return (
            <tr key={l.id} className="transition-colors hover:bg-muted/20">
              <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                <span className="line-clamp-2">{l.address}</span>
              </ModuleTableLinkCell>
              <td className="max-w-[10rem] px-3 py-3">
                <span className="line-clamp-2">{l.approvedTenant}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {formatCreatedAt(leasingRecordCreatedAtIso(l))}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {formatDate(l.leaseStart)} – {formatDate(l.leaseEnd)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(l.rentWeekly)}/wk
              </td>
              <td className="px-3 py-3 text-xs capitalize text-muted-foreground">{l.status}</td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}
