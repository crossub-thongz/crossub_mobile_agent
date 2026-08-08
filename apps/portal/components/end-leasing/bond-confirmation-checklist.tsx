'use client';

import type { ReactNode } from 'react';
import { Check, Circle, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export type BondChecklistItemState = 'done' | 'pending' | 'declined';

export function BondConfirmationChecklistItem({
  state,
  title,
  description,
  action,
}: {
  state: BondChecklistItemState;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const icon =
    state === 'done' ? (
      <Check className="size-3.5" strokeWidth={2.5} />
    ) : state === 'declined' ? (
      <XCircle className="size-3.5" strokeWidth={2.5} />
    ) : (
      <Circle className="size-3.5" strokeWidth={2.5} />
    );

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-3',
        state === 'done' && 'border-emerald-200/80 bg-emerald-50/50',
        state === 'declined' && 'border-destructive/25 bg-destructive/5',
        state === 'pending' && 'border-border bg-muted/20',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border',
            state === 'done' && 'border-emerald-600 bg-emerald-600 text-white',
            state === 'declined' && 'border-destructive bg-destructive text-white',
            state === 'pending' && 'border-muted-foreground/30 bg-background text-muted-foreground',
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold leading-snug">{title}</p>
          {description ? (
            <p className="text-muted-foreground text-[11px] leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          ) : null}
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function BondConfirmationChecklist({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}
