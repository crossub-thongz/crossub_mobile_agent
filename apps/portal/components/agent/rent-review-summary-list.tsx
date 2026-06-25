'use client';

import Link from 'next/link';
import { ChevronRight, TrendingUp } from 'lucide-react';

import { rentReviewDetail } from '@/constants/routes';
import type { RentReviewCase } from '@/lib/types';
import { formatCurrency, formatMonthYear } from '@/lib/utils';

export function RentReviewSummaryList({
  reviews,
  compact = false,
}: {
  reviews: RentReviewCase[];
  compact?: boolean;
}) {
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.reviewDue).getTime() - new Date(a.reviewDue).getTime(),
  );
  const items = compact ? sorted.slice(0, 4) : sorted;

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No rent reviews recorded for this property.</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((r) => (
        <Link
          key={r.id}
          href={rentReviewDetail(r.id)}
          className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3 text-sm transition hover:border-primary/30"
        >
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
            <TrendingUp className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium tabular-nums">
              {formatMonthYear(r.reviewDue)} — {formatCurrency(r.suggestedRent ?? r.currentRent)}/week
            </p>
            <p className="text-muted-foreground text-xs">{r.status}</p>
          </div>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </Link>
      ))}
    </div>
  );
}
