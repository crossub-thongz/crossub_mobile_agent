'use client';

import {
  Building2,
  CalendarCheck,
  DoorOpen,
  FileText,
  Home,
  Loader2,
  Sparkles,
  UserSearch,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageIntro } from '@/components/agent/page-intro';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { PricingOrderHost } from '@/components/pricing/pricing-order-host';
import { PricingRateCatalog } from '@/components/pricing/pricing-rate-catalog';
import {
  fetchAgentBillingPricing,
  level2IncludedPackageItems,
  openInspectionRateLabel,
  type AgentBillingPricingCatalog,
} from '@/lib/crossub-api/agent-billing-client';
import { PORTAL_SERVICE_LEVEL_LABEL, type AgentPortalServiceLevel } from '@/lib/portal-service-level';
import { cn, formatAgreementPeriod, formatCurrency } from '@/lib/utils';

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
    <span className="pricing-allowance pricing-allowance--used" title="Allowance used — further jobs are prepaid">
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
  const isLevel3 = portalLevel === 'LEVEL_3_LEGACY';
  const hasIncludedInspections = isLevel2 || isLevel3;
  const example = catalog?.level2.serviceFeeExample;
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
                data-level={isLevel3 ? 'level-3' : isLevel2 ? 'level-2' : 'level-1'}
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
                      How you pay
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {catalog.platformBilling?.complimentaryAllServices
                        ? 'Complimentary · no payment'
                        : isLevel3
                          ? 'Invoice + prepaid extras'
                          : isLevel2
                            ? 'Invoice + prepaid extras'
                            : 'Prepaid · pay on order'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {catalog.platformBilling?.complimentaryAllServices ? (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                Complimentary account — inspections, tribunal, letting fee, and Full Service are
                not charged.
              </p>
            ) : catalog.platformBilling?.legacyFreeOpenInspections ? (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                Open inspections stay free under your existing client arrangement. Other services
                follow the rates below.
              </p>
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
                <li>Place inspection orders at anytime</li>
                <li>
                  Pay when you place the inspection order, or tribunal when opening a
                  case
                </li>
                <li>Open, Routine, Ingoing, Outgoing, and Tribunal follow per the cards below</li>
                <li>
                  Open inspections (when CROSSUB conducts):{' '}
                  <strong className="text-foreground">
                    {openInspectionRateLabel(catalog.inspections.openInspection)}
                  </strong>
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
                  {level2IncludedPackageItems(catalog).length > 0 ? (
                    <div className="mt-3">
                      <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                        Also included
                      </p>
                      <div className="pricing-chip-row">
                        {level2IncludedPackageItems(catalog).map((item) => (
                          <span key={item.key} className="pricing-chip">
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
                    Extra inspections after the yearly allowance, and every CROSSUB-conducted Open,
                    are prepaid. Tribunal, management fee, and insurance go on the monthly invoice.
                    Reference checks and the contract agreement are included in Full Service.
                  </p>
                </div>
              ) : null}

              {hasIncludedInspections && includedUsage.length > 0 ? (
                <div className="pricing-included-usage">
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    Your included inspections remaining ({usageYear})
                  </p>
                  <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                    Included jobs do not appear as a charge on Invoice — they are free until you
                    use your yearly allowance. After that, extras are prepaid like Level 1.
                  </p>
                  <div className="pricing-included-usage__scroll overflow-x-auto">
                    <table className="pricing-included-usage__table">
                      <thead>
                        <tr>
                          <th>Property</th>
                          <th>Agreement</th>
                          <th>Routine</th>
                          <th>Ingoing</th>
                          <th>Outgoing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {includedUsage.map((row) => (
                          <tr key={row.propertyId}>
                            <td className="font-medium">{row.propertyLabel}</td>
                            <td className="text-muted-foreground text-xs">
                              {formatAgreementPeriod(row.agreementStart, row.agreementEnd)}
                            </td>
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

              {hasIncludedInspections && includedUsage.length === 0 ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Included inspection allowances apply per property. Add a property to see how many
                  free routine, ingoing, and outgoing inspections you have left this year.
                </p>
              ) : null}

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Open inspections (when CROSSUB conducts):</strong>{' '}
                {openInspectionRateLabel(catalog.inspections.openInspection)}
                {catalog.inspections.lettingFee?.summary
                  ? ` Letting fee: ${catalog.inspections.lettingFee.summary}`
                  : ''}
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
                    {formatCurrency(example.crossubFeeAud)} / week × 4 weeks ={' '}
                    <strong className="text-foreground">
                      {formatCurrency(example.crossubFeeAud * 4)}
                    </strong>{' '}
                    per month
                  </div>
                </div>
              ) : null}
            </PricingSection>

            {catalog.level3 ? (
              <PricingSection
                accent="emerald"
                icon={Sparkles}
                badge="Level 3"
                title="Legacy clients"
                subtitle={catalog.level3.description}
                delayClass="pricing-animate-in-delay-3"
              >
                <ul className="pricing-check-list">
                  <li>Open inspections are not charged</li>
                  <li>
                    Included routine (3), ingoing (1) and outgoing (1) per property per year are
                    free; extras are prepaid
                  </li>
                  <li>
                    Monthly invoice: letting fee, management fee, tribunal, and insurance
                  </li>
                </ul>
              </PricingSection>
            ) : null}

            {catalog ? (
              <PricingOrderHost>
                {(orderActions) => {
                  const { portalServiceLevel: _level, ...ratesCatalog } = catalog;
                  return (
                    <PricingRateCatalog
                      catalog={ratesCatalog}
                      showPlanSummaries={false}
                      orderActions={orderActions}
                      className="pricing-animate-in-delay-3"
                    />
                  );
                }}
              </PricingOrderHost>
            ) : null}
          </>
        ) : null}
      </div>
    </AgentShell>
  );
}
