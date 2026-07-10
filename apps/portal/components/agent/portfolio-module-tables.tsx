'use client';

import {
  ModuleListTable,
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
  inspectionDetail,
  maintenanceDetail,
  propertyDetail,
  rentReviewDetail,
  tenantSelectionDetail,
  tribunalDetail,
} from '@/constants/routes';
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

function maintenanceCreatedAt(request: MaintenanceRequest): string {
  const first = request.timeline[0]?.at;
  return first ? formatDateTime(first) : '—';
}

function rentReviewLeaseLabel(review: RentReviewCase): string {
  if (review.leaseType === 'periodic') return 'Periodic';
  if (review.fixedTermWeeks) return `Fixed · ${review.fixedTermWeeks} wks`;
  return 'Fixed';
}

export function MaintenanceListTable({ items }: { items: MaintenanceRequest[] }) {
  return (
    <ModuleListTable minWidth={980}>
      <ModuleTableHead
        columns={['ID', 'Created', 'Subject', 'Address', 'Status', 'Responsibility', 'Priority', '']}
      />
      <tbody className="divide-y">
        {items.map((m) => {
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
                {maintenanceCreatedAt(m)}
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

export function RentReviewListTable({
  items,
  detailHref,
}: {
  items: RentReviewCase[];
  detailHref: (id: string) => string;
}) {
  return (
    <ModuleListTable minWidth={1040}>
      <ModuleTableHead
        columns={['ID', 'Property', 'Tenant', 'Lease', 'Due', 'Current rent', 'Stage', '']}
      />
      <tbody className="divide-y">
        {items.map((r) => {
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

export function InspectionsListTable({ items }: { items: Inspection[] }) {
  return (
    <ModuleListTable minWidth={920}>
      <ModuleTableHead
        columns={['Ref', 'Property', 'Type', 'Inspector', 'Scheduled', 'Stage', '']}
      />
      <tbody className="divide-y">
        {items.map((i) => {
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

export function LeasingCyclesTable({ items }: { items: LeasingCycle[] }) {
  return (
    <ModuleListTable minWidth={880}>
      <ModuleTableHead columns={['Property', 'Lifecycle stage', 'Onboarding', 'Rent/wk', 'Available', '']} />
      <tbody className="divide-y">
        {items.map((cycle) => {
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
                {cycle.availableFrom ? formatDate(cycle.availableFrom) : '—'}
              </td>
              <ModuleTableChevronCell href={href} />
            </tr>
          );
        })}
      </tbody>
    </ModuleListTable>
  );
}

export function TenantSelectionsTable({ items }: { items: TenantSelectionCase[] }) {
  return (
    <ModuleListTable minWidth={860}>
      <ModuleTableHead columns={['Property', 'Applicant', 'Rent', 'Term', 'Status', '']} />
      <tbody className="divide-y">
        {items.map((t) => {
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

export function LeasingHistoryTable({
  items,
}: {
  items: (LeasingRecord & { address: string })[];
}) {
  return (
    <ModuleListTable minWidth={900}>
      <ModuleTableHead columns={['Property', 'Tenant', 'Lease period', 'Rent', 'Status', '']} />
      <tbody className="divide-y">
        {items.map((l) => {
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
