'use client';

import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { propertyLeasePackage } from '@/constants/routes';
import type { LeasingRecord } from '@/lib/types';
import { formatLeasePeriodMonthYear } from '@/lib/utils';

export function TenancyHistorySection({
  propertyId,
  records,
  compact = false,
  onViewAll,
}: {
  propertyId: string;
  records: LeasingRecord[];
  compact?: boolean;
  onViewAll?: () => void;
}) {
  const sorted = [...records].sort(
    (a, b) => new Date(b.leaseStart).getTime() - new Date(a.leaseStart).getTime(),
  );
  const preview = compact ? sorted.slice(0, 4) : sorted;

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No tenancy history for this property yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Tenancy periods — tap a record for maintenance, inspections, rent reviews, and all
        communications for that lease.
      </p>
      {preview.map((lease) => (
        <Link
          key={lease.id}
          href={propertyLeasePackage(propertyId, lease.id)}
          className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3 text-sm transition hover:border-primary/30"
        >
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
            <User className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{lease.approvedTenant}</p>
            <p className="text-muted-foreground text-xs">
              Lease period: {formatLeasePeriodMonthYear(lease.leaseStart, lease.leaseEnd)}
            </p>
            {lease.status === 'current' && (
              <span className="text-primary mt-0.5 inline-block text-[10px] font-semibold uppercase">
                Current tenancy
              </span>
            )}
          </div>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </Link>
      ))}
      {compact && onViewAll && sorted.length > 4 && (
        <Button type="button" variant="outline" className="mt-1 w-full" onClick={onViewAll}>
          View all {sorted.length} tenancies
          <ChevronRight className="size-4" />
        </Button>
      )}
      {/* {compact && onViewAll && sorted.length <= 4 && sorted.length > 0 && (
        <Button type="button" variant="outline" className="mt-1 w-full" onClick={onViewAll}>
          View tenancy history
          <ChevronRight className="size-4" />
        </Button>
      )} */}
    </div>
  );
}
