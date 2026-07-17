'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type WorkflowStepVisualState = 'completed' | 'current' | 'upcoming';

export type WorkflowProgressRailSize = 'default' | 'compact';
export type WorkflowProgressRailTone = 'primary' | 'violet';

const RAIL_TONE: Record<
  WorkflowProgressRailTone,
  {
    trackFill: string;
    markerActive: string;
    markerDot: string;
    markerCheck: string;
    labelActive: string;
    upcomingBorder: string;
  }
> = {
  primary: {
    trackFill: 'bg-primary',
    markerActive: 'bg-primary',
    markerDot: 'bg-primary-foreground',
    markerCheck: 'text-primary-foreground',
    labelActive: 'text-primary',
    upcomingBorder: 'border-border',
  },
  violet: {
    trackFill: 'bg-violet-500',
    markerActive: 'bg-violet-500',
    markerDot: 'bg-white',
    markerCheck: 'text-white',
    labelActive: 'text-violet-600 dark:text-violet-400',
    upcomingBorder: 'border-violet-300/60 dark:border-violet-500/40',
  },
};

const RAIL_SIZE: Record<
  WorkflowProgressRailSize,
  {
    lineHeight: string;
    marker: string;
    markerCheck: string;
    markerDot: string;
    label: string;
    padding: string;
  }
> = {
  default: {
    lineHeight: 'h-[3px]',
    marker: 'size-6',
    markerCheck: 'size-3.5',
    markerDot: 'size-1.5',
    label:
      'mt-2 max-w-[3.25rem] text-center text-[8px] font-semibold uppercase leading-tight tracking-wide sm:max-w-[4.75rem] sm:text-[9px]',
    padding: 'px-1 py-3',
  },
  compact: {
    lineHeight: 'h-[2px]',
    marker: 'size-4',
    markerCheck: 'size-2.5',
    markerDot: 'size-1',
    label:
      'mt-1.5 max-w-[3rem] text-center text-[7px] font-semibold uppercase leading-tight tracking-wide sm:max-w-[4rem] sm:text-[8px]',
    padding: 'px-0.5 py-2',
  },
};

function StepMarker({
  state,
  hasError,
  size = 'default',
  tone = 'primary',
}: {
  state: WorkflowStepVisualState;
  hasError?: boolean;
  size?: WorkflowProgressRailSize;
  tone?: WorkflowProgressRailTone;
}) {
  const toneStyle = RAIL_TONE[tone];
  const sizeStyle = RAIL_SIZE[size];

  if (state === 'upcoming') {
    return (
      <span
        className={cn(
          'bg-background flex items-center justify-center rounded-full border-2',
          sizeStyle.marker,
          hasError ? 'border-rose-500' : toneStyle.upcomingBorder,
        )}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full',
        sizeStyle.marker,
        hasError ? 'bg-rose-500' : toneStyle.markerActive,
      )}
      aria-hidden
    >
      {state === 'completed' ? (
        <Check
          className={cn(
            sizeStyle.markerCheck,
            hasError ? 'text-white' : toneStyle.markerCheck,
          )}
          strokeWidth={3}
        />
      ) : (
        <span
          className={cn(
            'rounded-full',
            sizeStyle.markerDot,
            hasError ? 'bg-white' : toneStyle.markerDot,
          )}
        />
      )}
    </span>
  );
}

export function WorkflowProgressRail<T extends string>({
  steps,
  labels,
  currentStep,
  liveStep,
  getStepState,
  isStepCompleted,
  onStepClick,
  isStepEnabled,
  stepHasError,
  href,
  className,
  progressFillIndex,
  size = 'default',
  tone = 'primary',
}: {
  steps: readonly T[];
  labels: Record<T, string>;
  currentStep: T;
  /** Actual workflow position — used to show a LIVE badge when browsing history. */
  liveStep?: T;
  getStepState: (step: T) => WorkflowStepVisualState;
  isStepCompleted: (step: T) => boolean;
  onStepClick?: (step: T) => void;
  isStepEnabled?: (step: T) => boolean;
  stepHasError?: (step: T) => boolean;
  href?: string;
  className?: string;
  /** Override line fill position (fractional step index, e.g. 1.5 = halfway between steps 1 and 2). */
  progressFillIndex?: number;
  size?: WorkflowProgressRailSize;
  tone?: WorkflowProgressRailTone;
}) {
  const stepCount = steps.length;
  const lineInset = stepCount > 1 ? `${50 / stepCount}%` : '0%';
  const viewingIndex = Math.max(0, steps.indexOf(currentStep));
  const lastCompletedIndex = steps.reduce(
    (last, step, index) => (isStepCompleted(step) ? index : last),
    -1,
  );
  const fillIndex =
    progressFillIndex ?? Math.max(viewingIndex, lastCompletedIndex);
  const progressRatio =
    stepCount > 1 ? Math.min(1, fillIndex / (stepCount - 1)) : 0;
  const toneStyle = RAIL_TONE[tone];
  const sizeStyle = RAIL_SIZE[size];
  const markerLineTop = size === 'compact' ? 'top-4' : 'top-6';

  const content = (
    <div className={cn('relative w-full', sizeStyle.padding, className)}>
      {/* Full track */}
      <div
        className={cn(
          'bg-border absolute rounded-full',
          markerLineTop,
          sizeStyle.lineHeight,
        )}
        style={{ left: lineInset, right: lineInset }}
        aria-hidden
      />
      {/* Filled progress */}
      <div
        className={cn(
          'absolute rounded-full transition-[width] duration-200',
          markerLineTop,
          sizeStyle.lineHeight,
          toneStyle.trackFill,
        )}
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
          const isLive = liveStep != null && step === liveStep;
          const enabled = isStepEnabled?.(step) ?? true;
          const hasError = stepHasError?.(step) ?? false;

          const column = (
            <>
              <span
                className={cn(
                  'flex flex-col items-center rounded-full',
                  isViewing && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
              >
                <StepMarker state={state} hasError={hasError} size={size} tone={tone} />
              </span>
              <span
                className={cn(
                  sizeStyle.label,
                  hasError
                    ? 'text-rose-600 dark:text-rose-400'
                    : isViewing
                      ? 'font-bold text-primary'
                      : state === 'upcoming'
                        ? 'text-muted-foreground/70'
                        : toneStyle.labelActive,
                )}
              >
                {label}
              </span>
              {isViewing ? (
                <span className="text-primary mt-0.5 text-[7px] font-bold uppercase tracking-wider">
                  Viewing
                </span>
              ) : isLive ? (
                <span className="mt-0.5 text-[7px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Live
                </span>
              ) : null}
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
                  isViewing && 'bg-primary/5',
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
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center px-0.5',
                isViewing && 'bg-primary/5 rounded-lg',
              )}
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
