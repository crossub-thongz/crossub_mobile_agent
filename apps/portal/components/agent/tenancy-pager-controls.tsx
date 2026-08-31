'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function TenancyPagerControls({
  index,
  count,
  onPrev,
  onNext,
  className,
}: {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  if (count <= 1) return null;

  return (
    <div className={cn('flex shrink-0 items-center gap-0.5', className)}>
      <button
        type="button"
        aria-label="Previous tenancy"
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
        onClick={onPrev}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-muted-foreground min-w-[2.75rem] text-center text-[11px] font-medium tabular-nums">
        {index + 1} / {count}
      </span>
      <button
        type="button"
        aria-label="Next tenancy"
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
        onClick={onNext}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
