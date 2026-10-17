'use client';

import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PricingRateCatalog } from '@/components/pricing/pricing-rate-catalog';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import {
  FullServiceFeeExample,
  FullServicePricingDetails,
  type RegistrationPricingCatalog,
} from '@/components/register/register-full-service-details';
import { fetchRegisterAgentPricing } from '@/lib/agent-registration';
import { openInspectionRateLabel } from '@/lib/crossub-api/agent-billing-client';
import {
  isInspectionOnlyLevel,
  isSelfManagedLevel,
  PORTAL_SERVICE_LEVEL_ORDER,
  REGISTER_SERVICE_LEVEL_DESCRIPTION,
  REGISTER_SERVICE_LEVEL_LABEL,
  REGISTER_SERVICE_LEVEL_PRICE_TAG,
  type RegisterablePortalServiceLevel,
} from '@/lib/portal-service-level';
import { cn, formatCurrency } from '@/lib/utils';

function minNumericRecordValue(rows: Record<string, number | string>): number | null {
  const values = Object.values(rows).filter((v): v is number => typeof v === 'number');
  return values.length > 0 ? Math.min(...values) : null;
}

function minFieldInspectionExGst(catalog: RegistrationPricingCatalog): number {
  const compact = minNumericRecordValue(catalog.inspections.fieldInspectionsCompactExGst);
  const house = minNumericRecordValue(catalog.inspections.fieldInspectionsHouseExGst);
  if (compact != null && house != null) return Math.min(compact, house);
  return compact ?? house ?? 75;
}

function InspectionOnlyPricingDetails({ catalog }: { catalog: RegistrationPricingCatalog }) {
  return (
    <div className="border-t border-border/60 pt-4">
      <ul className="text-muted-foreground mb-4 space-y-1.5 text-xs leading-relaxed">
        <li>Prepaid — pay when you place the inspection order</li>
        <li>
          If no inspector confirms within 48 hours, the job is closed and the fee is refunded
        </li>
        <li>
          Open inspections (when CROSSUB conducts):{' '}
          <strong className="text-foreground">
            {openInspectionRateLabel(catalog.inspections.openInspection)}
          </strong>
        </li>
        <li>Inspection module only — upgrade to Full Service anytime</li>
      </ul>
      <PricingRateCatalog
        catalog={catalog}
        showPlanSummaries={false}
        showServiceFeeCard={false}
        className="!space-y-0"
      />
    </div>
  );
}

function SelfManagedPlanDetails() {
  return (
    <ul className="text-muted-foreground space-y-1 text-sm">
      <li>
        <span className="font-medium text-foreground">No platform fees</span> — no card needed
      </li>
      <li>Owners get an emailed copy of your decisions</li>
      <li>Add Inspection Only or Full Service later from Settings</li>
    </ul>
  );
}

/** Self-Manage is the free core and listed first; the paid plans follow as optional services. */
const CORE_PLAN_LEVELS = PORTAL_SERVICE_LEVEL_ORDER.filter((level) => isSelfManagedLevel(level));
const PAID_PLAN_LEVELS = PORTAL_SERVICE_LEVEL_ORDER.filter((level) => !isSelfManagedLevel(level));

export function RegisterPricingPanel({
  selectedLevel,
  onSelectLevel,
}: {
  selectedLevel: RegisterablePortalServiceLevel;
  onSelectLevel: (level: RegisterablePortalServiceLevel) => void;
}) {
  const [catalog, setCatalog] = useState<RegistrationPricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<RegisterablePortalServiceLevel | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchRegisterAgentPricing()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load pricing');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleDetails = (
    event: React.MouseEvent,
    level: RegisterablePortalServiceLevel,
  ) => {
    event.stopPropagation();
    setExpandedLevel((current) => (current === level ? null : level));
  };

  const fieldInspectionFromExGst = catalog ? minFieldInspectionExGst(catalog) : null;

  const renderPlanCard = (level: RegisterablePortalServiceLevel) => {
    const selected = selectedLevel === level;
    const isLevel1 = isInspectionOnlyLevel(level);
    const isSelfManaged = isSelfManagedLevel(level);
    const expanded = expandedLevel === level;

    return (
      <div
        key={level}
        role="button"
        tabIndex={0}
        onClick={() => onSelectLevel(level)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectLevel(level);
          }
        }}
        className={cn(
          'cursor-pointer rounded-xl border p-4 text-left transition-colors',
          selected
            ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
            : 'border-border/70 bg-card hover:border-primary/40',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <PortalServiceLevelBadge level={level} variant="level" size="sm" />
              <span className="font-semibold">{REGISTER_SERVICE_LEVEL_LABEL[level]}</span>
              {isSelfManaged ? null : (
                <span className="text-muted-foreground text-xs font-medium">
                  {REGISTER_SERVICE_LEVEL_PRICE_TAG[level]}
                </span>
              )}
            </div>

            {isSelfManaged ? (
              <>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {REGISTER_SERVICE_LEVEL_DESCRIPTION[level]}
                </p>
                <SelfManagedPlanDetails />
              </>
            ) : null}

            {!isSelfManaged && catalog ? (
              isLevel1 ? (
                <ul className="space-y-1 text-sm">
                  <li>
                    <span className="text-muted-foreground">Routine inspection </span>
                    <span className="font-medium text-foreground">
                      from {formatCurrency(catalog.inspections.routineIncGstAud)}
                    </span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Ingoing/outgoing inspection </span>
                    <span className="font-medium text-foreground">
                      from {formatCurrency(fieldInspectionFromExGst!)} ex GST
                    </span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Open inspection </span>
                    <span className="font-medium text-foreground">
                      {openInspectionRateLabel(catalog.inspections.openInspection)}
                    </span>
                  </li>
                </ul>
              ) : (
                <div className="space-y-3 text-sm">
                  <p>
                    <span className="font-semibold text-foreground">
                      {catalog.level2.serviceFeePercent}% platform fee
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      of your management income · min 4% rate · billed by active days
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Leasing, maintenance, accounting, messaging, and all property workflows.
                    Included routine, ingoing, and outgoing inspections per property each
                    year, plus reference checks and the contract agreement.
                  </p>
                  {catalog.level2.serviceFeeExample ? (
                    <FullServiceFeeExample catalog={catalog} />
                  ) : null}
                </div>
              )
            ) : null}

            {isSelfManaged ? null : (
              <>
                <button
                  type="button"
                  onClick={(event) => toggleDetails(event, level)}
                  className="text-primary inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide hover:underline"
                  aria-expanded={expanded}
                >
                  Details
                  <ChevronDown
                    className={cn(
                      'size-3.5 transition-transform',
                      expanded && 'rotate-180',
                    )}
                  />
                </button>

                {expanded && catalog ? (
                  isLevel1 ? (
                    <InspectionOnlyPricingDetails catalog={catalog} />
                  ) : (
                    <FullServicePricingDetails catalog={catalog} omitFeeExample />
                  )
                ) : null}
              </>
            )}
          </div>

          <div
            className={cn(
              'mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/40',
            )}
          >
            {selected ? <Check className="size-3" /> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">Choose your service plan</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          <strong className="text-foreground">Self-Manage</strong> is free and selected for you.
          Prefer CROSSUB to do some of the work? Choose{' '}
          <strong className="text-foreground">Inspection Only Service</strong> or{' '}
          <strong className="text-foreground">Full Service</strong> instead — starting prices are
          shown below; expand <strong className="text-foreground">Details</strong> for the full
          breakdown.
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading pricing…
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Free plan</p>
        <div className="grid gap-3">{CORE_PLAN_LEVELS.map(renderPlanCard)}</div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">Optional paid services</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            CROSSUB does agreed work for you. You can switch plans later in Settings.
          </p>
        </div>
        <div className="grid gap-3">{PAID_PLAN_LEVELS.map(renderPlanCard)}</div>
      </div>
    </div>
  );
}
