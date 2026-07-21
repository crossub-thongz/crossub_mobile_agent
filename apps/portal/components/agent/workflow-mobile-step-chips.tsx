'use client';

import { cn } from '@/lib/utils';

export function WorkflowMobileStepChips<T extends string>({
  steps,
  labels,
  currentStep,
  onStepClick,
  isStepEnabled,
  isStepCompleted,
  className,
}: {
  steps: readonly T[];
  labels: Record<T, string>;
  currentStep: T;
  onStepClick?: (step: T) => void;
  isStepEnabled?: (step: T) => boolean;
  isStepCompleted?: (step: T) => boolean;
  className?: string;
}) {
  return (
    <div className={cn('scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden', className)}>
      {steps.map((stepId) => {
        const enabled = isStepEnabled?.(stepId) ?? true;
        const isViewing = stepId === currentStep;
        const isDone = isStepCompleted?.(stepId) ?? false;
        return (
          <button
            key={stepId}
            type="button"
            disabled={!enabled || !onStepClick}
            onClick={() => enabled && onStepClick?.(stepId)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              isViewing
                ? 'border-primary bg-primary/10 text-primary'
                : isDone
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                  : 'border-border bg-card text-muted-foreground',
              (!enabled || !onStepClick) && 'cursor-default opacity-50',
            )}
          >
            {labels[stepId]}
          </button>
        );
      })}
    </div>
  );
}
