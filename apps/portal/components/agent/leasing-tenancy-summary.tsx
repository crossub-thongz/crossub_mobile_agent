'use client';

import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';

import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { LeasingTicketCard } from '@/components/agent/leasing-ticket-card';
import { Button } from '@/components/ui/button';
import type { LeasingRecord } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export function LeasingTenancySummary({
  propertyId,
  lease,
  nextRentReviewDate,
  onViewRentReview,
}: {
  propertyId: string;
  lease: LeasingRecord;
  nextRentReviewDate?: string | null;
  onViewRentReview?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <FileText className="text-muted-foreground size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Current tenancy details</p>
          <p className="text-muted-foreground truncate text-xs">
            {lease.approvedTenant} · {formatDate(lease.leaseStart)} – {formatDate(lease.leaseEnd)}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t px-4 py-3">
          <InfoPanel title="Current leasing agreement" icon={FileText} className="min-w-0">
            <InfoRow label="Tenant" value={lease.approvedTenant} />
            <InfoRow
              label="Lease period"
              value={`${formatDate(lease.leaseStart)} — ${formatDate(lease.leaseEnd)}`}
            />
            <InfoRow label="Rent" value={`${formatCurrency(lease.rentWeekly)}/wk`} />
            <InfoRow label="Status" value={lease.status} />
            {nextRentReviewDate && (
              <InfoRow label="Next rent review">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{formatDate(nextRentReviewDate)}</span>
                  {onViewRentReview && (
                    <Button type="button" variant="outline" size="sm" onClick={onViewRentReview}>
                      View details
                    </Button>
                  )}
                </div>
              </InfoRow>
            )}
          </InfoPanel>
          <LeasingTicketCard propertyId={propertyId} record={lease} omitOpenInspection />
        </div>
      ) : null}
    </div>
  );
}
