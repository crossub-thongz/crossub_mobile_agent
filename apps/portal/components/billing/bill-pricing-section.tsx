'use client';

import { ChevronDown, Receipt } from 'lucide-react';
import { useState } from 'react';

import { PricingRateCatalog } from '@/components/pricing/pricing-rate-catalog';
import type { AgentBillingPricingCatalog } from '@/lib/crossub-api/agent-billing-client';
import { cn } from '@/lib/utils';

import '@/app/pricing/pricing.css';

type BillPricingSectionProps = {
  catalog: AgentBillingPricingCatalog;
};

export function BillPricingSection({ catalog }: BillPricingSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const isLevel2 = catalog.portalServiceLevel === 'LEVEL_2_FULL_MANAGEMENT';
  const showServiceFeeCard =
    isLevel2 || catalog.portalServiceLevel === 'LEVEL_3_LEGACY';

  return (
    <section className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Receipt className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">How we charge</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {catalog.platformBilling?.complimentaryAllServices
                ? 'Complimentary account — inspections, tribunal, letting fee, and Full Service are not charged.'
                : catalog.portalServiceLevel === 'LEVEL_2_FULL_MANAGEMENT'
                  ? 'Extra inspections after included usage, and Opens, are prepaid. The monthly invoice is management fee, tribunal, and insurance.'
                  : catalog.portalServiceLevel === 'LEVEL_3_LEGACY'
                    ? 'Open inspections are free. Extra routine, ingoing and outgoing after included usage are prepaid. The monthly invoice is letting fee, management fee, tribunal, and insurance.'
                    : 'Prepaid inspection and tribunal rates — pay when you place the order (or at tribunal create).'}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground mt-1 size-5 shrink-0 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div className="border-t px-4 pb-4 pt-2">
          <PricingRateCatalog
            catalog={catalog}
            showPlanSummaries
            showServiceFeeCard={showServiceFeeCard}
          />
        </div>
      ) : null}
    </section>
  );
}
