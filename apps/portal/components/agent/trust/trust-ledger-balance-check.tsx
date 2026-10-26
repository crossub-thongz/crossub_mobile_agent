'use client';

import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { TRUST_BALANCE_CHECK_COPY as COPY } from '@/constants/trust-settings';
import {
  fetchTrustLedgerBalanceCheck,
  type TrustLedgerBalanceCheck,
} from '@/lib/crossub-api/agent-trust-settings-client';
import { formatCents } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Check a ledger's balance against its entries (D135), read only. A mismatch says so and asks
 * CROSSUB to rebuild: rebuilding the balance stays with CROSSUB staff (D134).
 */
export function TrustLedgerBalanceCheck({ agencyId, ledgerId }: { agencyId: string; ledgerId: string }) {
  const [result, setResult] = useState<TrustLedgerBalanceCheck | null>(null);
  const [pending, setPending] = useState(false);

  async function onCheck() {
    setPending(true);
    try {
      setResult(await fetchTrustLedgerBalanceCheck(agencyId, ledgerId));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-xs flex-col items-end gap-1">
      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={pending} onClick={() => void onCheck()}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {COPY.check}
      </Button>
      {result ? (
        result.matches ? (
          <p className="flex items-center gap-1 text-right text-xs text-emerald-600">
            <CheckCircle2 className="size-3.5 shrink-0" />
            {COPY.matches(result.computedEntryCount)}
          </p>
        ) : (
          <p className="flex items-start gap-1 text-right text-xs text-amber-600">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {COPY.differs(
              formatCents(result.computedBalanceCents),
              result.computedEntryCount,
              formatCents(result.cachedBalanceCents),
            )}
          </p>
        )
      ) : null}
    </div>
  );
}
