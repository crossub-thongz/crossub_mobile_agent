'use client';

import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { createAgentTerminationCase } from '@/lib/crossub-api/agent-workflow-client';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatDate } from '@/lib/utils';

export function RentReviewEndLeasingPanel({
  detail,
  busy,
  onBusyChange,
  showMoveOutSummary = true,
}: {
  detail: RentReviewWorkflowDetail;
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  showMoveOutSummary?: boolean;
}) {
  const startEndLeasing = async () => {
    if (!detail.propertyId) {
      toast.error('No property linked to this rent review');
      return;
    }
    onBusyChange?.(true);
    try {
      const result = await createAgentTerminationCase(detail.propertyId, {
        terminationType: 'tenant_initiated',
        terminationReason: 'Tenant rejected rent increase — vacating',
        expectedVacateDate: detail.tenantMoveOutDate || undefined,
      });
      toast.success('End leasing case created');
      window.location.href = `${ROUTES.PROPERTIES}/${detail.propertyId}?tab=leasing&case=${result.id}`;
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      onBusyChange?.(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
      <div>
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">End leasing</p>
        <p className="text-muted-foreground mt-1 text-xs">
          The tenant declined the rent increase. Start the end-leasing workflow to manage vacate,
          outgoing inspection, and bond release.
        </p>
      </div>
      {showMoveOutSummary ? (
        detail.tenantMoveOutDate ? (
          <div className="rounded-lg border border-rose-500/30 bg-background/60 p-3">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Move-out date
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatDate(detail.tenantMoveOutDate)}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">Move-out date not recorded yet.</p>
        )
      ) : null}
      <Button
        variant="outline"
        className="w-full gap-2"
        disabled={busy}
        onClick={() => void startEndLeasing()}
      >
        <ExternalLink className="size-4" />
        Start End Leasing
      </Button>
    </section>
  );
}
