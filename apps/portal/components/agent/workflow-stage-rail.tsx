'use client';

import { Check, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface WorkflowStageItem {
  id: string;
  label: string;
  status: 'done' | 'current' | 'upcoming';
}

export function WorkflowStageRail({
  stages,
  title,
}: {
  stages: WorkflowStageItem[];
  title?: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      {title && (
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          {title}
        </p>
      )}
      <ol className="space-y-2">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flex items-start gap-2 text-xs">
            <span
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                stage.status === 'done' && 'border-primary bg-primary text-primary-foreground',
                stage.status === 'current' && 'border-primary text-primary',
                stage.status === 'upcoming' && 'text-muted-foreground',
              )}
            >
              {stage.status === 'done' ? (
                <Check className="size-2.5" />
              ) : (
                <Circle className="size-2 fill-current opacity-40" />
              )}
            </span>
            <span
              className={cn(
                stage.status === 'current' && 'font-semibold text-primary',
                stage.status === 'upcoming' && 'text-muted-foreground',
              )}
            >
              {index + 1}. {stage.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
