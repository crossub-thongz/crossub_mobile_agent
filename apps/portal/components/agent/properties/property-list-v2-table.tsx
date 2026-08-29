'use client';

import { useMemo } from 'react';
import { Briefcase, Building2, Wrench } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildPropertyListV2LeaseExpiry,
  buildPropertyListV2RowStatus,
  buildPropertyListV2RowTasks,
  formatPropertyListV2Rent,
  propertyListV2TenancyLabel,
} from '@/lib/property-list-v2';
import { useAgentStore } from '@/lib/store';
import type { LeasingRecord, Property, PropertyAccounting } from '@/lib/types';
import { cn } from '@/lib/utils';

function StatusBadge({
  label,
  sublabel,
  tone,
}: {
  label: string;
  sublabel?: string;
  tone: 'good' | 'warn' | 'muted';
}) {
  return (
    <div className="min-w-0">
      <span
        className={cn(
          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
          tone === 'good' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
          tone === 'warn' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
          tone === 'muted' && 'bg-muted text-muted-foreground',
        )}
      >
        {label}
      </span>
      {sublabel ? (
        <p className="text-muted-foreground mt-1 truncate text-[11px]">{sublabel}</p>
      ) : null}
    </div>
  );
}

function taskCountLabel(
  kind: 'maintenance' | 'leasing' | 'inspection',
  count: number,
): string {
  const labels = {
    maintenance: ['maintenance task', 'maintenance tasks'] as const,
    leasing: ['leasing task', 'leasing tasks'] as const,
    inspection: ['inspection task', 'inspection tasks'] as const,
  };
  const [singular, plural] = labels[kind];
  return `${count} ${count === 1 ? singular : plural}`;
}

function TaskSummary({
  maintenanceCount,
  leasingCount,
  inspectionCount,
  summary,
  subsummary,
}: {
  maintenanceCount: number;
  leasingCount: number;
  inspectionCount: number;
  summary: string;
  subsummary?: string;
}) {
  const total = maintenanceCount + leasingCount + inspectionCount;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {maintenanceCount > 0 ? (
          <span
            className="text-muted-foreground inline-flex cursor-default items-center gap-1 text-[11px]"
            title={taskCountLabel('maintenance', maintenanceCount)}
            aria-label={taskCountLabel('maintenance', maintenanceCount)}
          >
            <Wrench className="size-3.5" aria-hidden />
            {maintenanceCount}
          </span>
        ) : null}
        {leasingCount > 0 ? (
          <span
            className="text-muted-foreground inline-flex cursor-default items-center gap-1 text-[11px]"
            title={taskCountLabel('leasing', leasingCount)}
            aria-label={taskCountLabel('leasing', leasingCount)}
          >
            <Briefcase className="size-3.5" aria-hidden />
            {leasingCount}
          </span>
        ) : null}
        {inspectionCount > 0 ? (
          <span
            className="text-muted-foreground inline-flex cursor-default items-center gap-1 text-[11px]"
            title={taskCountLabel('inspection', inspectionCount)}
            aria-label={taskCountLabel('inspection', inspectionCount)}
          >
            <Building2 className="size-3.5" aria-hidden />
            {inspectionCount}
          </span>
        ) : null}
        {total === 0 ? <span className="text-muted-foreground text-[11px]">—</span> : null}
      </div>
      <p className="mt-1 truncate text-xs font-medium">{summary}</p>
      {subsummary ? (
        <p className="text-muted-foreground truncate text-[11px]">{subsummary}</p>
      ) : null}
    </div>
  );
}

export function PropertyListV2Table({
  properties,
  selectedId,
  accounting,
  leasingRecords,
  needActionCountFor,
  onSelect,
  onOpenProfile,
}: {
  properties: Property[];
  selectedId: string | null;
  accounting: PropertyAccounting[];
  leasingRecords: LeasingRecord[];
  needActionCountFor: (propertyId: string) => number;
  onSelect: (propertyId: string) => void;
  /** Desktop: double-click row to open full property profile. */
  onOpenProfile?: (propertyId: string) => void;
}) {
  const {
    maintenanceAll,
    inspections,
    rentReviews,
    leasingCycles,
    tenantSelections,
    vacating,
    tribunalCases,
    getPropertyActions,
  } = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);

  const rowMeta = useMemo(() => {
    const meta = new Map<
      string,
      ReturnType<typeof buildPropertyListV2RowTasks> & {
        status: ReturnType<typeof buildPropertyListV2RowStatus>;
        leaseExpiry: ReturnType<typeof buildPropertyListV2LeaseExpiry>;
        tenancy: ReturnType<typeof propertyListV2TenancyLabel>;
        needActionCount: number;
      }
    >();

    for (const property of properties) {
      const propertyId = property.id;
      const acct = accounting.find((row) => row.propertyId === propertyId) ?? null;
      const currentLease = leasingRecords.find(
        (row) => row.propertyId === propertyId && row.status === 'current',
      );
      meta.set(propertyId, {
        status: buildPropertyListV2RowStatus(property, acct),
        leaseExpiry: buildPropertyListV2LeaseExpiry(property, currentLease),
        tenancy: propertyListV2TenancyLabel(property, currentLease),
        needActionCount: needActionCountFor(propertyId),
        ...buildPropertyListV2RowTasks({
          propertyId,
          property,
          maintenance: maintenanceAll.filter((row) => row.propertyId === propertyId),
          inspections: inspections.filter((row) => row.propertyId === propertyId),
          rentReviews: rentReviews.filter((row) => row.propertyId === propertyId),
          rentReviewDecisions,
          leasingCycles: leasingCycles.filter((row) => row.propertyId === propertyId),
          tenantSelections: tenantSelections.filter((row) => row.propertyId === propertyId),
          vacatingCases: vacating.filter((row) => row.propertyId === propertyId),
          tribunalCases: tribunalCases.filter((row) => row.propertyId === propertyId),
          accounting: acct,
          currentLease,
          needActions: getPropertyActions(propertyId),
        }),
      });
    }

    return meta;
  }, [
    accounting,
    getPropertyActions,
    inspections,
    leasingCycles,
    leasingRecords,
    maintenanceAll,
    needActionCountFor,
    properties,
    rentReviewDecisions,
    rentReviews,
    tenantSelections,
    tribunalCases,
    vacating,
  ]);

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3">Tenancy</th>
              <th className="px-3 py-3">Rent</th>
              <th className="px-3 py-3">Lease expiry</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Tasks</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {properties.map((property) => {
              const meta = rowMeta.get(property.id);
              if (!meta) return null;
              const selected = selectedId === property.id;

              return (
                <tr
                  key={property.id}
                  onClick={() => onSelect(property.id)}
                  onDoubleClick={() => onOpenProfile?.(property.id)}
                  title={
                    onOpenProfile
                      ? 'Click to preview · Double-click to open property'
                      : undefined
                  }
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/20',
                    selected && 'bg-primary/[0.04]',
                  )}
                >
                  <td className="px-3 py-3 align-top">
                    <p className="truncate font-medium">{property.address}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {property.suburb}
                      {property.postcode ? ` ${property.postcode}` : ''}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="truncate font-medium">{meta.tenancy.primary}</p>
                    {meta.tenancy.secondary ? (
                      <p className="text-muted-foreground truncate text-xs">{meta.tenancy.secondary}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top font-medium tabular-nums">
                    {formatPropertyListV2Rent(property)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium tabular-nums">{meta.leaseExpiry.label}</p>
                    {meta.leaseExpiry.sublabel ? (
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {meta.leaseExpiry.sublabel}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusBadge {...meta.status} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <TaskSummary {...meta} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
