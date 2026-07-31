'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageIntro } from '@/components/agent/page-intro';
import { AgentShell } from '@/components/layout/agent-shell';
import {
  fetchAgentBillingPricing,
  type AgentBillingPricingCatalog,
} from '@/lib/crossub-api/agent-billing-client';
import { PORTAL_SERVICE_LEVEL_LABEL, type AgentPortalServiceLevel } from '@/lib/portal-service-level';
import { cn, formatCurrency } from '@/lib/utils';

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-border/60 bg-card p-5', className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm">{children}</div>
    </section>
  );
}

function BedTable({
  title,
  rows,
}: {
  title: string;
  rows: Record<string, number | string>;
}) {
  const labels: Record<string, string> = {
    studio: 'Studio',
    oneBed: '1 bed',
    twoBed: '2 bed',
    threeBed: '3 bed',
    fourBed: '4 bed',
    fiveBed: '5 bed',
    fiveBedPlus: '6+ bed',
  };
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
        {title}
      </p>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Bedrooms</th>
              <th className="px-3 py-2 font-medium">Ex GST (each)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rows).map(([key, value]) => (
              <tr key={key} className="border-t border-border/40">
                <td className="px-3 py-2">{labels[key] ?? key}</td>
                <td className="px-3 py-2 font-medium">
                  {typeof value === 'number' ? formatCurrency(value) : value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [catalog, setCatalog] = useState<AgentBillingPricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAgentBillingPricing()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load pricing');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const levelLabel =
    catalog?.portalServiceLevel != null
      ? PORTAL_SERVICE_LEVEL_LABEL[catalog.portalServiceLevel as AgentPortalServiceLevel]
      : null;

  const example = catalog?.level2.serviceFeeExample;

  return (
    <AgentShell>
      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        <PageIntro
          title="Platform pricing"
          description="How CROSSUB charges your agency for inspections, tribunal, and Full Service."
        />

        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading pricing…
          </div>
        ) : null}

        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : null}

        {catalog ? (
          <>
            {levelLabel ? (
              <p className="text-muted-foreground text-sm">
                Your account: <strong className="text-foreground">{levelLabel}</strong> ·
                Inspections collected{' '}
                <strong className="text-foreground">
                  {catalog.portalServiceLevel === 'LEVEL_2_FULL_MANAGEMENT'
                    ? 'postpaid (monthly invoice)'
                    : 'prepaid (upfront)'}
                </strong>
              </p>
            ) : null}

            <Section title="Level 1 — Inspection & tribunal">
              <p>{catalog.level1.description}</p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                <li>Pay before each inspection or tribunal session is scheduled</li>
                <li>Open, routine, ingoing, outgoing, and tribunal per the tables below</li>
              </ul>
            </Section>

            <Section title="Level 2 — Full management">
              <p>{catalog.level2.description}</p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Included per property each year:</strong>{' '}
                {catalog.level2.includedPerPropertyPerYear.ROUTINE_INSPECTION} routine,{' '}
                {catalog.level2.includedPerPropertyPerYear.INGOING_INSPECTION} ingoing,{' '}
                {catalog.level2.includedPerPropertyPerYear.OUTGOING_INSPECTION} outgoing
                inspection. Open inspections and tribunal are always charged.
              </p>
              {example ? (
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                  <p className="font-medium">Full Service fee example</p>
                  <p className="text-muted-foreground mt-2 font-mono text-xs leading-relaxed">
                    Weekly rent {formatCurrency(example.weeklyRentAud)} ×{' '}
                    {example.managementRatePercent}% management ={' '}
                    {formatCurrency(example.agentIncomeAud)} agent income
                    <br />
                    CROSSUB fee {formatCurrency(example.agentIncomeAud)} ×{' '}
                    {catalog.level2.serviceFeePercent}% ={' '}
                    <strong>{formatCurrency(example.crossubFeeAud)}</strong> per week (invoiced
                    monthly)
                  </p>
                </div>
              ) : null}
            </Section>

            <Section title="Inspection & tribunal rates">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium">Routine</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatCurrency(catalog.inspections.routineIncGstAud)} inc GST
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium">Open inspection</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {catalog.inspections.openInspection.firstThree}
                    <br />
                    {catalog.inspections.openInspection.fourthOnwards}
                    {catalog.inspections.openInspection.exampleRent500IncGstAud != null ? (
                      <>
                        <br />
                        e.g. rent $500 (1st) ={' '}
                        {formatCurrency(catalog.inspections.openInspection.exampleRent500IncGstAud)}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3 sm:col-span-2">
                  <p className="font-medium">Tribunal</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatCurrency(catalog.inspections.tribunal.standardExGstAud)} ex GST standard
                    ({catalog.inspections.tribunal.includedHours} hrs incl.) +{' '}
                    {formatCurrency(catalog.inspections.tribunal.extraHourlyExGstAud)}/hr beyond +{' '}
                    {catalog.inspections.tribunal.gstPercent}% GST
                  </p>
                </div>
              </div>

              <BedTable
                title="Ingoing / outgoing — apartment, unit, townhouse, studio"
                rows={catalog.inspections.fieldInspectionsCompactExGst}
              />
              <BedTable
                title="Ingoing / outgoing — house"
                rows={catalog.inspections.fieldInspectionsHouseExGst}
              />
              <p className="text-muted-foreground text-xs">
                All ingoing/outgoing amounts are ex GST; {catalog.inspections.tribunal.gstPercent}%
                GST is added at invoice.
              </p>
            </Section>
          </>
        ) : null}
      </div>
    </AgentShell>
  );
}
