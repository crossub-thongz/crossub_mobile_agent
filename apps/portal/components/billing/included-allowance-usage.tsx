'use client';

import {
  includedAllowanceUsageLabel,
  platformChargeAllowanceUsage,
  platformChargeAllowanceUsageLabel,
  type AgentBillingCharge,
  type AgentBillingIncludedUsageRow,
} from '@/lib/crossub-api/agent-billing-client';

const PROPERTY_USAGE_ROWS = [
  { key: 'routine', label: 'Routine' },
  { key: 'ingoing', label: 'Ingoing' },
  { key: 'outgoing', label: 'Outgoing' },
] as const;

/** Charge-level usage, shown even when the amount column already says remaining. */
export function ChargeIncludedUsageLine({
  charge,
  className,
}: {
  charge: AgentBillingCharge;
  className?: string;
}) {
  const usage = platformChargeAllowanceUsage(charge);
  if (!usage) return null;
  return (
    <p className={className ?? 'text-muted-foreground mt-1 text-xs leading-relaxed'}>
      Included this year: {platformChargeAllowanceUsageLabel(usage)}
    </p>
  );
}

export function PropertyIncludedUsageCard({
  usage,
}: {
  usage: AgentBillingIncludedUsageRow;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Included inspections {usage.calendarYear}
      </p>
      <p className="mt-0.5 text-sm font-semibold">Usage this year</p>
      <ul className="mt-3 space-y-2">
        {PROPERTY_USAGE_ROWS.map(({ key, label }) => {
          const row = usage[key];
          return (
            <li key={key} className="flex items-baseline justify-between gap-3 text-sm">
              <span>{label}</span>
              <span className="shrink-0 text-right font-medium tabular-nums">
                {includedAllowanceUsageLabel(row)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        Slots deduct when a job is completed. Invoice lines still show remaining slots for included
        jobs.
      </p>
    </section>
  );
}

export function AgencyIncludedUsageByProperty({
  rows,
}: {
  rows: AgentBillingIncludedUsageRow[];
}) {
  if (rows.length === 0) return null;
  const year = rows[0]?.calendarYear;
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Included inspections by property</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {year} calendar year · used and remaining after completed jobs
        </p>
      </header>
      <ul className="divide-y">
        {rows.map((row) => (
          <li key={row.propertyId} className="px-4 py-3">
            <p className="text-sm font-medium">{row.propertyLabel}</p>
            <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-3">
              {PROPERTY_USAGE_ROWS.map(({ key, label }) => (
                <div key={key} className="flex items-baseline justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums">
                    {includedAllowanceUsageLabel(row[key])}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
