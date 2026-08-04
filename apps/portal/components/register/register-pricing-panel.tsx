'use client';

import {
  Building2,
  CalendarCheck,
  Check,
  DoorOpen,
  Gavel,
  Home,
  Loader2,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { fetchRegisterAgentPricing } from '@/lib/agent-registration';
import type { AgentBillingPricingCatalog } from '@/lib/crossub-api/agent-billing-client';
import {
  isInspectionOnlyLevel,
  PORTAL_SERVICE_LEVEL_ORDER,
  REGISTER_SERVICE_LEVEL_DESCRIPTION,
  REGISTER_SERVICE_LEVEL_LABEL,
  type AgentPortalServiceLevel,
} from '@/lib/portal-service-level';
import { cn, formatCurrency } from '@/lib/utils';

type RegistrationPricingCatalog = Omit<AgentBillingPricingCatalog, 'portalServiceLevel'>;

function PricingRateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function RegisterPricingPanel({
  selectedLevel,
  onSelectLevel,
}: {
  selectedLevel: AgentPortalServiceLevel | null;
  onSelectLevel: (level: AgentPortalServiceLevel) => void;
}) {
  const [catalog, setCatalog] = useState<RegistrationPricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const included = catalog?.level2.includedPerPropertyPerYear;
  const tribunal = catalog?.inspections.tribunal;
  const openInspection = catalog?.inspections.openInspection;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium">Choose your service plan</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Compare platform pricing below, then select{' '}
          <strong className="text-foreground">Inspection Only Service</strong> or{' '}
          <strong className="text-foreground">Full Service</strong>. You can upgrade from
          Inspection Only later.
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

      {catalog ? (
        <div className="rounded-lg border bg-secondary/20 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Platform pricing
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Zap className="size-3.5" />
                Inspection rates
              </p>
              <PricingRateRow
                label="Routine inspection"
                value={
                  catalog.inspections.routineIncGstAud != null
                    ? `${formatCurrency(catalog.inspections.routineIncGstAud)} inc GST`
                    : '—'
                }
              />
              <PricingRateRow
                label="Open inspection (1st–3rd)"
                value={openInspection?.firstThree ?? '50% weekly rent + GST'}
              />
              <PricingRateRow
                label="Open inspection (4th+)"
                value={openInspection?.fourthOnwards ?? '100% weekly rent + GST'}
              />
              <PricingRateRow
                label="Field inspection (compact, 1–2 bed)"
                value={`from ${formatCurrency(catalog.inspections.fieldInspectionsCompactExGst.oneBed ?? 75)} ex GST`}
              />
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Gavel className="size-3.5" />
                Tribunal &amp; Full Service
              </p>
              {tribunal ? (
                <>
                  <PricingRateRow
                    label={`Tribunal standard (${tribunal.includedHours} hrs incl.)`}
                    value={`${formatCurrency(tribunal.standardIncGstAud)} inc GST`}
                  />
                  <PricingRateRow
                    label="Extra tribunal hours"
                    value={`${formatCurrency(tribunal.extraHourlyIncGstAud)}/hr inc GST`}
                  />
                </>
              ) : null}
              <PricingRateRow
                label="Full Service platform fee"
                value={`${catalog.level2.serviceFeePercent}% of agent income (ex GST)`}
              />
              {included ? (
                <p className="text-muted-foreground pt-1 text-xs leading-relaxed">
                  Full Service includes{' '}
                  <strong className="text-foreground">{included.ROUTINE_INSPECTION}</strong>{' '}
                  routine, <strong className="text-foreground">{included.INGOING_INSPECTION}</strong>{' '}
                  ingoing, and{' '}
                  <strong className="text-foreground">{included.OUTGOING_INSPECTION}</strong>{' '}
                  outgoing inspections per property per year.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {PORTAL_SERVICE_LEVEL_ORDER.map((level) => {
          const selected = selectedLevel === level;
          const isLevel1 = isInspectionOnlyLevel(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => onSelectLevel(level)}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                  : 'border-border/70 bg-card hover:border-primary/40',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <PortalServiceLevelBadge level={level} variant="level" size="sm" />
                    <span className="font-semibold">{REGISTER_SERVICE_LEVEL_LABEL[level]}</span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {REGISTER_SERVICE_LEVEL_DESCRIPTION[level]}
                  </p>
                  {catalog ? (
                    <p className="text-xs leading-relaxed text-foreground/80">
                      {isLevel1 ? (
                        <>
                          <Building2 className="mr-1 inline size-3.5" />
                          {catalog.level1.description}
                        </>
                      ) : (
                        <>
                          <CalendarCheck className="mr-1 inline size-3.5" />
                          {catalog.level2.description}
                        </>
                      )}
                    </p>
                  ) : null}
                  {isLevel1 ? (
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li className="flex gap-2">
                        <DoorOpen className="mt-0.5 size-3.5 shrink-0" />
                        Orders confirmed within 24 hours of payment; auto-refund if unaccepted
                      </li>
                      <li className="flex gap-2">
                        <Home className="mt-0.5 size-3.5 shrink-0" />
                        Inspection module only — pre-sale team may follow up for upgrade
                      </li>
                    </ul>
                  ) : (
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li className="flex gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        Leasing, maintenance, accounting, messaging, and all property workflows
                      </li>
                    </ul>
                  )}
                </div>
                <div
                  className={cn(
                    'mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                  )}
                >
                  {selected ? <Check className="size-3" /> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
