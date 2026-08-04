'use client';

import {
  Building2,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  Gavel,
  Home,
  Info,
  Sparkles,
  Zap,
} from 'lucide-react';

import type { AgentBillingPricingCatalog } from '@/lib/crossub-api/agent-billing-client';
import { cn, formatCurrency } from '@/lib/utils';

import '@/app/pricing/pricing.css';

type PricingCatalog = Omit<AgentBillingPricingCatalog, 'portalServiceLevel'>;

const BED_LABELS: Record<string, string> = {
  studio: 'Studio',
  oneBed: '1 bed',
  twoBed: '2 bed',
  threeBed: '3 bed',
  fourBed: '4 bed',
  fiveBed: '5 bed',
  fiveBedPlus: '6+ bed',
};

function BedTable({
  title,
  rows,
  icon: Icon = Home,
}: {
  title: string;
  rows: Record<string, number | string>;
  icon?: React.ComponentType<{ className?: string }>;
}) {
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
                <td>{BED_LABELS[key] ?? key}</td>
                <td>{typeof value === 'number' ? formatCurrency(value) : value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PricingSection({
  title,
  subtitle,
  badge,
  accent,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  accent: 'cyan' | 'violet' | 'emerald';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section data-accent={accent} className="pricing-section">
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

export function PricingRateCatalog({
  catalog,
  className,
  showPlanSummaries = true,
}: {
  catalog: PricingCatalog;
  className?: string;
  showPlanSummaries?: boolean;
}) {
  const openInspection = catalog.inspections.openInspection;
  const openExampleFirst =
    openInspection?.exampleRent500FirstIncGstAud ?? openInspection?.exampleRent500IncGstAud;
  const openExampleFourth = openInspection?.exampleRent500FourthIncGstAud;
  const included = catalog.level2.includedPerPropertyPerYear;
  const example = catalog.level2.serviceFeeExample;
  const tribunal = catalog.inspections.tribunal;

  return (
    <div className={cn('pricing-page space-y-5', className)}>
      {showPlanSummaries ? (
        <>
          <PricingSection
            accent="cyan"
            icon={Zap}
            badge="Level 1"
            title="Inspection Only Service"
            subtitle={catalog.level1.description}
          >
            <ul className="pricing-check-list">
              <li>Prepaid — pay after the inspector accepts the job</li>
              <li>Open, routine, ingoing, outgoing, and tribunal per the rate cards below</li>
              <li>
                Open inspections:{' '}
                <strong className="text-foreground">50% of weekly rent + GST</strong> (1st–3rd);{' '}
                <strong className="text-foreground">100% + GST from the 4th onwards</strong>
              </li>
            </ul>
          </PricingSection>

          <PricingSection
            accent="violet"
            icon={Building2}
            badge="Level 2"
            title="Full Service"
            subtitle={catalog.level2.description}
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
        </>
      ) : null}

      <PricingSection
        accent="emerald"
        icon={ClipboardList}
        badge="Rates"
        title="All service rates"
        subtitle="All amounts in AUD. GST applies as noted on each line."
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
              Percentage of weekly rent, counted per property (each occurrence in a leasing cycle).
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
            {formatCurrency(tribunal.standardIncGstAud)}{' '}
            <span className="text-muted-foreground text-sm font-normal">inc GST</span>
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Ex GST: {formatCurrency(tribunal.standardExGstAud)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Standard session includes {tribunal.includedHours} hours. Additional time{' '}
            {formatCurrency(tribunal.extraHourlyIncGstAud)}/hr inc GST (
            {formatCurrency(tribunal.extraHourlyExGstAud)}/hr ex GST).
          </p>
        </div>

        <div className="pricing-rate-card pricing-rate-card--standalone" data-rate="service-fee">
          <div className="pricing-rate-card__icon">
            <Building2 className="size-4" />
          </div>
          <p className="font-medium">Full Service platform fee</p>
          <p className="pricing-rate-card__price mt-1">{catalog.level2.serviceFeePercent}%</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            of agent management income (ex GST) · invoiced monthly
          </p>
        </div>

        <div className="pricing-footnote">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Ingoing and outgoing amounts are ex GST; {tribunal.gstPercent}% GST is added at
            invoice. Routine, open inspection examples, and tribunal rates shown include GST where
            marked.
          </span>
        </div>
      </PricingSection>
    </div>
  );
}
