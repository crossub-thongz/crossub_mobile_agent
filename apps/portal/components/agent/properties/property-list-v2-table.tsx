'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

import { HoverInfoList } from '@/components/agent/hover-info-list';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  buildPropertyListV2LeaseExpiry,
  buildPropertyListV2RowStatus,
  formatPropertyListV2Rent,
  propertyListV2TenancyLabel,
  type PropertyListV2StatusTone,
} from '@/lib/property-list-v2';
import { isPropertyRegistryDraft } from '@/lib/property-registry-persist';
import { usePropertyTenantContacts } from '@/lib/use-property-tenant-contacts';
import type { LeasingRecord, Property, PropertyAccounting } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

function StatusBadge({
  label,
  sublabel,
  tone,
}: {
  label: string;
  sublabel?: string;
  tone: PropertyListV2StatusTone;
}) {
  return (
    <div className="min-w-0">
      <span
        className={cn(
          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
          tone === 'good' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
          tone === 'warn' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
          tone === 'new' && 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
          tone === 'draft' && 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
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

function PropertyRowActions({
  isDraft,
  onContinue,
  onOpenProfile,
  onDeleteDraft,
  onArchive,
  onRestore,
  restoring,
}: {
  isDraft: boolean;
  onContinue?: () => void;
  onOpenProfile?: () => void;
  onDeleteDraft?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  restoring?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasActions = isDraft
    ? Boolean(onContinue || onDeleteDraft)
    : Boolean(onOpenProfile || onArchive || onRestore);
  if (!hasActions) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-8"
          aria-label="Property actions"
          data-tour="properties-row-menu"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-48 p-1"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {isDraft ? (
          <>
            {onContinue ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onContinue();
                }}
                className="hover:bg-muted/60 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
              >
                Continue registration
              </button>
            ) : null}
            {onDeleteDraft ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDeleteDraft();
                }}
                className="text-destructive hover:bg-destructive/10 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
              >
                Delete draft
              </button>
            ) : null}
          </>
        ) : (
          <>
            {onOpenProfile ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenProfile();
                }}
                className="hover:bg-muted/60 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
              >
                Open profile
              </button>
            ) : null}
            {onArchive ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onArchive();
                }}
                className="hover:bg-muted/60 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
              >
                Archive
              </button>
            ) : null}
            {onRestore ? (
              <button
                type="button"
                disabled={restoring}
                onClick={() => {
                  setOpen(false);
                  onRestore();
                }}
                className="hover:bg-muted/60 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-50"
              >
                {restoring ? 'Restoring…' : 'Restore'}
              </button>
            ) : null}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function PropertyListV2Table({
  properties,
  selectedId,
  accounting,
  leasingRecords,
  emphasizeArrears = false,
  onSelect,
  onOpenProfile,
  onDeleteDraft,
  onArchive,
  onRestore,
  restoringId,
}: {
  properties: Property[];
  selectedId: string | null;
  accounting: PropertyAccounting[];
  leasingRecords: LeasingRecord[];
  emphasizeArrears?: boolean;
  onSelect: (propertyId: string) => void;
  /** Desktop: second click (or double-click) on a selected row opens the property profile. */
  onOpenProfile?: (propertyId: string) => void;
  onDeleteDraft?: (property: Property) => void;
  onArchive?: (property: Property) => void;
  onRestore?: (property: Property) => void;
  restoringId?: string | null;
}) {
  const tenantContactsByProperty = usePropertyTenantContacts(properties.map((property) => property.id));

  const rowMeta = useMemo(() => {
    const meta = new Map<
      string,
      {
        status: ReturnType<typeof buildPropertyListV2RowStatus>;
        leaseExpiry: ReturnType<typeof buildPropertyListV2LeaseExpiry>;
        tenancy: ReturnType<typeof propertyListV2TenancyLabel>;
        arrearsAmount: number;
        daysInArrears: number;
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
        tenancy: propertyListV2TenancyLabel(
          property,
          currentLease,
          tenantContactsByProperty[propertyId],
        ),
        arrearsAmount: acct?.arrearsAmount ?? 0,
        daysInArrears: acct?.daysInArrears ?? 0,
      });
    }

    return meta;
  }, [accounting, leasingRecords, properties, tenantContactsByProperty]);

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col style={{ width: '24%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '2.75rem' }} />
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3" data-tour="properties-tenancy">
                Tenancy
              </th>
              <th className="px-3 py-3">Rent</th>
              <th className="px-3 py-3">Lease expiry</th>
              <th className="px-3 py-3" data-tour="properties-status">
                {emphasizeArrears ? 'Arrears' : 'Status'}
              </th>
              <th className="px-1 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {properties.map((property) => {
              const meta = rowMeta.get(property.id);
              if (!meta) return null;
              const selected = selectedId === property.id;
              const isDraft = isPropertyRegistryDraft(property);
              const canOpenProfile = Boolean(onOpenProfile) && !isDraft;

              return (
                <tr
                  key={property.id}
                  onClick={() => {
                    if (canOpenProfile && selected) {
                      onOpenProfile?.(property.id);
                      return;
                    }
                    onSelect(property.id);
                  }}
                  onDoubleClick={() => {
                    if (canOpenProfile) onOpenProfile?.(property.id);
                  }}
                  title={
                    isDraft
                      ? 'Continue registration'
                      : canOpenProfile
                        ? selected
                          ? 'Click again to enter profile'
                          : 'Click to preview · Click again to enter profile'
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
                    {isDraft ? (
                      <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        Draft
                      </span>
                    ) : selected && canOpenProfile ? (
                      <p className="text-primary mt-1 text-[11px] font-medium">
                        Click again to enter profile
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex min-w-0 items-start gap-1">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{meta.tenancy.primary}</p>
                        {meta.tenancy.secondary ? (
                          <p className="text-muted-foreground truncate text-xs">
                            {meta.tenancy.secondary}
                          </p>
                        ) : null}
                      </div>
                      <HoverInfoList
                        ariaLabel="Other tenants"
                        heading="Other tenants"
                        items={meta.tenancy.others.map((name) => ({ title: name }))}
                        className="mt-0.5"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top font-medium tabular-nums">
                    {formatPropertyListV2Rent(property)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p
                      className={cn(
                        'font-medium tabular-nums',
                        meta.leaseExpiry.tone === 'warning' && 'text-amber-700',
                      )}
                    >
                      {meta.leaseExpiry.label}
                    </p>
                    {meta.leaseExpiry.sublabel ? (
                      <p
                        className={cn(
                          'text-xs tabular-nums',
                          meta.leaseExpiry.tone === 'warning'
                            ? 'text-amber-700'
                            : 'text-muted-foreground',
                        )}
                      >
                        {meta.leaseExpiry.sublabel}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {emphasizeArrears && (meta.arrearsAmount > 0 || meta.daysInArrears > 0) ? (
                      <div>
                        <p className="font-semibold text-rose-700 tabular-nums">
                          {meta.arrearsAmount > 0 ? formatCurrency(meta.arrearsAmount) : 'Arrears'}
                        </p>
                        {meta.daysInArrears > 0 ? (
                          <p className="text-muted-foreground text-xs">
                            {meta.daysInArrears} day{meta.daysInArrears === 1 ? '' : 's'} overdue
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <StatusBadge {...meta.status} />
                    )}
                  </td>
                  <td
                    className="px-1 py-3 align-top"
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-end">
                      <PropertyRowActions
                        isDraft={isDraft}
                        onContinue={
                          isDraft ? () => onSelect(property.id) : undefined
                        }
                        onOpenProfile={
                          canOpenProfile ? () => onOpenProfile?.(property.id) : undefined
                        }
                        onDeleteDraft={
                          isDraft && onDeleteDraft
                            ? () => onDeleteDraft(property)
                            : undefined
                        }
                        onArchive={
                          !isDraft && onArchive
                            ? () => onArchive(property)
                            : undefined
                        }
                        onRestore={
                          !isDraft && onRestore
                            ? () => onRestore(property)
                            : undefined
                        }
                        restoring={restoringId === property.id}
                      />
                    </div>
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
