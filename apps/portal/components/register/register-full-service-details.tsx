'use client';

import { CalendarCheck, Check, DoorOpen, Home, Sparkles } from 'lucide-react';

import type { AgentBillingPricingCatalog } from '@/lib/crossub-api/agent-billing-client';
import { formatCurrency } from '@/lib/utils';

export type RegistrationPricingCatalog = Omit<
  AgentBillingPricingCatalog,
  'portalServiceLevel'
>;

export function FullServiceFeeExample({ catalog }: { catalog: RegistrationPricingCatalog }) {
  const example = catalog.level2.serviceFeeExample;
  if (!example) return null;

  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-500/8 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
        <p className="font-semibold">Full Service fee example</p>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        Standard {example.managementRatePercent}% management rate ·{' '}
        {catalog.level2.serviceFeePercent}% of your management income invoiced monthly
      </p>
      <div className="text-muted-foreground mt-2 space-y-1 font-mono text-xs leading-relaxed">
        <p>
          Weekly rent {formatCurrency(example.weeklyRentAud)} × {example.managementRatePercent}%
          management = {formatCurrency(example.agentIncomeAud)} agent income
        </p>
        <p>
          CROSSUB fee {formatCurrency(example.agentIncomeAud)} ×{' '}
          {catalog.level2.serviceFeePercent}% = {formatCurrency(example.crossubFeeAud)} / week × 4
          weeks ={' '}
          <strong className="text-foreground">
            {formatCurrency(example.crossubFeeAud * 4)}
          </strong>{' '}
          per month
        </p>
      </div>
    </div>
  );
}

export function FullServicePricingDetails({
  catalog,
  omitFeeExample = false,
}: {
  catalog: RegistrationPricingCatalog;
  /** When the fee example is already shown above (e.g. plan card). */
  omitFeeExample?: boolean;
}) {
  const included = catalog.level2.includedPerPropertyPerYear;

  return (
    <div className="space-y-4 border-t border-border/60 pt-4 text-sm">
      {included ? (
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Included per property each year
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 px-2.5 py-1 text-xs">
              <CalendarCheck className="size-3.5 text-violet-600 dark:text-violet-400" />
              <strong>{included.ROUTINE_INSPECTION}</strong> routine
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 px-2.5 py-1 text-xs">
              <DoorOpen className="size-3.5 text-violet-600 dark:text-violet-400" />
              <strong>{included.INGOING_INSPECTION}</strong> ingoing
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 px-2.5 py-1 text-xs">
              <Home className="size-3.5 text-violet-600 dark:text-violet-400" />
              <strong>{included.OUTGOING_INSPECTION}</strong> outgoing
            </span>
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Inspections and tribunal are always charged separately.
          </p>  
        </div>
      ) : null}

      {!omitFeeExample ? <FullServiceFeeExample catalog={catalog} /> : null}

      <ul className="text-muted-foreground space-y-1.5 text-xs leading-relaxed">
        <li className="flex gap-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
          Leasing, maintenance, accounting, messaging, and all property workflows
        </li>
        <li className="flex gap-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
          Orders confirmed within 24 hours; auto-refund if unaccepted (inspections &amp; tribunal)
        </li>
      </ul>
    </div>
  );
}
