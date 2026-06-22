'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { GiiAssistant } from '@/components/agent/gii-assistant';
import { cn } from '@/lib/utils';

export function GiiFab({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Gii assistant"
        className={cn(
          'pointer-events-auto group relative flex flex-col items-center gap-1',
          'transition-transform active:scale-95',
          className,
        )}
      >
        <span
          aria-hidden
          className="bg-primary/25 absolute top-0 left-1/2 size-[4.25rem] -translate-x-1/2 animate-pulse rounded-full"
        />
        <span
          className={cn(
            'relative flex size-[4.25rem] items-center justify-center rounded-full',
            'bg-gradient-to-br from-primary via-emerald-500 to-teal-600 text-white',
            'shadow-xl shadow-primary/35 ring-4 ring-primary/25',
          )}
        >
          <Sparkles className="size-8" strokeWidth={2} />
        </span>
        <span className="bg-foreground text-background rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide shadow-md">
          Gii
        </span>
      </button>

      <GiiAssistant open={open} onClose={() => setOpen(false)} />
    </>
  );
}
