'use client';

import { CalendarCheck, Check, DoorOpen, FileText, Home, UserSearch } from 'lucide-react';

import { FullServiceFeeExample } from '@/components/pricing/full-service-fee-example';
import {
  type AgentBillingPricingCatalog,
  level2IncludedPackageItems,
} from '@/lib/crossub-api/agent-billing-client';

export type RegistrationPricingCatalog = Omit<
  AgentBillingPricingCatalog,
  'portalServiceLevel'
>;

export { FullServiceFeeExample };

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
          {level2IncludedPackageItems(catalog).length > 0 ? (
            <div className="mt-3">
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                Also included
              </p>
              <div className="flex flex-wrap gap-2">
                {level2IncludedPackageItems(catalog).map((item) => (
                  <span
                    key={item.key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 px-2.5 py-1 text-xs"
                  >
                    {item.key === 'contract_agreement' ? (
                      <FileText className="size-3.5 text-violet-600 dark:text-violet-400" />
                    ) : (
                      <UserSearch className="size-3.5 text-violet-600 dark:text-violet-400" />
                    )}
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Inspections and tribunal are always charged separately. Reference checks and the
            contract agreement are included in Full Service.
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
          Orders confirmed within 48 hours; auto-refund if no inspector confirms (inspections &amp; tribunal)
        </li>
      </ul>
    </div>
  );
}
