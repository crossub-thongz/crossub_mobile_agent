'use client';

import {
  Building2,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  FileText,
  Gavel,
  Home,
  Info,
  Plus,
  Sparkles,
  UserSearch,
  Zap,
} from 'lucide-react';

import type { PricingOrderActions } from '@/components/pricing/pricing-order-host';
import { Button } from '@/components/ui/button';
import {
  level2IncludedPackageItems,
  openInspectionIncGstAud,
  openInspectionIsFree,
  openInspectionRateLabel,
  type AgentBillingPricingCatalog,
} from '@/lib/crossub-api/agent-billing-client';
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

function PricingAddButton({
  onClick,
  label = 'Add',
}: {
  onClick?: () => void;
  label?: string;
}) {
  if (!onClick) return null;

  return (
    <Button
      type="button"
      size="sm"
      className="pricing-rate-card__add mt-3 w-full"
      onClick={onClick}
    >
      <Plus className="size-3.5" />
      {label}
    </Button>
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
  showServiceFeeCard = true,
  orderActions,
}: {
  catalog: PricingCatalog;
  className?: string;
  showPlanSummaries?: boolean;
  showServiceFeeCard?: boolean;
  orderActions?: PricingOrderActions;
}) {
  const openInspection = catalog.inspections.openInspection;
  const openIsFree = openInspectionIsFree(openInspection, catalog.platformBilling);
  const openAmount = openInspectionIncGstAud(
    openInspection,
    catalog.inspections.routineIncGstAud,
  );
  const included = catalog.level2.includedPerPropertyPerYear;
  const includedPackage = level2IncludedPackageItems(catalog);
  const example = catalog.level2.serviceFeeExample;
  const tribunal = catalog.inspections.tribunal;
  const complimentary = catalog.platformBilling?.complimentaryAllServices === true;

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
              <li>Prepaid — pay when you place the inspection order</li>
              <li>Open, Routine, Ingoing, Outgoing, and Tribunal follow per the cards below</li>
              <li>
                Open inspections (when CROSSUB conducts):{' '}
                <strong className="text-foreground">
                  {openInspectionRateLabel(openInspection)}
                </strong>
                . Self-conducted opens are not billed.
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
                {includedPackage.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                      Also included
                    </p>
                    <div className="pricing-chip-row">
                      {includedPackage.map((item) => (
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
                  Inspections and tribunal are always charged separately. Reference checks and the
                  contract agreement are included in Full Service.
                </p>
              </div>
            ) : null}

            {example && !complimentary ? (
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
              {complimentary ? 'Complimentary' : formatCurrency(catalog.inspections.routineIncGstAud)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {complimentary ? 'not charged for this account' : 'inc GST · in-person only'}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Tenant self routine inspections are not charged.
            </p>
            <PricingAddButton onClick={orderActions?.addRoutine} label="Add routine" />
          </div>

          <div className="pricing-rate-card" data-rate="open">
            <div className="pricing-rate-card__icon">
              <DoorOpen className="size-4" />
            </div>
            <p className="font-medium">Open inspection</p>
            <p className="pricing-rate-card__price mt-1">
              {complimentary ? 'Complimentary' : openIsFree ? 'Free' : formatCurrency(openAmount)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {complimentary
                ? 'not charged for this account'
                : openIsFree
                  ? 'existing client arrangement'
                  : 'inc GST · same rate as routine'}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {complimentary
                ? 'not charged for this account'
                : openIsFree && catalog.inspections.lettingFee
                  ? 'Letting fee still applies if CROSSUB finds the tenant.'
                  : 'Level 1 prepaid when you place the order · Level 2 on the monthly invoice.'}
            </p>
            <PricingAddButton onClick={orderActions?.addOpen} label="Add open inspection" />
          </div>

          {catalog.inspections.lettingFee ? (
            <div className="pricing-rate-card pricing-rate-card--wide" data-rate="letting-fee">
              <div className="pricing-rate-card__icon">
                <Home className="size-4" />
              </div>
              <p className="font-medium">Letting fee</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {catalog.inspections.lettingFee.summary}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {catalog.inspections.lettingFee.chargedWhen}
              </p>
              {catalog.inspections.lettingFee.exampleRent500IncGstAud != null && !complimentary ? (
                <div className="pricing-example-box mt-2">
                  <p>
                    e.g. $500/week rent ={' '}
                    <strong>
                      {formatCurrency(catalog.inspections.lettingFee.exampleRent500IncGstAud)}
                    </strong>{' '}
                    inc GST
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {includedPackage.map((item) => (
            <div key={item.key} className="pricing-rate-card" data-rate={item.key}>
              <div className="pricing-rate-card__icon">
                {item.key === 'contract_agreement' ? (
                  <FileText className="size-4" />
                ) : (
                  <UserSearch className="size-4" />
                )}
              </div>
              <p className="font-medium">{item.label}</p>
              <p className="pricing-rate-card__price mt-1">{item.feeLabel}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">Full Service package</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{item.summary}</p>
            </div>
          ))}
        </div>

        <div className="pricing-field-inspection-order">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ingoing / outgoing field inspections
            </p>
            {orderActions ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={orderActions.addIngoing}>
                  <Plus className="size-3.5" />
                  Add ingoing
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={orderActions.addOutgoing}>
                  <Plus className="size-3.5" />
                  Add outgoing
                </Button>
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
            {complimentary ? (
              'Complimentary'
            ) : (
              <>
                {formatCurrency(tribunal.standardIncGstAud)}{' '}
                <span className="text-muted-foreground text-sm font-normal">inc GST</span>
              </>
            )}
          </p>
          {complimentary ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Not charged for this account.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Ex GST: {formatCurrency(tribunal.standardExGstAud)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Standard session includes {tribunal.includedHours} hours. Additional time{' '}
                {formatCurrency(tribunal.extraHourlyIncGstAud)}/hr inc GST (
                {formatCurrency(tribunal.extraHourlyExGstAud)}/hr ex GST).
              </p>
            </>
          )}
          <PricingAddButton onClick={orderActions?.addTribunal} label="Add tribunal" />
        </div>

        {showServiceFeeCard ? (
          <div className="pricing-rate-card pricing-rate-card--standalone" data-rate="service-fee">
            <div className="pricing-rate-card__icon">
              <Building2 className="size-4" />
            </div>
            <p className="font-medium">Full Service platform fee</p>
            <p className="pricing-rate-card__price mt-1">
              {complimentary ? 'Complimentary' : `${catalog.level2.serviceFeePercent}%`}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {complimentary
                ? 'not charged for this account'
                : 'of agent management income (ex GST) · invoiced monthly'}
            </p>
          </div>
        ) : null}

        <div className="pricing-footnote">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Ingoing and outgoing amounts are ex GST; {tribunal.gstPercent}% GST is added at
            invoice. Routine and tribunal rates shown include GST where marked.
          </span>
        </div>
      </PricingSection>
    </div>
  );
}
