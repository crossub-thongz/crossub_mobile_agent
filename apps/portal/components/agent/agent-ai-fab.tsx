'use client';

import { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';

import { AgentAiAssistant } from '@/components/agent/agent-ai-assistant';
import { cn } from '@/lib/utils';

export function AgentAiFab({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          'pointer-events-none fixed left-4 z-[45]',
          'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Agent AI assistant"
          className={cn(
            'pointer-events-auto group relative flex flex-col items-center gap-1',
            'transition-transform active:scale-95',
          )}
        >
          <span
            aria-hidden
            className="bg-primary/30 absolute top-0 left-1/2 size-16 -translate-x-1/2 animate-pulse rounded-full"
          />
          <span
            className={cn(
              'relative flex size-16 items-center justify-center rounded-full',
              'bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground',
              'shadow-lg shadow-primary/30 ring-4 ring-primary/20',
            )}
          >
            <Bot className="size-7" strokeWidth={2.25} />
            <Sparkles className="absolute -top-0.5 -right-0.5 size-4 text-amber-300" />
          </span>
          <span
            className={cn(
              'bg-foreground text-background relative rounded-full px-2.5 py-0.5',
              'text-[10px] font-bold tracking-wide shadow-md',
            )}
          >
            Ask AI
          </span>
        </button>
      </div>

      <AgentAiAssistant open={open} onClose={() => setOpen(false)} />
    </>
  );
}
