'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type WorkflowStepVisualState = 'completed' | 'current' | 'upcoming';

function StepMarker({ state }: { state: WorkflowStepVisualState }) {
  if (state === 'upcoming') {
    return (
      <span
        className="border-border bg-background flex size-6 items-center justify-center rounded-full border-2"
        aria-hidden
      />
    );
  }

  return (
    <span
      className="bg-primary flex size-6 items-center justify-center rounded-full"
      aria-hidden
    >
      {state === 'completed' ? (
        <Check className="text-primary-foreground size-3.5" strokeWidth={3} />
      ) : (
        <span className="bg-primary-foreground size-1.5 rounded-full" />
      )}
    </span>
  );
}

export function WorkflowProgressRail<T extends string>({
  steps,
  labels,
  currentStep,
  getStepState,
  isStepCompleted,
  onStepClick,
  isStepEnabled,
  href,
  className,
}: {
  steps: readonly T[];
  labels: Record<T, string>;
  currentStep: T;
  getStepState: (step: T) => WorkflowStepVisualState;
  isStepCompleted: (step: T) => boolean;
  onStepClick?: (step: T) => void;
  isStepEnabled?: (step: T) => boolean;
  href?: string;
  className?: string;
}) {
  const stepCount = steps.length;
  const lineInset = stepCount > 1 ? `${50 / stepCount}%` : '0%';
  const viewingIndex = Math.max(0, steps.indexOf(currentStep));
  const lastCompletedIndex = steps.reduce(
    (last, step, index) => (isStepCompleted(step) ? index : last),
    -1,
  );
  const fillIndex = Math.max(viewingIndex, lastCompletedIndex);
  const progressRatio = stepCount > 1 ? fillIndex / (stepCount - 1) : 0;

  const content = (
    <div className={cn('relative w-full px-1 py-3', className)}>
      {/* Full track */}
      <div
        className="bg-border absolute top-6 h-[3px] rounded-full"
        style={{ left: lineInset, right: lineInset }}
        aria-hidden
      />
      {/* Filled progress */}
      <div
        className="bg-primary absolute top-6 h-[3px] rounded-full transition-[width] duration-200"
        style={{
          left: lineInset,
          width:
            stepCount > 1
              ? `calc((100% - 2 * ${lineInset}) * ${progressRatio})`
              : '0%',
        }}
        aria-hidden
      />

      <div className="relative flex w-full">
        {steps.map((step) => {
          const state = getStepState(step);
          const label = labels[step];
          const isViewing = step === currentStep;
          const enabled = isStepEnabled?.(step) ?? true;

          const column = (
            <>
              <StepMarker state={state} />
              <span
                className={cn(
                  'mt-2 max-w-[4.25rem] text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:max-w-[5rem] sm:text-[10px]',
                  state === 'upcoming' ? 'text-muted-foreground/70' : 'text-primary',
                )}
              >
                {label}
              </span>
            </>
          );

          if (onStepClick) {
            return (
              <button
                key={step}
                type="button"
                disabled={!enabled}
                onClick={() => enabled && onStepClick(step)}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center rounded-lg px-0.5 py-0.5 transition-colors',
                  enabled ? 'hover:bg-secondary/30' : 'cursor-not-allowed opacity-60',
                )}
                aria-current={isViewing ? 'step' : undefined}
                aria-label={label}
              >
                {column}
              </button>
            );
          }

          return (
            <div
              key={step}
              className="flex min-w-0 flex-1 flex-col items-center px-0.5"
              aria-current={isViewing ? 'step' : undefined}
            >
              {column}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function resolveWorkflowStepState(
  isDone: boolean,
  isViewing: boolean,
): WorkflowStepVisualState {
  if (isViewing) return 'current';
  if (isDone) return 'completed';
  return 'upcoming';
}
