'use client';

import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Info } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type HoverInfoListItem = {
  title: string;
  detail?: string;
};

export function HoverInfoList({
  ariaLabel,
  heading,
  items,
  className,
}: {
  ariaLabel: string;
  heading: string;
  items: HoverInfoListItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (items.length === 0) return null;

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setOpen(true);
  };
  const hide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  };
  const stopRowClick = (event: MouseEvent | PointerEvent) => {
    event.stopPropagation();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full',
            className,
          )}
          onClick={stopRowClick}
          onPointerDown={stopRowClick}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-auto max-w-xs p-3"
        onMouseEnter={show}
        onMouseLeave={hide}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onClick={stopRowClick}
        onPointerDown={stopRowClick}
      >
        <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
          {heading}
        </p>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={`${item.title}-${item.detail ?? ''}`} className="text-sm">
              <span className={cn('font-semibold', item.detail ? 'tabular-nums' : undefined)}>
                {item.title}
              </span>
              {item.detail ? (
                <span className="text-muted-foreground"> · {item.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
