import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const SELECT_CLASS =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50';

/** One Self-Manage step on a job: a titled block with an optional one-line hint. */
export function StepCard({
  title,
  hint,
  tone = 'default',
  children,
}: {
  title: string;
  hint?: string;
  tone?: 'default' | 'attention';
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'space-y-2.5 rounded-lg border p-3',
        tone === 'attention' ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/70',
      )}
    >
      <div>
        <h4 className="text-sm font-semibold leading-snug">{title}</h4>
        {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-muted-foreground mb-1 block text-xs font-medium">
      {children}
    </label>
  );
}
