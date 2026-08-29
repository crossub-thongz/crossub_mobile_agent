'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type TaskProgressStage = {
  label: string;
  state: 'complete' | 'current' | 'pending';
  dateLabel?: string;
};

export function TaskProgressRail({
  stages,
  tone = 'rose',
}: {
  stages: TaskProgressStage[];
  tone?: 'rose' | 'sky';
}) {
  const current =
    tone === 'sky'
      ? {
          border: 'border-sky-600',
          dot: 'bg-sky-600',
          text: 'text-sky-700',
          pill: 'bg-sky-100 text-sky-700',
        }
      : {
          border: 'border-rose-600',
          dot: 'bg-rose-600',
          text: 'text-rose-700',
          pill: 'bg-rose-100 text-rose-700',
        };

  return (
    <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex min-w-[40rem] items-start gap-0 px-1">
        {stages.map((stage, index) => (
          <div key={stage.label} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {index > 0 ? (
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    stage.state === 'pending' && stages[index - 1]?.state === 'pending'
                      ? 'bg-border'
                      : 'bg-emerald-500',
                  )}
                />
              ) : (
                <span className="flex-1" />
              )}
              <span
                className={cn(
                  'relative flex size-7 shrink-0 items-center justify-center rounded-full border-2',
                  stage.state === 'complete' && 'border-emerald-500 bg-emerald-500 text-white',
                  stage.state === 'current' && `bg-white ${current.border}`,
                  stage.state === 'pending' && 'border-border bg-white',
                )}
              >
                {stage.state === 'complete' ? (
                  <Check className="size-3.5" />
                ) : stage.state === 'current' ? (
                  <span className={cn('size-2.5 rounded-full', current.dot)} />
                ) : null}
              </span>
              {index < stages.length - 1 ? (
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    stage.state === 'complete' ? 'bg-emerald-500' : 'bg-border',
                  )}
                />
              ) : (
                <span className="flex-1" />
              )}
            </div>
            <p
              className={cn(
                'mt-2 px-1 text-center text-[11px] font-medium leading-tight',
                stage.state === 'current' ? current.text : 'text-muted-foreground',
              )}
            >
              {stage.label}
            </p>
            {stage.state === 'current' ? (
              <span className={cn('mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', current.pill)}>
                Current
              </span>
            ) : stage.dateLabel ? (
              <span className="text-muted-foreground mt-1 text-[10px]">{stage.dateLabel}</span>
            ) : stage.state === 'pending' ? (
              <span className="text-muted-foreground mt-1 text-[10px]">Pending</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
