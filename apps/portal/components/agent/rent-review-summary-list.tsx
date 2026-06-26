'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

import { RentReviewDetailDialog } from '@/components/agent/rent-review-detail-dialog';
import { Button } from '@/components/ui/button';
import { fromProperty } from '@/lib/detail-navigation';
import type { RentReviewCase } from '@/lib/types';
import { formatCurrency, formatMonthYear } from '@/lib/utils';

export function RentReviewSummaryList({
  reviews,
  propertyId,
  compact = false,
}: {
  reviews: RentReviewCase[];
  propertyId: string;
  compact?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sorted = [...reviews].sort(
    (a, b) => new Date(b.reviewDue).getTime() - new Date(a.reviewDue).getTime(),
  );
  const items = compact ? sorted.slice(0, 4) : sorted;
  const selected = selectedId ? sorted.find((r) => r.id === selectedId) ?? null : null;

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No rent reviews recorded for this property.</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3 text-sm"
          >
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
              <TrendingUp className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium tabular-nums">
                {formatMonthYear(r.reviewDue)} — {formatCurrency(r.suggestedRent ?? r.currentRent)}
                /week
              </p>
              <p className="text-muted-foreground text-xs">{r.status}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setSelectedId(r.id)}
            >
              View details
            </Button>
          </div>
        ))}
      </div>

      <RentReviewDetailDialog
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        review={selected}
        navContext={fromProperty(propertyId, 'Overview')}
      />
    </>
  );
}
