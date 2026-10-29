'use client';

import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  requestCrossubMaintenanceQuote,
  type AgentMaintenanceDetail,
} from '@/lib/crossub-api/maintenance-client';
import { crossubFeeLabel } from '@/lib/maintenance/crossub-maintenance';

/**
 * "Let CROSSUB arrange this?" (Daniel Zhou, 29 Oct 2026): a recommendation, never a requirement.
 * CROSSUB's partner is asked to quote like any tradie; approving their quote means paying CROSSUB,
 * who pays the partner. The agency's own tradies stay free.
 */
export function CrossubArrangeStep({
  requestId,
  offer,
  busy,
  run,
}: {
  requestId: string;
  offer: NonNullable<AgentMaintenanceDetail['crossubMaintenance']>;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  return (
    <StepCard title={COPY.crossubTitle} hint={COPY.crossubHint(offer.partnerName)}>
      <p className="text-muted-foreground text-xs">{COPY.crossubFee(crossubFeeLabel(offer))}</p>
      {offer.requested ? (
        <p className="text-xs font-medium">{COPY.crossubAsked(offer.partnerName)}</p>
      ) : (
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(() => requestCrossubMaintenanceQuote(requestId), COPY.crossubRequested)
          }
        >
          {COPY.crossubAsk}
        </Button>
      )}
    </StepCard>
  );
}
