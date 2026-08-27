'use client';

import { useState } from 'react';
import { CalendarDays, ChevronDown, Info, Sparkles } from 'lucide-react';

import type { AgentBillingPricingCatalog } from '@/lib/crossub-api/agent-billing-client';
import { cn, formatCurrency } from '@/lib/utils';

export type FullServiceFeeExampleCatalog = Pick<AgentBillingPricingCatalog, 'level2'>;

function roundAud(n: number): number {
  return Math.round(n * 100) / 100;
}

function exampleFigures(catalog: FullServiceFeeExampleCatalog) {
  const example = catalog.level2.serviceFeeExample;
  const weeklyRentAud = example?.weeklyRentAud ?? 500;
  const managementRatePercent = Math.max(example?.managementRatePercent ?? 4, 4);
  const serviceFeePercent = catalog.level2.serviceFeePercent;
  const exampleActiveDays = example?.exampleActiveDays ?? 30;
  const dailyUnrounded =
    ((weeklyRentAud * (managementRatePercent / 100)) / 7) * (serviceFeePercent / 100);
  return {
    weeklyRentAud,
    managementRatePercent,
    serviceFeePercent,
    exampleActiveDays,
    feePerActiveDayAud: example?.feePerActiveDayAud ?? roundAud(dailyUnrounded),
    totalFeeAud:
      example?.totalFeeAud ?? roundAud(roundAud(dailyUnrounded) * exampleActiveDays),
  };
}

function FormulaTerm({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <span className="inline-flex min-w-0 flex-col items-center text-center">
      <span className="font-semibold text-violet-700 dark:text-violet-300">{value}</span>
      <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
    </span>
  );
}

export function FullServiceFeeExample({
  catalog,
  collapsible = true,
  className,
}: {
  catalog: FullServiceFeeExampleCatalog;
  collapsible?: boolean;
  className?: string;
}) {
  const example = catalog.level2.serviceFeeExample;
  const [open, setOpen] = useState(true);
  if (!example) return null;
  const figures = exampleFigures(catalog);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-500/8',
        className,
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        onClick={() => collapsible && setOpen((current) => !current)}
        aria-expanded={open}
        disabled={!collapsible}
      >
        <Sparkles className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">Full Service fee example</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {figures.serviceFeePercent}% of your management income · Minimum{' '}
            {figures.managementRatePercent}% management rate · Billed by active days
          </span>
        </span>
        {collapsible ? (
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        ) : null}
      </button>
      {open ? (
        <div className="space-y-3 px-4 pb-4">
          <div className="rounded-xl border border-violet-500/15 bg-background px-3 py-3">
            <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3 text-xs">
              <FormulaTerm
                value={`(${formatCurrency(figures.weeklyRentAud)}`}
                label="Weekly rent)"
              />
              <span className="pb-4 text-muted-foreground">×</span>
              <FormulaTerm
                value={`(${figures.managementRatePercent}%`}
                label="Management rate incl. GST)"
              />
              <span className="pb-4 text-muted-foreground">÷</span>
              <FormulaTerm value="(7" label="Days in week)" />
              <span className="pb-4 text-muted-foreground">×</span>
              <FormulaTerm
                value={`(${figures.serviceFeePercent}%`}
                label="CROSSUB fee)"
              />
              <span className="pb-4 text-muted-foreground">=</span>
              <span className="inline-flex flex-col items-center rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-center">
                <span className="font-semibold text-violet-700 dark:text-violet-300">
                  {formatCurrency(figures.feePerActiveDayAud)}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  per active day
                </span>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-violet-500/25 pt-3 text-xs">
              <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-3.5 text-violet-600 dark:text-violet-400" />
                <span>
                  <strong className="text-foreground">{figures.exampleActiveDays} active days</strong>{' '}
                  in the system
                </span>
              </p>
              <p className="font-semibold text-violet-700 dark:text-violet-300">
                {formatCurrency(figures.totalFeeAud)}{' '}
                <span className="font-medium text-muted-foreground">Total fee</span>
              </p>
            </div>
          </div>
          <p className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Calculated using your actual management rate, subject to a minimum rate of 4% incl.
            GST. Invoiced monthly.
          </p>
        </div>
      ) : null}
    </div>
  );
}
