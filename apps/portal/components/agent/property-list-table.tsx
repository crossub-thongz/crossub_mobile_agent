'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { crossubWebPropertyUrl } from '@/lib/crossub-web-url';
import type { Agency, Property } from '@/lib/types';
import { cn, formatCurrency, formatDate, formatDateTime, formatPropertyFullAddress } from '@/lib/utils';

function formatLeasePeriod(property: Property): string {
  if (!property.leaseStart && !property.leaseEnd) return '—';
  const start = property.leaseStart ? formatDate(property.leaseStart) : '—';
  const end = property.leaseEnd ? formatDate(property.leaseEnd) : '—';
  return `${start} – ${end}`;
}

function formatRent(property: Property): string {
  if (!property.rentWeekly || property.rentWeekly <= 0) return '—';
  return `${formatCurrency(property.rentWeekly)}/wk`;
}

function resolveAgencyName(property: Property, agencies: Agency[]): string {
  if (property.agencyName?.trim()) return property.agencyName.trim();
  const agency = agencies.find((a) => a.id === property.agencyId);
  return agency?.name ?? '—';
}

export function PropertyListTable({
  properties,
  agencies,
  actionCountFor,
  detailHref,
  onDelete,
  canManage,
}: {
  properties: Property[];
  agencies: Agency[];
  actionCountFor: (propertyId: string) => number;
  detailHref: (propertyId: string) => string;
  onDelete: (property: Property) => void;
  canManage?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 font-semibold">Property address</th>
              <th className="px-3 py-3 font-semibold">Tenant(s)</th>
              <th className="px-3 py-3 font-semibold">Lease period</th>
              <th className="px-3 py-3 font-semibold">Rent</th>
              <th className="px-3 py-3 font-semibold">Agency</th>
              <th className="px-3 py-3 font-semibold">PM</th>
              <th className="px-3 py-3 font-semibold">Create date</th>
              <th className="px-3 py-3 text-center font-semibold">Reminder</th>
              <th className="px-3 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {properties.map((property) => {
              const actionCount = actionCountFor(property.id);
              const pmName = property.propertyManager?.trim();
              const pmHref =
                pmName && property.propertyManagerId
                  ? crossubWebPropertyUrl(property.id)
                  : null;

              return (
                <tr
                  key={property.id}
                  className={cn(
                    'transition-colors hover:bg-muted/20',
                    actionCount > 0 && 'bg-destructive/[0.03]',
                  )}
                >
                  <td className="max-w-[16rem] px-3 py-3">
                    <Link
                      href={detailHref(property.id)}
                      className="font-medium leading-snug text-foreground hover:text-primary"
                    >
                      {formatPropertyFullAddress(property)}
                    </Link>
                  </td>
                  <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                    <span className="line-clamp-2">{property.tenantName || '—'}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                    {formatLeasePeriod(property)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums">
                    {formatRent(property)}
                  </td>
                  <td className="max-w-[10rem] px-3 py-3 text-muted-foreground">
                    <span className="line-clamp-2">{resolveAgencyName(property, agencies)}</span>
                  </td>
                  <td className="max-w-[9rem] px-3 py-3">
                    {pmHref && pmName ? (
                      <a
                        href={pmHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary line-clamp-2 text-xs font-medium hover:underline"
                      >
                        {pmName}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                    {property.createdAt && !Number.isNaN(new Date(property.createdAt).getTime())
                      ? formatDateTime(property.createdAt)
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        actionCount > 0 ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {actionCount}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href={detailHref(property.id)} aria-label={`Edit ${property.address}`}>
                          <Pencil className="size-3.5" />
                        </Link>
                      </Button>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8"
                          onClick={() => onDelete(property)}
                          aria-label={`Delete ${property.address}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
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
