'use client';

import Link from 'next/link';

import {
  LEASING_ITEM_STATUS_TONE,
  LEASING_LIFECYCLE_STEP_LABEL,
  LEASING_LIFECYCLE_STEP_ORDER,
  LEASING_TONE_DOT,
  LEASING_UI,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';
import { deriveStepStatus } from '@/lib/leasing/lifecycle';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { cn } from '@/lib/utils';

export function LeasingLifecycleStepRail({
  detail,
  currentStep,
  onStepClick,
  href,
  className,
}: {
  detail: LeasingPropertyDetail;
  currentStep: LeasingLifecycleStep;
  onStepClick?: (step: LeasingLifecycleStep) => void;
  href?: string;
  className?: string;
}) {
  const content = (
    <div
      className={cn(
        'scrollbar-none flex w-full gap-1.5 overflow-x-auto rounded-xl border bg-card p-1.5',
        className,
      )}
    >
      {LEASING_LIFECYCLE_STEP_ORDER.map((step, index) => {
        const status = deriveStepStatus(detail, step);
        const tone = LEASING_ITEM_STATUS_TONE[status];
        const isCurrent = currentStep === step;
        const sharedClass = cn(
          'flex h-auto min-w-0 shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors sm:px-3',
          isCurrent ? LEASING_UI.tabActive : 'text-muted-foreground',
          onStepClick && !isCurrent && 'hover:bg-secondary/40',
        );

        const inner = (
          <>
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums',
                isCurrent ? 'bg-violet-500/20 text-violet-900 dark:text-violet-100' : 'bg-secondary text-foreground/80',
              )}
            >
              {index + 1}
            </span>
            <span className="min-w-0 font-medium leading-tight">
              <span className="line-clamp-2 sm:whitespace-nowrap">
                {LEASING_LIFECYCLE_STEP_LABEL[step]}
              </span>
            </span>
            <span
              className={cn('inline-flex size-1.5 shrink-0 rounded-full', LEASING_TONE_DOT[tone])}
            />
          </>
        );

        if (onStepClick) {
          return (
            <button key={step} type="button" onClick={() => onStepClick(step)} className={sharedClass}>
              {inner}
            </button>
          );
        }

        return (
          <div key={step} className={sharedClass} aria-current={isCurrent ? 'step' : undefined}>
            {inner}
          </div>
        );
      })}
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
