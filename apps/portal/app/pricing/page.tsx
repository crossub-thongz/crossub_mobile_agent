'use client';

import {
  Building2,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  Gavel,
  Home,
  Info,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageIntro } from '@/components/agent/page-intro';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import {
  fetchAgentBillingPricing,
  type AgentBillingPricingCatalog,
} from '@/lib/crossub-api/agent-billing-client';
import { PORTAL_SERVICE_LEVEL_LABEL, type AgentPortalServiceLevel } from '@/lib/portal-service-level';
import { cn, formatCurrency } from '@/lib/utils';

import './pricing.css';

type PricingAccent = 'cyan' | 'violet' | 'emerald';

function PricingSection({
  title,
  subtitle,
  badge,
  accent,
  icon: Icon,
  children,
  className,
  delayClass,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  accent: PricingAccent;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  delayClass?: string;
}) {
  return (
    <section
      data-accent={accent}
      className={cn('pricing-section pricing-animate-in', delayClass, className)}
    >
      <div className="pricing-section__header">
        <div className="pricing-section__icon">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {badge ? <span className="pricing-section__badge">{badge}</span> : null}
          </div>
          {subtitle ? (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="pricing-section__body space-y-4 text-sm">{children}</div>
    </section>
  );
}

function BedTable({
  title,
  rows,
  icon: Icon = Home,
}: {
  title: string;
  rows: Record<string, number | string>;
  icon?: React.ComponentType<{ className?: string }>;
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
    <div className="pricing-bed-table-column">
      <p className="pricing-bed-table-column__title flex items-start gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <span>{title}</span>
      </p>
      <div className="pricing-bed-table-wrap overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Bedrooms</th>
              <th>Ex GST (each)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rows).map(([key, value]) => (
              <tr key={key}>
                <td>{labels[key] ?? key}</td>
                <td>{typeof value === 'number' ? formatCurrency(value) : value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllowanceCell({
  usage,
}: {
  usage: { included: number; used: number; remaining: number };
}) {
  if (usage.remaining > 0) {
    return (
      <span className="pricing-allowance pricing-allowance--free">
        <strong>{usage.remaining}</strong> free
        <span className="text-muted-foreground font-normal">
          {' '}
          / {usage.included}
        </span>
      </span>
    );
  }
  return (
    <span className="pricing-allowance pricing-allowance--used" title="Allowance used — further jobs are invoiced">
      Used
      <span className="text-muted-foreground font-normal">
        {' '}
        ({usage.used}/{usage.included})
      </span>
    </span>
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

  const portalLevel = catalog?.portalServiceLevel as AgentPortalServiceLevel | undefined;
  const levelLabel =
    portalLevel != null ? PORTAL_SERVICE_LEVEL_LABEL[portalLevel] : null;

  const isLevel2 = portalLevel === 'LEVEL_2_FULL_MANAGEMENT';
  const example = catalog?.level2.serviceFeeExample;
  const openInspection = catalog?.inspections.openInspection;
  const openExampleFirst =
    openInspection?.exampleRent500FirstIncGstAud ?? openInspection?.exampleRent500IncGstAud;
  const openExampleFourth = openInspection?.exampleRent500FourthIncGstAud;
  const included = catalog?.level2.includedPerPropertyPerYear;
  const includedUsage = catalog?.level2.includedUsageByProperty ?? [];
  const usageYear = includedUsage[0]?.calendarYear ?? new Date().getFullYear();

  return (
    <AgentShell>
      <div className="pricing-page mx-auto max-w-4xl space-y-6 pb-12">
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
          <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}

        {catalog ? (
          <>
            {portalLevel ? (
              <div
                className="pricing-account-banner pricing-animate-in relative px-4 py-4 sm:px-5 sm:py-5"
                data-level={isLevel2 ? 'level-2' : 'level-1'}
              >
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                      Your account
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                      <PortalServiceLevelBadge
                        level={portalLevel}
                        variant="level"
                        size="md"
                        className="pricing-account-level-tag"
                      />
                      {levelLabel ? (
                        <p className="text-base font-semibold tracking-tight sm:text-lg">
                          {levelLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-xl border border-primary/25 bg-background/70 px-3 py-2 text-right backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Inspections
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {isLevel2 ? 'Postpaid · monthly invoice' : 'Prepaid · pay on accept'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <PricingSection
              accent="cyan"
              icon={Zap}
              badge="Level 1"
              title="Inspection & tribunal"
              subtitle={catalog.level1.description}
              delayClass="pricing-animate-in-delay-1"
            >
              <ul className="pricing-check-list">
                <li>Place inspection orders anytime — no payment required upfront</li>
                <li>
                  Pay after the inspector accepts the job (Bill page), or tribunal when opening a
                  case
                </li>
                <li>Open, routine, ingoing, outgoing, and tribunal per the rate cards below</li>
                <li>
                  Open inspections:{' '}
                  <strong className="text-foreground">50% of weekly rent + GST</strong> for the
                  1st, 2nd, and 3rd;{' '}
                  <strong className="text-foreground">100% of weekly rent + GST from the 4th onwards</strong>
                </li>
              </ul>
            </PricingSection>

            <PricingSection
              accent="violet"
              icon={Building2}
              badge="Level 2"
              title="Full management"
              subtitle={catalog.level2.description}
              delayClass="pricing-animate-in-delay-2"
            >
              {included ? (
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Included per property each year
                  </p>
                  <div className="pricing-chip-row">
                    <span className="pricing-chip">
                      <CalendarCheck className="size-3.5 text-violet-600 dark:text-violet-400" />
                      <strong>{included.ROUTINE_INSPECTION}</strong> routine
                    </span>
                    <span className="pricing-chip">
                      <DoorOpen className="size-3.5 text-violet-600 dark:text-violet-400" />
                      <strong>{included.INGOING_INSPECTION}</strong> ingoing
                    </span>
                    <span className="pricing-chip">
                      <Home className="size-3.5 text-violet-600 dark:text-violet-400" />
                      <strong>{included.OUTGOING_INSPECTION}</strong> outgoing
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                    Open inspections and tribunal are always charged separately.
                  </p>
                </div>
              ) : null}

              {isLevel2 && includedUsage.length > 0 ? (
                <div className="pricing-included-usage">
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Your included inspections remaining ({usageYear})
                  </p>
                  <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                    Included jobs do not appear on Bill — they are free until you use your yearly
                    allowance. After that, charges accrue to your monthly invoice.
                  </p>
                  <div className="pricing-included-usage__scroll overflow-x-auto">
                    <table className="pricing-included-usage__table">
                      <thead>
                        <tr>
                          <th>Property</th>
                          <th>Routine</th>
                          <th>Ingoing</th>
                          <th>Outgoing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {includedUsage.map((row) => (
                          <tr key={row.propertyId}>
                            <td className="font-medium">{row.propertyLabel}</td>
                            <td>
                              <AllowanceCell usage={row.routine} />
                            </td>
                            <td>
                              <AllowanceCell usage={row.ingoing} />
                            </td>
                            <td>
                              <AllowanceCell usage={row.outgoing} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {isLevel2 && includedUsage.length === 0 ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Included inspection allowances apply per property. Add a property to see how many
                  free routine, ingoing, and outgoing inspections you have left this year.
                </p>
              ) : null}

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Open inspection tiers:</strong>{' '}
                <span className="text-foreground">50% of weekly rent + GST</span> for occurrences
                1–3 per property;{' '}
                <span className="text-foreground">100% of weekly rent + GST from the 4th onwards</span>.
              </div>

              {example ? (
                <div className="pricing-callout">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
                    <p className="font-semibold">Full Service fee example</p>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Standard {example.managementRatePercent}% management rate ·{' '}
                    {catalog.level2.serviceFeePercent}% of your management income invoiced monthly
                  </p>
                  <div className="pricing-callout__formula">
                    Weekly rent {formatCurrency(example.weeklyRentAud)} ×{' '}
                    {example.managementRatePercent}% management ={' '}
                    {formatCurrency(example.agentIncomeAud)} agent income
                    <br />
                    CROSSUB fee {formatCurrency(example.agentIncomeAud)} ×{' '}
                    {catalog.level2.serviceFeePercent}% ={' '}
                    <strong className="text-foreground">
                      {formatCurrency(example.crossubFeeAud)}
                    </strong>{' '}
                    per week (invoiced monthly)
                  </div>
                </div>
              ) : null}
            </PricingSection>

            <PricingSection
              accent="emerald"
              icon={ClipboardList}
              badge="Rates"
              title="Inspection & tribunal rates"
              subtitle="All amounts shown in AUD. GST applies as noted on each line."
              delayClass="pricing-animate-in-delay-3"
            >
              <div className="pricing-rate-grid">
                <div className="pricing-rate-card" data-rate="routine">
                  <div className="pricing-rate-card__icon">
                    <CalendarCheck className="size-4" />
                  </div>
                  <p className="font-medium">Routine inspection</p>
                  <p className="pricing-rate-card__price mt-1">
                    {formatCurrency(catalog.inspections.routineIncGstAud)}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">inc GST · flat rate</p>
                </div>

                <div className="pricing-rate-card pricing-rate-card--wide" data-rate="open">
                  <div className="pricing-rate-card__icon">
                    <DoorOpen className="size-4" />
                  </div>
                  <p className="font-medium">Open inspection</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Percentage of weekly rent, counted per property (each occurrence in a leasing
                    cycle).
                  </p>

                  <div className="pricing-tier-split">
                    <div className="pricing-tier" data-tier="standard">
                      <p className="pricing-tier__label">1st · 2nd · 3rd</p>
                      <p className="pricing-tier__value">
                        {openInspection?.firstThree ?? '50% of weekly rent + GST'}
                      </p>
                    </div>
                    <div className="pricing-tier" data-tier="premium">
                      <p className="pricing-tier__label">4th onwards</p>
                      <p className="pricing-tier__value">
                        {openInspection?.fourthOnwards ?? '100% of weekly rent + GST'}
                      </p>
                    </div>
                  </div>

                  {openExampleFirst != null || openExampleFourth != null ? (
                    <div className="pricing-example-box">
                      {openExampleFirst != null ? (
                        <p>
                          e.g. $500/week rent — 1st open inspection (50%) ={' '}
                          <strong>{formatCurrency(openExampleFirst)}</strong> inc GST
                        </p>
                      ) : null}
                      {openExampleFourth != null ? (
                        <p className={openExampleFirst != null ? 'mt-1' : undefined}>
                          e.g. $500/week rent — 4th open inspection onwards (100%) ={' '}
                          <strong>{formatCurrency(openExampleFourth)}</strong> inc GST
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="pricing-bed-table-grid">
                <BedTable
                  title="Ingoing / outgoing — apartment, unit, townhouse, studio"
                  rows={catalog.inspections.fieldInspectionsCompactExGst}
                />
                <BedTable
                  title="Ingoing / outgoing — house"
                  rows={catalog.inspections.fieldInspectionsHouseExGst}
                />
              </div>

              <div className="pricing-rate-card pricing-rate-card--standalone" data-rate="tribunal">
                <div className="pricing-rate-card__icon">
                  <Gavel className="size-4" />
                </div>
                <p className="font-medium">Tribunal</p>
                <p className="pricing-rate-card__price mt-1">
                  {formatCurrency(catalog.inspections.tribunal.standardIncGstAud)}{' '}
                  <span className="text-muted-foreground text-sm font-normal">inc GST</span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Standard session includes {catalog.inspections.tribunal.includedHours} hours.
                  Additional time{' '}
                  {formatCurrency(catalog.inspections.tribunal.extraHourlyIncGstAud)}/hr inc GST.
                </p>
              </div>

              <div className="pricing-footnote pricing-animate-in-delay-4">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Ingoing and outgoing amounts are ex GST;{' '}
                  {catalog.inspections.tribunal.gstPercent}% GST is added at invoice. Tribunal
                  rates shown include GST.
                </span>
              </div>
            </PricingSection>
          </>
        ) : null}
      </div>
    </AgentShell>
  );
}
