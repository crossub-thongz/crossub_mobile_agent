'use client';

import { useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { RentPeriod } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  formatEquivalentRent,
  rentEquivalentLines,
  type RentEquivalentPeriod,
} from '@/lib/rent-equivalents';

export function RentEquivalentsHint({
  weekly,
  displayedPeriod = 'weekly',
  className,
}: {
  weekly: number;
  displayedPeriod?: RentPeriod | RentEquivalentPeriod;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!Number.isFinite(weekly) || weekly <= 0) return null;
  const lines = rentEquivalentLines(weekly, displayedPeriod);
  if (lines.length === 0) return null;

  const cancelClose = () => {
    if (closeTimer.current != null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openNow = () => {
    cancelClose();
    setOpen(true);
  };

  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full text-amber-600 hover:text-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:outline-none dark:text-amber-400',
            className,
          )}
          aria-label="Rent in other payment periods"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
        >
          <CircleAlert className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-auto max-w-[16rem] px-3 py-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
      >
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Also payable as
        </p>
        <ul className="space-y-0.5 text-xs">
          {lines.map((row) => (
            <li key={row.period} className="tabular-nums">
              {row.label}: {formatEquivalentRent(row.amount)}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
