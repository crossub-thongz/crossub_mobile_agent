'use client';

import { useMemo } from 'react';
import { AlertTriangle, CalendarDays, ChevronRight, Trash2 } from 'lucide-react';

import {
  MODULE_TABLE_COLUMN_WIDTHS,
  ModuleInteractiveTableRow,
  ModuleListTable,
  ModuleMobileCardShell,
  ModuleSortableTableHead,
  ModuleTableChevronCell,
  ModuleTableHead,
  ModuleTableLinkCell,
  ModuleTableTruncateText,
  moduleTableCellClassName,
} from '@/components/agent/module-list-table';
import {
  isTenantRejectedMaintenance,
  TENANT_REJECTED_BADGE_CLASS,
  TENANT_REJECTED_LABEL,
  TENANT_REJECTED_ROW_CLASS,
  tenantRejectionTitle,
} from '@/lib/maintenance/tenant-rejected';
import { WorkflowCaseListSeeder } from '@/components/agent/workflow-case-list-seeder';
import { StatusBadge } from '@/components/agent/status-badge';
import { Button } from '@/components/ui/button';
import {
  accountingArrearsProgress,
  inspectionWorkflowProgress,
  leasingLifecycleProgress,
  leasingOnboardingProgress,
  maintenanceWorkflowProgress,
  rentReviewWorkflowProgress,
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
import {
  tribunalCaseHasArrears,
  tribunalPrimaryDaysOverdue,
  tribunalStatusBadgeVariant,
  tribunalStatusLabel,
  tribunalTypeLabel,
} from '@/lib/tribunal-labels';
import {
  cn,
  daysUntilDate,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatScheduledAt,
} from '@/lib/utils';

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

export function MaintenanceListTable({
  items,
  onItemClick,
  selectedId,
}: {
  items: MaintenanceRequest[];
  onItemClick?: (item: MaintenanceRequest) => void;
  selectedId?: string | null;
}) {
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
    <>
      <WorkflowCaseListSeeder module="maintenance" caseIds={items.map((m) => m.id)} />
      {/* Mobile: stacked cards — table is too wide for phones */}
      <div className="space-y-2 md:hidden">
        {sorted.map((m) => {
          const href = maintenanceDetail(m.id);
          const progress = maintenanceWorkflowProgress(m);
          const openItem = onItemClick ? () => onItemClick(m) : undefined;
          const selected = selectedId === m.id;
          const tenantRejected = isTenantRejectedMaintenance(m);
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {m.propertyAddress}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-muted-foreground tabular-nums">{m.trackingNumber}</span>
                {tenantRejected ? (
                  <span className={TENANT_REJECTED_BADGE_CLASS} title={tenantRejectionTitle(m)}>
                    {TENANT_REJECTED_LABEL}
                  </span>
                ) : (
                  <span className="text-primary font-medium">{progress.currentStepLabel}</span>
                )}
                <span
                  className={cn(
                    'font-semibold uppercase',
                    m.priority === 'urgent' ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {m.priority}
                </span>
                <span className="text-muted-foreground">
                  {formatCreatedAt(maintenanceCreatedAtIso(m))}
                </span>
              </div>
            </>
          );
          const className = cn(
            'block rounded-xl border bg-card p-3 shadow-sm transition active:scale-[0.99]',
            m.requiresApproval && 'border-destructive/30 bg-destructive/[0.03]',
            tenantRejected && !m.requiresApproval && TENANT_REJECTED_ROW_CLASS,
            selected && 'border-primary ring-primary/20 ring-2',
          );
          if (openItem) {
            return (
              <button
                key={m.id}
                type="button"
                onClick={openItem}
                className={cn(className, 'w-full text-left')}
              >
                {body}
              </button>
            );
          }
          return (
            <a key={m.id} href={href} className={className}>
              {body}
            </a>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable columnWidths={MODULE_TABLE_COLUMN_WIDTHS.maintenance}>
          <ModuleSortableTableHead
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
            columns={[
              { kind: 'sortable', label: 'ID', sortKey: 'id' },
              {
                kind: 'sortable',
                label: 'Date created',
                sortKey: 'createdAt',
                defaultDirection: 'desc',
              },
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
              const interactive = Boolean(onItemClick);
              const openItem = onItemClick ? () => onItemClick(m) : undefined;
              const tenantRejected = isTenantRejectedMaintenance(m);
              return (
                <ModuleInteractiveTableRow
                  key={m.id}
                  onActivate={openItem}
                  selected={selectedId === m.id}
                  newCaseModule="maintenance"
                  newCaseId={m.id}
                  className={cn(
                    m.requiresApproval && 'bg-destructive/[0.03]',
                    // Ranked below needs-approval: that is live work, this is a finished case an
                    // officer may still have to answer for.
                    tenantRejected && !m.requiresApproval && TENANT_REJECTED_ROW_CLASS,
                  )}
                >
                  <td className={moduleTableCellClassName('text-muted-foreground text-xs tabular-nums')}>
                    <ModuleTableTruncateText>{m.trackingNumber}</ModuleTableTruncateText>
                  </td>
                  <td
                    className={moduleTableCellClassName(
                      'text-muted-foreground text-xs tabular-nums',
                    )}
                  >
                    <ModuleTableTruncateText>{formatCreatedAt(maintenanceCreatedAtIso(m))}</ModuleTableTruncateText>
                  </td>
                  {interactive ? (
                    <td className={moduleTableCellClassName('font-medium')}>
                      <ModuleTableTruncateText lines={2}>{m.title}</ModuleTableTruncateText>
                    </td>
                  ) : (
                    <ModuleTableLinkCell href={href}>
                      <ModuleTableTruncateText lines={2}>{m.title}</ModuleTableTruncateText>
                    </ModuleTableLinkCell>
                  )}
                  <td className={moduleTableCellClassName('text-muted-foreground')}>
                    <ModuleTableTruncateText lines={2}>{m.propertyAddress}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs font-medium')}>
                    {tenantRejected ? (
                      <span
                        className={TENANT_REJECTED_BADGE_CLASS}
                        title={tenantRejectionTitle(m)}
                      >
                        {TENANT_REJECTED_LABEL}
                      </span>
                    ) : (
                      <ModuleTableTruncateText className="text-primary">
                        {progress.currentStepLabel}
                      </ModuleTableTruncateText>
                    )}
                  </td>
                  <td className={moduleTableCellClassName('text-muted-foreground text-xs')}>
                    <ModuleTableTruncateText>{capitalize(m.responsibility)}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName()}>
                    <ModuleTableTruncateText
                      className={cn(
                        'text-xs font-semibold uppercase',
                        m.priority === 'urgent'
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                      )}
                    >
                      {m.priority}
                    </ModuleTableTruncateText>
                  </td>
                  {interactive ? (
                    <td className="text-muted-foreground px-2 py-2.5 text-right lg:px-3 lg:py-3">
                      <ChevronRight className="inline size-4" />
                    </td>
                  ) : (
                    <ModuleTableChevronCell href={href} />
                  )}
                </ModuleInteractiveTableRow>
              );
            })}
          </tbody>
        </ModuleListTable>
      </div>
    </>
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
  onItemClick,
  selectedId,
}: {
  items: RentReviewCase[];
  detailHref?: (id: string) => string;
  onItemClick?: (item: RentReviewCase) => void;
  selectedId?: string | null;
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
    <>
      <WorkflowCaseListSeeder module="rent_review" caseIds={items.map((r) => r.id)} />
      <div className="space-y-2 md:hidden">
        {sorted.map((r) => {
          const href = detailHref?.(r.id);
          const progress = rentReviewWorkflowProgress(r);
          const openItem = onItemClick ? () => onItemClick(r) : undefined;
          return (
            <ModuleMobileCardShell
              key={r.id}
              onClick={openItem}
              href={openItem ? undefined : href}
              selected={selectedId === r.id}
              highlight={r.requiresApproval}
              newCaseModule="rent_review"
              newCaseId={r.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {workflowCaseReferenceLabel(r.id, 'rent_review')}
                  </p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {r.propertyAddress}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-primary font-medium">{progress.currentStepLabel}</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(r.currentRent)}/wk
                </span>
                <span className="text-muted-foreground tabular-nums">
                  Due {formatDate(r.reviewDue)}
                </span>
                {r.tenantName ? (
                  <span className="text-muted-foreground">{r.tenantName}</span>
                ) : null}
                <span className="text-muted-foreground">
                  {formatCreatedAt(rentReviewCreatedAtIso(r))}
                </span>
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable columnWidths={MODULE_TABLE_COLUMN_WIDTHS.rentReview}>
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
              const href = detailHref?.(r.id);
              const progress = rentReviewWorkflowProgress(r);
              const interactive = Boolean(onItemClick);
              const openItem = onItemClick ? () => onItemClick(r) : undefined;
              return (
                <ModuleInteractiveTableRow
                  key={r.id}
                  onActivate={openItem}
                  selected={selectedId === r.id}
                  newCaseModule="rent_review"
                  newCaseId={r.id}
                  className={cn(r.requiresApproval && 'bg-destructive/[0.03]')}
                >
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                    <ModuleTableTruncateText>
                      {workflowCaseReferenceLabel(r.id, 'rent_review')}
                    </ModuleTableTruncateText>
                  </td>
                  {interactive ? (
                    <td className={moduleTableCellClassName('font-medium')}>
                      <ModuleTableTruncateText lines={2}>{r.propertyAddress}</ModuleTableTruncateText>
                    </td>
                  ) : (
                    <ModuleTableLinkCell href={href!}>
                      <ModuleTableTruncateText lines={2}>{r.propertyAddress}</ModuleTableTruncateText>
                    </ModuleTableLinkCell>
                  )}
                  <td className={moduleTableCellClassName('text-muted-foreground')}>
                    <ModuleTableTruncateText lines={2}>{r.tenantName ?? '—'}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground')}>
                    <ModuleTableTruncateText>{rentReviewLeaseLabel(r)}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                    <ModuleTableTruncateText>
                      {formatCreatedAt(rentReviewCreatedAtIso(r))}
                    </ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs tabular-nums')}>
                    <ModuleTableTruncateText>{formatDate(r.reviewDue)}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('font-medium tabular-nums')}>
                    <ModuleTableTruncateText>{formatCurrency(r.currentRent)}/wk</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs font-medium text-primary')}>
                    <ModuleTableTruncateText>{progress.currentStepLabel}</ModuleTableTruncateText>
                  </td>
                  {interactive ? (
                    <td className="text-muted-foreground px-2 py-2.5 text-right lg:px-3 lg:py-3">
                      <ChevronRight className="inline size-4" />
                    </td>
                  ) : (
                    <ModuleTableChevronCell href={href!} />
                  )}
                </ModuleInteractiveTableRow>
              );
            })}
          </tbody>
        </ModuleListTable>
      </div>
    </>
  );
}

function TribunalTableCountdown({
  days,
  label,
  tone = 'overdue',
}: {
  days: number;
  label: string;
  tone?: 'overdue' | 'upcoming' | 'muted';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        tone === 'overdue' && days > 0 && 'text-rose-600 dark:text-rose-400',
        tone === 'upcoming' && days >= 0 && 'text-amber-700 dark:text-amber-300',
        tone === 'muted' && 'text-muted-foreground',
      )}
    >
      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function TribunalArrearsCell({
  amount,
  daysOverdue,
}: {
  amount?: number | null;
  daysOverdue?: number | null;
}) {
  if (amount == null && daysOverdue == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="tabular-nums font-medium">
        {amount != null ? formatCurrency(amount) : '—'}
      </span>
      {daysOverdue != null ? (
        <TribunalTableCountdown
          days={daysOverdue}
          label={`${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`}
          tone={daysOverdue > 0 ? 'overdue' : 'muted'}
        />
      ) : null}
    </div>
  );
}

function TribunalHearingCell({ hearingDate }: { hearingDate?: string | null }) {
  if (!hearingDate?.trim()) {
    return <span className="text-muted-foreground">—</span>;
  }

  const daysUntil = daysUntilDate(hearingDate);
  let countdownLabel: string | null = null;
  let tone: 'overdue' | 'upcoming' | 'muted' = 'muted';

  if (daysUntil != null) {
    if (daysUntil > 0) {
      countdownLabel = `In ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
      tone = 'upcoming';
    } else if (daysUntil === 0) {
      countdownLabel = 'Today';
      tone = 'upcoming';
    } else {
      countdownLabel = `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`;
      tone = 'muted';
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="tabular-nums font-medium">{formatDate(hearingDate)}</span>
      {countdownLabel ? (
        <TribunalTableCountdown days={daysUntil ?? 0} label={countdownLabel} tone={tone} />
      ) : null}
    </div>
  );
}

function TribunalActionBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
      Action required
    </span>
  );
}

export function TribunalListTable({
  items,
  onItemClick,
  selectedId,
  scope = 'portfolio',
}: {
  items: TribunalCase[];
  onItemClick?: (item: TribunalCase) => void;
  selectedId?: string | null;
  /** Property tab hides the address subline under tenant. */
  scope?: 'property' | 'portfolio';
}) {
  const useArrearsLayout = items.some(tribunalCaseHasArrears);

  if (useArrearsLayout) {
    return (
      <>
        <div className="space-y-2 md:hidden">
          {items.map((c) => {
            const interactive = Boolean(onItemClick);
            const openItem = onItemClick ? () => onItemClick(c) : undefined;
            const href = tribunalDetail(c.id);
            return (
              <ModuleMobileCardShell
                key={c.id}
                onClick={openItem}
                href={interactive ? undefined : href}
                selected={selectedId === c.id}
                highlight={c.requiresAction && c.status === 'active'}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {c.tenantName || 'No tenant'}
                    </p>
                    {scope === 'portfolio' ? (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {c.propertyAddress || '—'}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {tribunalTypeLabel(c.tribunalType)}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Claimed</p>
                    <TribunalArrearsCell
                      amount={c.amountClaimed ?? c.rentArrearsAmount}
                      daysOverdue={tribunalPrimaryDaysOverdue(c)}
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Hearing</p>
                    <TribunalHearingCell hearingDate={c.hearingDate} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TribunalActionBadge show={Boolean(c.requiresAction && c.status === 'active')} />
                  <StatusBadge
                    label={tribunalStatusLabel(c.apiStatus)}
                    variant={tribunalStatusBadgeVariant(c.apiStatus)}
                    className="normal-case"
                  />
                </div>
              </ModuleMobileCardShell>
            );
          })}
        </div>

        <div className="hidden md:block">
          <ModuleListTable>
            <ModuleTableHead
              columns={['Type', 'Tenant', 'Claimed', 'Hearing', 'Status', '']}
            />
            <tbody className="divide-y">
              {items.map((c) => {
                const interactive = Boolean(onItemClick);
                const openItem = onItemClick ? () => onItemClick(c) : undefined;
                return (
                  <ModuleInteractiveTableRow
                    key={c.id}
                    onActivate={openItem}
                    selected={selectedId === c.id}
                    className={cn(
                      c.requiresAction && c.status === 'active' && 'bg-destructive/[0.03]',
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {tribunalTypeLabel(c.tribunalType)}
                    </td>
                    <td className="max-w-[14rem] px-3 py-3 text-sm">
                      <ModuleTableTruncateText lines={2} className="font-medium">
                        {c.tenantName || '—'}
                      </ModuleTableTruncateText>
                      {scope === 'portfolio' ? (
                        <ModuleTableTruncateText
                          lines={2}
                          className="text-muted-foreground mt-0.5 text-xs"
                        >
                          {c.propertyAddress || '—'}
                        </ModuleTableTruncateText>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      <TribunalArrearsCell
                        amount={c.amountClaimed ?? c.rentArrearsAmount}
                        daysOverdue={tribunalPrimaryDaysOverdue(c)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      <TribunalHearingCell hearingDate={c.hearingDate} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <TribunalActionBadge
                          show={Boolean(c.requiresAction && c.status === 'active')}
                        />
                        <StatusBadge
                          label={tribunalStatusLabel(c.apiStatus)}
                          variant={tribunalStatusBadgeVariant(c.apiStatus)}
                          className="normal-case"
                        />
                      </div>
                    </td>
                    {interactive ? (
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        <ChevronRight className="inline size-4" />
                      </td>
                    ) : (
                      <ModuleTableChevronCell href={tribunalDetail(c.id)} />
                    )}
                  </ModuleInteractiveTableRow>
                );
              })}
            </tbody>
          </ModuleListTable>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {items.map((c) => {
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(c) : undefined;
          const href = tribunalDetail(c.id);
          return (
            <ModuleMobileCardShell
              key={c.id}
              onClick={openItem}
              href={interactive ? undefined : href}
              selected={selectedId === c.id}
              highlight={c.requiresAction && c.status === 'active'}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.propertyAddress || '—'}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {c.tenantName || 'No tenant'}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-muted-foreground tabular-nums">
                  {c.caseNumber ?? workflowCaseReferenceLabel(c.id, 'tribunal')}
                </span>
                <span className="text-muted-foreground">
                  {c.createdAt ? formatDate(c.createdAt) : '—'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground mb-0.5">Rent</p>
                  <TribunalArrearsCell
                    amount={c.rentArrearsAmount}
                    daysOverdue={c.rentArrearsDaysOverdue}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Bills</p>
                  <TribunalArrearsCell
                    amount={c.billArrearsAmount}
                    daysOverdue={c.billArrearsDaysOverdue}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Bond</p>
                  <TribunalArrearsCell
                    amount={c.bondArrearsAmount}
                    daysOverdue={c.bondArrearsDaysOverdue}
                  />
                </div>
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable>
      <ModuleTableHead
        columns={[
          'Order Number',
          'Created Date',
          'Property Address',
          'Tenant',
          'Rent Arrears',
          'Bill Arrears',
          'Bond Arrears',
          '',
        ]}
      />
      <tbody className="divide-y">
        {items.map((c) => {
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(c) : undefined;
          return (
            <ModuleInteractiveTableRow
              key={c.id}
              onActivate={openItem}
              selected={selectedId === c.id}
              className={cn(
                c.requiresAction && c.status === 'active' && 'bg-destructive/[0.03]',
              )}
            >
              <td className="whitespace-nowrap px-3 py-3 text-xs font-medium tabular-nums">
                {c.caseNumber ?? workflowCaseReferenceLabel(c.id, 'tribunal')}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {c.createdAt ? formatDate(c.createdAt) : '—'}
              </td>
              <td className="max-w-[14rem] px-3 py-3 text-sm font-medium">
                <ModuleTableTruncateText lines={2}>{c.propertyAddress || '—'}</ModuleTableTruncateText>
              </td>
              <td className="max-w-[10rem] px-3 py-3 text-sm">
                <ModuleTableTruncateText lines={2}>{c.tenantName || '—'}</ModuleTableTruncateText>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-sm">
                <TribunalArrearsCell
                  amount={c.rentArrearsAmount}
                  daysOverdue={c.rentArrearsDaysOverdue}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-sm">
                <TribunalArrearsCell
                  amount={c.billArrearsAmount}
                  daysOverdue={c.billArrearsDaysOverdue}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-sm">
                <TribunalArrearsCell
                  amount={c.bondArrearsAmount}
                  daysOverdue={c.bondArrearsDaysOverdue}
                />
              </td>
              {interactive ? (
                <td className="px-3 py-3 text-right text-muted-foreground">
                  <ChevronRight className="inline size-4" />
                </td>
              ) : (
                <ModuleTableChevronCell href={tribunalDetail(c.id)} />
              )}
            </ModuleInteractiveTableRow>
          );
        })}
      </tbody>
    </ModuleListTable>
      </div>
    </>
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

export function InspectionsListTable({
  items,
  canDeleteRow,
  onDeleteRow,
  onItemClick,
  selectedId,
}: {
  items: Inspection[];
  canDeleteRow?: (inspection: Inspection) => boolean;
  onDeleteRow?: (inspection: Inspection) => void;
  onItemClick?: (inspection: Inspection) => void;
  selectedId?: string | null;
}) {
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

  const showDelete = Boolean(onDeleteRow && canDeleteRow);

  return (
    <>
      <WorkflowCaseListSeeder module="inspection" caseIds={items.map((i) => i.id)} />
      <div className="space-y-2 md:hidden">
        {sorted.map((i) => {
          const href = inspectionDetail(i.id);
          const progress = inspectionWorkflowProgress(i);
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(i) : undefined;
          return (
            <div key={i.id} className="relative">
              <ModuleMobileCardShell
                onClick={openItem}
                href={interactive ? undefined : href}
                selected={selectedId === i.id}
                newCaseModule="inspection"
                newCaseId={i.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 pr-8">
                    <p className="truncate text-sm font-semibold" title={i.propertyAddress}>
                      {i.propertyAddress}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {i.type} · {i.inspector ?? 'Pending'}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-muted-foreground tabular-nums">{i.trackingNumber}</span>
                  <span className="text-primary font-medium">{progress.currentStepLabel}</span>
                  <span className="text-muted-foreground">
                    {formatScheduledAt(i.scheduledAt)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatCreatedAt(inspectionCreatedAtIso(i))}
                  </span>
                </div>
              </ModuleMobileCardShell>
              {showDelete && canDeleteRow?.(i) ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive absolute top-2 right-2 size-8"
                  aria-label={`Delete ${i.trackingNumber}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteRow?.(i);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable
          columnWidths={
            showDelete
              ? MODULE_TABLE_COLUMN_WIDTHS.inspectionsWithDelete
              : MODULE_TABLE_COLUMN_WIDTHS.inspections
          }
        >
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
          ...(showDelete ? [{ kind: 'static' as const, label: '' }] : []),
          { kind: 'static', label: '' },
        ]}
      />
      <tbody className="divide-y">
        {sorted.map((i) => {
          const href = inspectionDetail(i.id);
          const progress = inspectionWorkflowProgress(i);
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(i) : undefined;
          return (
            <ModuleInteractiveTableRow
              key={i.id}
              onActivate={openItem}
              selected={selectedId === i.id}
              newCaseModule="inspection"
              newCaseId={i.id}
            >
              <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                <ModuleTableTruncateText>{i.trackingNumber}</ModuleTableTruncateText>
              </td>
              {interactive ? (
                <td className={moduleTableCellClassName('font-medium')}>
                  <ModuleTableTruncateText lines={2}>{i.propertyAddress}</ModuleTableTruncateText>
                </td>
              ) : (
                <ModuleTableLinkCell href={href}>
                  <ModuleTableTruncateText lines={2}>{i.propertyAddress}</ModuleTableTruncateText>
                </ModuleTableLinkCell>
              )}
              <td className={moduleTableCellClassName('text-xs font-medium')}>
                <ModuleTableTruncateText>{i.type}</ModuleTableTruncateText>
              </td>
              <td className={moduleTableCellClassName('text-xs text-muted-foreground')}>
                <ModuleTableTruncateText lines={2}>{i.inspector ?? 'Pending'}</ModuleTableTruncateText>
              </td>
              <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                <ModuleTableTruncateText>
                  {formatCreatedAt(inspectionCreatedAtIso(i))}
                </ModuleTableTruncateText>
              </td>
              <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                <ModuleTableTruncateText>{formatScheduledAt(i.scheduledAt)}</ModuleTableTruncateText>
              </td>
              <td className={moduleTableCellClassName('text-xs font-medium text-primary')}>
                <ModuleTableTruncateText>{progress.currentStepLabel}</ModuleTableTruncateText>
              </td>
              {showDelete && (
                <td className="px-1 py-2.5 text-right lg:px-2 lg:py-3">
                  {canDeleteRow?.(i) ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive size-8"
                      aria-label={`Delete ${i.trackingNumber}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteRow?.(i);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              )}
              {interactive ? (
                <td className="text-muted-foreground px-2 py-2.5 text-right lg:px-3 lg:py-3">
                  <ChevronRight className="inline size-4" />
                </td>
              ) : (
                <ModuleTableChevronCell href={href} />
              )}
            </ModuleInteractiveTableRow>
          );
        })}
      </tbody>
    </ModuleListTable>
      </div>
    </>
  );
}

export function AccountingListTable({
  items,
  onItemClick,
  selectedId,
}: {
  items: PropertyAccounting[];
  onItemClick?: (item: PropertyAccounting) => void;
  selectedId?: string | null;
}) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {items.map((a) => {
          const href = `${propertyDetail(a.propertyId)}?tab=Accounting`;
          const arrearsLabel =
            a.arrearsAmount > 0
              ? `${formatCurrency(a.arrearsAmount)} (${a.daysInArrears}d)`
              : 'None';
          const progress = accountingArrearsProgress(a);
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(a) : undefined;
          const rowId = `arrears-${a.propertyId}`;
          return (
            <ModuleMobileCardShell
              key={a.propertyId}
              onClick={openItem}
              href={interactive ? undefined : href}
              selected={selectedId === rowId}
              highlight={a.arrearsAmount > 0}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.propertyAddress}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{a.tenantName}</p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-muted-foreground">
                  Paid {formatCurrency(a.rentPaidYtd)}
                </span>
                <span className="text-muted-foreground">
                  Out {formatCurrency(a.rentOutstanding)}
                </span>
                <span className="font-medium tabular-nums">
                  Bal {formatCurrency(a.currentBalance)}
                </span>
              </div>
              <div className="mt-1.5 text-[11px]">
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    a.arrearsAmount > 0 ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  Arrears: {arrearsLabel}
                </span>
                {a.arrearsAmount > 0 ? (
                  <span className="text-primary ml-2">{progress.currentStepLabel}</span>
                ) : null}
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable>
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
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(a) : undefined;
          const rowId = `arrears-${a.propertyId}`;
          return (
            <ModuleInteractiveTableRow
              key={a.propertyId}
              onActivate={openItem}
              selected={selectedId === rowId}
              className={cn(a.arrearsAmount > 0 && 'bg-destructive/[0.03]')}
            >
              {interactive ? (
                <td className="max-w-[14rem] px-3 py-3 font-medium">
                  <ModuleTableTruncateText lines={2}>{a.propertyAddress}</ModuleTableTruncateText>
                </td>
              ) : (
                <ModuleTableLinkCell href={href} className="max-w-[14rem]">
                  <ModuleTableTruncateText lines={2}>{a.propertyAddress}</ModuleTableTruncateText>
                </ModuleTableLinkCell>
              )}
              <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                <ModuleTableTruncateText lines={2}>{a.tenantName}</ModuleTableTruncateText>
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatCurrency(a.rentPaidYtd)}</td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(a.rentOutstanding)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                {formatCurrency(a.currentBalance)}
              </td>
              <td className="px-3 py-3">
                <ModuleTableTruncateText
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    a.arrearsAmount > 0 ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {arrearsLabel}
                </ModuleTableTruncateText>
                {a.arrearsAmount > 0 ? (
                  <ModuleTableTruncateText className="text-primary mt-0.5 text-[11px]">
                    {progress.currentStepLabel}
                  </ModuleTableTruncateText>
                ) : null}
              </td>
              {interactive ? (
                <td className="px-3 py-3 text-right text-muted-foreground">
                  <ChevronRight className="inline size-4" />
                </td>
              ) : (
                <ModuleTableChevronCell href={href} />
              )}
            </ModuleInteractiveTableRow>
          );
        })}
      </tbody>
    </ModuleListTable>
      </div>
    </>
  );
}

type LeasingCycleSortKey =
  | 'property'
  | 'lifecycle'
  | 'onboarding'
  | 'rent'
  | 'createdAt'
  | 'available';

export function LeasingCyclesTable({
  items,
  hidePropertyColumn = false,
  onCycleClick,
  selectedCycleId,
}: {
  items: LeasingCycle[];
  hidePropertyColumn?: boolean;
  onCycleClick?: (cycle: LeasingCycle) => void;
  selectedCycleId?: string | null;
}) {
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
          cmp = hidePropertyColumn
            ? compareStrings(
                workflowCaseReferenceLabel(a.id, 'leasing'),
                workflowCaseReferenceLabel(b.id, 'leasing'),
              )
            : compareStrings(a.propertyAddress, b.propertyAddress);
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
  }, [hidePropertyColumn, items, sortDirection, sortKey]);

  const headColumns = hidePropertyColumn
    ? [
        { kind: 'sortable' as const, label: 'Case', sortKey: 'property' as const },
        { kind: 'sortable' as const, label: 'Lifecycle stage', sortKey: 'lifecycle' as const },
        { kind: 'sortable' as const, label: 'Onboarding', sortKey: 'onboarding' as const },
        { kind: 'sortable' as const, label: 'Rent/wk', sortKey: 'rent' as const },
        {
          kind: 'sortable' as const,
          label: 'Date created',
          sortKey: 'createdAt' as const,
          defaultDirection: 'desc' as const,
        },
        {
          kind: 'sortable' as const,
          label: 'Available',
          sortKey: 'available' as const,
          defaultDirection: 'asc' as const,
        },
        { kind: 'static' as const, label: '' },
      ]
    : [
        { kind: 'sortable' as const, label: 'Property', sortKey: 'property' as const },
        { kind: 'sortable' as const, label: 'Lifecycle stage', sortKey: 'lifecycle' as const },
        { kind: 'sortable' as const, label: 'Onboarding', sortKey: 'onboarding' as const },
        { kind: 'sortable' as const, label: 'Rent/wk', sortKey: 'rent' as const },
        {
          kind: 'sortable' as const,
          label: 'Date created',
          sortKey: 'createdAt' as const,
          defaultDirection: 'desc' as const,
        },
        {
          kind: 'sortable' as const,
          label: 'Available',
          sortKey: 'available' as const,
          defaultDirection: 'asc' as const,
        },
        { kind: 'static' as const, label: '' },
      ];

  return (
    <>
      <WorkflowCaseListSeeder module="leasing" caseIds={items.map((cycle) => cycle.id)} />
      <div className="space-y-2 md:hidden">
        {sorted.map((cycle) => {
          const href = propertyDetail(cycle.propertyId);
          const lifecycle = leasingLifecycleProgress(cycle);
          const onboarding = leasingOnboardingProgress(cycle);
          const openCycle = onCycleClick ? () => onCycleClick(cycle) : undefined;
          const title = hidePropertyColumn
            ? workflowCaseReferenceLabel(cycle.id, 'leasing')
            : cycle.propertyAddress;
          return (
            <ModuleMobileCardShell
              key={cycle.id}
              onClick={openCycle}
              href={onCycleClick ? undefined : href}
              selected={selectedCycleId === cycle.id}
              newCaseModule="leasing"
              newCaseId={cycle.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{title}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {onboarding?.currentStepLabel
                      ? `Onboarding: ${onboarding.currentStepLabel}`
                      : 'Onboarding not started'}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="text-primary font-medium">{lifecycle.currentStepLabel}</span>
                <span className="font-medium tabular-nums">
                  {cycle.rentPerWeek != null ? `${formatCurrency(cycle.rentPerWeek)}/wk` : '—'}
                </span>
                <span className="text-muted-foreground">
                  {formatCreatedAt(leasingCycleCreatedAtIso(cycle))}
                </span>
                {cycle.availableFrom ? (
                  <span className="text-muted-foreground">
                    Avail {formatDate(cycle.availableFrom)}
                  </span>
                ) : null}
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable
          columnWidths={
            hidePropertyColumn
              ? MODULE_TABLE_COLUMN_WIDTHS.leasingCyclesCompact
              : MODULE_TABLE_COLUMN_WIDTHS.leasingCycles
          }
        >
          <ModuleSortableTableHead
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
            columns={headColumns}
          />
          <tbody className="divide-y">
            {sorted.map((cycle) => {
              const href = propertyDetail(cycle.propertyId);
              const lifecycle = leasingLifecycleProgress(cycle);
              const onboarding = leasingOnboardingProgress(cycle);
              const isSelected = selectedCycleId === cycle.id;
              const openCycle = onCycleClick ? () => onCycleClick(cycle) : undefined;
              return (
                <ModuleInteractiveTableRow
                  key={cycle.id}
                  onActivate={openCycle}
                  selected={isSelected}
                  newCaseModule="leasing"
                  newCaseId={cycle.id}
                >
                  {hidePropertyColumn ? (
                    <td className={moduleTableCellClassName('font-medium')}>
                      <ModuleTableTruncateText>
                        {workflowCaseReferenceLabel(cycle.id, 'leasing')}
                      </ModuleTableTruncateText>
                    </td>
                  ) : onCycleClick ? (
                    <td className={moduleTableCellClassName('font-medium')}>
                      <ModuleTableTruncateText lines={2}>{cycle.propertyAddress}</ModuleTableTruncateText>
                    </td>
                  ) : (
                    <ModuleTableLinkCell href={href}>
                      <ModuleTableTruncateText lines={2}>{cycle.propertyAddress}</ModuleTableTruncateText>
                    </ModuleTableLinkCell>
                  )}
                  <td className={moduleTableCellClassName('text-xs font-medium text-primary')}>
                    <ModuleTableTruncateText>{lifecycle.currentStepLabel}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground')}>
                    <ModuleTableTruncateText>{onboarding?.currentStepLabel ?? '—'}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('tabular-nums')}>
                    <ModuleTableTruncateText>
                      {cycle.rentPerWeek != null ? `${formatCurrency(cycle.rentPerWeek)}/wk` : '—'}
                    </ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                    <ModuleTableTruncateText>
                      {formatCreatedAt(leasingCycleCreatedAtIso(cycle))}
                    </ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                    <ModuleTableTruncateText>
                      {cycle.availableFrom ? formatDateTime(cycle.availableFrom) : '—'}
                    </ModuleTableTruncateText>
                  </td>
                  {onCycleClick ? (
                    <td className="text-muted-foreground px-2 py-2.5 text-right lg:px-3 lg:py-3">
                      <ChevronRight className="inline size-4" />
                    </td>
                  ) : (
                    <ModuleTableChevronCell href={href} />
                  )}
                </ModuleInteractiveTableRow>
              );
            })}
          </tbody>
        </ModuleListTable>
      </div>
    </>
  );
}

type TenantSelectionSortKey =
  | 'property'
  | 'applicant'
  | 'rent'
  | 'term'
  | 'createdAt'
  | 'status';

export function TenantSelectionsTable({
  items,
  onItemClick,
  selectedId,
}: {
  items: TenantSelectionCase[];
  onItemClick?: (item: TenantSelectionCase) => void;
  selectedId?: string | null;
}) {
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
    <>
      <div className="space-y-2 md:hidden">
        {sorted.map((t) => {
          const href = tenantSelectionDetail(t.id);
          const openItem = onItemClick ? () => onItemClick(t) : undefined;
          return (
            <ModuleMobileCardShell
              key={t.id}
              onClick={openItem}
              href={openItem ? undefined : href}
              selected={selectedId === t.id}
              highlight={t.requiresApproval}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.applicantName}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {t.propertyAddress}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="font-medium tabular-nums">
                  {formatCurrency(t.proposedRent)}/wk
                </span>
                <span className="text-muted-foreground">{t.leaseTerm}</span>
                {t.requiresApproval ? (
                  <StatusBadge label="Action required" variant="approval" />
                ) : (
                  <span className="text-primary font-medium">{t.status}</span>
                )}
                <span className="text-muted-foreground tabular-nums">
                  {formatCreatedAt(tenantSelectionCreatedAtIso(t))}
                </span>
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable columnWidths={MODULE_TABLE_COLUMN_WIDTHS.tenantSelection}>
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
          const interactive = Boolean(onItemClick);
          const openItem = onItemClick ? () => onItemClick(t) : undefined;
          return (
            <ModuleInteractiveTableRow
              key={t.id}
              onActivate={openItem}
              selected={selectedId === t.id}
              className={cn(t.requiresApproval && 'bg-destructive/[0.03]')}
            >
              {interactive ? (
                <td className={moduleTableCellClassName('font-medium')}>
                  <ModuleTableTruncateText lines={2}>{t.propertyAddress}</ModuleTableTruncateText>
                </td>
              ) : (
                <ModuleTableLinkCell href={href}>
                  <ModuleTableTruncateText lines={2}>{t.propertyAddress}</ModuleTableTruncateText>
                </ModuleTableLinkCell>
              )}
              <td className={moduleTableCellClassName()}>
                <ModuleTableTruncateText lines={2}>{t.applicantName}</ModuleTableTruncateText>
              </td>
              <td className={moduleTableCellClassName('tabular-nums')}>
                <ModuleTableTruncateText>{formatCurrency(t.proposedRent)}/wk</ModuleTableTruncateText>
              </td>
              <td className={moduleTableCellClassName('text-xs text-muted-foreground')}>
                <ModuleTableTruncateText>{t.leaseTerm}</ModuleTableTruncateText>
              </td>
              <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                <ModuleTableTruncateText>
                  {formatCreatedAt(tenantSelectionCreatedAtIso(t))}
                </ModuleTableTruncateText>
              </td>
              <td className={moduleTableCellClassName()}>
                {t.requiresApproval ? (
                  <StatusBadge label="Action required" variant="approval" />
                ) : (
                  <ModuleTableTruncateText className="text-primary text-xs font-medium">
                    {t.status}
                  </ModuleTableTruncateText>
                )}
              </td>
              {interactive ? (
                <td className="text-muted-foreground px-2 py-2.5 text-right lg:px-3 lg:py-3">
                  <ChevronRight className="inline size-4" />
                </td>
              ) : (
                <ModuleTableChevronCell href={href} />
              )}
            </ModuleInteractiveTableRow>
          );
        })}
      </tbody>
    </ModuleListTable>
      </div>
    </>
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
    <>
      <div className="space-y-2 md:hidden">
        {sorted.map((l) => {
          const href = `${propertyDetail(l.propertyId)}?tab=Leasing`;
          return (
            <ModuleMobileCardShell key={l.id} href={href}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{l.approvedTenant}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{l.address}</p>
                </div>
                <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="font-medium tabular-nums">
                  {formatCurrency(l.rentWeekly)}/wk
                </span>
                <span className="text-muted-foreground capitalize">{l.status}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatDate(l.leaseStart)} – {formatDate(l.leaseEnd)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCreatedAt(leasingRecordCreatedAtIso(l))}
                </span>
              </div>
            </ModuleMobileCardShell>
          );
        })}
      </div>

      <div className="hidden md:block">
        <ModuleListTable columnWidths={MODULE_TABLE_COLUMN_WIDTHS.leasingHistory}>
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
                  <ModuleTableLinkCell href={href}>
                    <ModuleTableTruncateText lines={2}>{l.address}</ModuleTableTruncateText>
                  </ModuleTableLinkCell>
                  <td className={moduleTableCellClassName()}>
                    <ModuleTableTruncateText lines={2}>{l.approvedTenant}</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                    <ModuleTableTruncateText>
                      {formatCreatedAt(leasingRecordCreatedAtIso(l))}
                    </ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs text-muted-foreground tabular-nums')}>
                    <ModuleTableTruncateText>
                      {formatDate(l.leaseStart)} – {formatDate(l.leaseEnd)}
                    </ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('tabular-nums')}>
                    <ModuleTableTruncateText>{formatCurrency(l.rentWeekly)}/wk</ModuleTableTruncateText>
                  </td>
                  <td className={moduleTableCellClassName('text-xs capitalize text-muted-foreground')}>
                    <ModuleTableTruncateText>{l.status}</ModuleTableTruncateText>
                  </td>
                  <ModuleTableChevronCell href={href} />
                </tr>
              );
            })}
          </tbody>
        </ModuleListTable>
      </div>
    </>
  );
}
