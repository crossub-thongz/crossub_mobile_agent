'use client';

import { Check, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AGENCY_MEMBERSHIP_TIER } from '@/constants/api-enums';
import { PLAN_SETTINGS_COPY, PLAN_SWITCH_CONSEQUENCE } from '@/constants/service-plan';
import { updateAgencyServiceLevel } from '@/lib/crossub-api/agent-client';
import {
  isLegacyLevel,
  PORTAL_SERVICE_LEVEL_LABEL,
  PORTAL_SERVICE_LEVEL_ORDER,
  REGISTER_SERVICE_LEVEL_DESCRIPTION,
  REGISTER_SERVICE_LEVEL_LABEL,
  REGISTER_SERVICE_LEVEL_PRICE_TAG,
  isSelfManagedLevel,
  resolvePortalServiceLevel,
  type RegisterablePortalServiceLevel,
} from '@/lib/portal-service-level';
import type { Agency } from '@/lib/types';
import { cn } from '@/lib/utils';

type PendingSwitch = { agency: Agency; level: RegisterablePortalServiceLevel };

function AgencyPlanComparison({
  agency,
  showAgencyName,
  onRequestSwitch,
}: {
  agency: Agency;
  showAgencyName: boolean;
  onRequestSwitch: (level: RegisterablePortalServiceLevel) => void;
}) {
  const current = resolvePortalServiceLevel(agency.portalServiceLevel);
  const legacy = isLegacyLevel(current);
  const canSwitch = agency.membershipTier === AGENCY_MEMBERSHIP_TIER.PRINCIPAL && !legacy;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {showAgencyName ? <p className="truncate text-sm font-semibold">{agency.name}</p> : null}
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">{PLAN_SETTINGS_COPY.currentPlan}</span>
            <PortalServiceLevelBadge level={current} variant="both" size="xs" />
          </div>
        </div>
      </div>

      {legacy || !canSwitch ? (
        <p className="text-muted-foreground flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {legacy ? PLAN_SETTINGS_COPY.legacyLocked : PLAN_SETTINGS_COPY.principalOnly}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {PORTAL_SERVICE_LEVEL_ORDER.map((level) => {
          const isCurrent = level === current;
          return (
            <div
              key={level}
              className={cn(
                'flex flex-col rounded-xl border p-3',
                isCurrent ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border/70',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{REGISTER_SERVICE_LEVEL_LABEL[level]}</p>
                <span className="text-muted-foreground text-[11px] font-medium">
                  {REGISTER_SERVICE_LEVEL_PRICE_TAG[level]}
                </span>
              </div>
              <p className="text-muted-foreground mt-1.5 flex-1 text-xs leading-relaxed">
                {REGISTER_SERVICE_LEVEL_DESCRIPTION[level]}
              </p>
              <div className="mt-3">
                {isCurrent ? (
                  <span className="text-primary inline-flex items-center gap-1 text-xs font-semibold">
                    <Check className="size-3.5" aria-hidden />
                    {PLAN_SETTINGS_COPY.currentPlan}
                  </span>
                ) : canSwitch ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRequestSwitch(level)}
                  >
                    {PLAN_SETTINGS_COPY.switchTo}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Settings → Plan: compares Self-Manage, Inspection Only and Full Service for each assigned
 * agency. A principal switches with a confirmation; agents and Legacy agencies see it read-only.
 * After a switch the portfolio is refreshed so nav, copy and gates follow the new tier.
 */
export function PlanSettingsCard() {
  const { agencies: allAgencies, refresh } = useAgentData();
  const [pending, setPending] = useState<PendingSwitch | null>(null);
  const [saving, setSaving] = useState(false);
  // Only Self-Manage agencies get the plan switch; Inspection Only and Full Service keep today's
  // Settings, where CROSSUB changes the plan (Daniel, 17 Oct 2026).
  const agencies = allAgencies.filter((a) =>
    isSelfManagedLevel(resolvePortalServiceLevel(a.portalServiceLevel)),
  );

  if (agencies.length === 0) return null;

  const confirmSwitch = async () => {
    if (!pending) return;
    const planLabel = REGISTER_SERVICE_LEVEL_LABEL[pending.level];
    setSaving(true);
    try {
      await updateAgencyServiceLevel(pending.agency.id, pending.level);
      await refresh();
      toast.success(PLAN_SETTINGS_COPY.switched(planLabel));
      setPending(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : PLAN_SETTINGS_COPY.switchFailed);
    } finally {
      setSaving(false);
    }
  };

  const fromLabel = pending
    ? PORTAL_SERVICE_LEVEL_LABEL[resolvePortalServiceLevel(pending.agency.portalServiceLevel)]
    : null;

  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className="text-sm font-semibold">{PLAN_SETTINGS_COPY.title}</h2>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {PLAN_SETTINGS_COPY.description}
        </p>
      </div>

      {agencies.map((agency) => (
        <AgencyPlanComparison
          key={agency.id}
          agency={agency}
          showAgencyName={agencies.length > 1}
          onRequestSwitch={(level) => setPending({ agency, level })}
        />
      ))}

      <Dialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open && !saving) setPending(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {pending ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {PLAN_SETTINGS_COPY.confirmTitle(REGISTER_SERVICE_LEVEL_LABEL[pending.level])}
                </DialogTitle>
                <DialogDescription>
                  {pending.agency.name} · {fromLabel} → {REGISTER_SERVICE_LEVEL_LABEL[pending.level]}
                </DialogDescription>
              </DialogHeader>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {PLAN_SWITCH_CONSEQUENCE[pending.level]}
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setPending(null)}
                >
                  {PLAN_SETTINGS_COPY.cancel}
                </Button>
                <Button type="button" disabled={saving} onClick={() => void confirmSwitch()}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> {PLAN_SETTINGS_COPY.switching}
                    </>
                  ) : (
                    PLAN_SETTINGS_COPY.confirmAction
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
