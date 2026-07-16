'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { REQUOTED_STATUS_CLASS } from '@/lib/maintenance/quotation-review-state';
import { cn, formatCurrency } from '@/lib/utils';

export function RequotedQuotationBadge({
  previousQuotes,
  selectedPreviousId,
  onSelectPrevious,
}: {
  previousQuotes: Array<{ id: string; submittedAt: string; price: number }>;
  selectedPreviousId?: string | null;
  onSelectPrevious: (quotationId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (previousQuotes.length === 0) {
    return (
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
          REQUOTED_STATUS_CLASS,
        )}
      >
        Requoted
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
          REQUOTED_STATUS_CLASS,
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        Requoted
        <ChevronDown className={cn('size-3 opacity-80 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div
          className="border-border bg-popover absolute right-0 top-full z-20 mt-1 min-w-[14rem] overflow-hidden rounded-md border shadow-md"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={cn(
              'hover:bg-muted w-full px-3 py-2 text-left text-xs',
              selectedPreviousId == null && 'bg-muted',
            )}
            onClick={() => {
              onSelectPrevious(null);
              setOpen(false);
            }}
          >
            Current quotation
          </button>
          {previousQuotes.map((quote, index) => (
            <button
              key={quote.id}
              type="button"
              className={cn(
                'hover:bg-muted w-full border-t px-3 py-2 text-left text-xs',
                selectedPreviousId === quote.id && 'bg-muted',
              )}
              onClick={() => {
                onSelectPrevious(quote.id);
                setOpen(false);
              }}
            >
              <p className="font-medium">Previous quote {previousQuotes.length - index}</p>
              <p className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                {new Date(quote.submittedAt).toLocaleString('en-AU')} ·{' '}
                {formatCurrency(quote.price)}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
