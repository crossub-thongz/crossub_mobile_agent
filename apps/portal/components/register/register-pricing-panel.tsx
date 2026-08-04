'use client';

import {
  Building2,
  CalendarCheck,
  Check,
  DoorOpen,
  Home,
  Loader2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { PricingRateCatalog } from '@/components/pricing/pricing-rate-catalog';
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
import { cn } from '@/lib/utils';

type RegistrationPricingCatalog = Omit<AgentBillingPricingCatalog, 'portalServiceLevel'>;

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">Choose your service plan</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Review every service rate below, then select{' '}
          <strong className="text-foreground">Inspection Only Service</strong> or{' '}
          <strong className="text-foreground">Full Service</strong>.
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

      {catalog ? <PricingRateCatalog catalog={catalog} /> : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Select your plan</p>
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
                          Inspection module only — upgrade to Full Service anytime
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
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40',
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
    </div>
  );
}
