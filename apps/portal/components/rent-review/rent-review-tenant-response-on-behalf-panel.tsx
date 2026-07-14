'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function RentReviewTenantResponseOnBehalfPanel({
  detail,
  onUpdated,
  readOnly,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
  readOnly?: boolean;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState(detail.tenantMoveOutDate ?? '');
  const [counterWeekly, setCounterWeekly] = useState('');

  if (readOnly) return null;

  const run = async (action: () => Promise<RentReviewWorkflowDetail>, success: string) => {
    setBusy(true);
    try {
      const updated = await runMutation(detail.id, action());
      onUpdated?.(updated);
      toast.success(success);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canCounter = detail.rentNegotiable === true;

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <p className="text-primary text-xs font-semibold uppercase">Record tenant response</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Use when the tenant responds by phone, email, or in person. This advances the workflow the
          same as a tenant portal response.
        </p>
      </div>

      <Button
        className="w-full"
        disabled={busy}
        onClick={() =>
          void run(
            () => rentReviewApi.tenantResponse(detail.id, { decision: 'accept' }),
            'Tenant accepted — rent will be updated',
          )
        }
      >
        Tenant accepts increase
      </Button>

      <div className="space-y-2">
        <Label htmlFor={`move-out-${detail.id}`}>Move-out date (reject path)</Label>
        <Input
          id={`move-out-${detail.id}`}
          type="date"
          value={moveOutDate}
          onChange={(e) => setMoveOutDate(e.target.value)}
        />
        <Button
          variant="outline"
          className="w-full"
          disabled={busy || !moveOutDate}
          onClick={() =>
            void run(
              () =>
                rentReviewApi.tenantResponse(detail.id, {
                  decision: 'reject',
                  moveOutDate,
                }),
              'Tenant rejected — choose End Leasing or counter',
            )
          }
        >
          Tenant rejects (vacating)
        </Button>
      </div>

      {canCounter ? (
        <div className="space-y-2">
          <Label htmlFor={`counter-${detail.id}`}>Counter-offer ($/week)</Label>
          <Input
            id={`counter-${detail.id}`}
            type="number"
            value={counterWeekly}
            onChange={(e) => setCounterWeekly(e.target.value)}
          />
          <Button
            variant="outline"
            className="w-full"
            disabled={busy || !counterWeekly}
            onClick={() =>
              void run(
                () =>
                  rentReviewApi.tenantResponse(detail.id, {
                    decision: 'counter',
                    counterWeekly: Number(counterWeekly),
                  }),
                'Counter recorded — returned to Agent Confirmed',
              )
            }
          >
            Tenant counter-offer
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-100">
          Rent is marked non-negotiable — the tenant can accept or decline only.
        </p>
      )}
    </div>
  );
}
