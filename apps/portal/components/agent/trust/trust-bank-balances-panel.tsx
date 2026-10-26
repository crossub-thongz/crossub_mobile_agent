'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import { TRUST_RECONCILIATION_UPKEEP_COPY as COPY } from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustBankBalances, removeTrustBankBalance } from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** The bank balances recorded by day (the API's default range), each removable. */
export function TrustBankBalancesPanel({
  agencyId,
  bankAccountId,
  refreshKey,
  onChanged,
}: {
  agencyId: string;
  bankAccountId: string;
  refreshKey: number;
  onChanged: () => void;
}) {
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${bankAccountId}:${refreshKey}`, () =>
    fetchTrustBankBalances(agencyId, bankAccountId),
  );
  const [removing, setRemoving] = useState<string | null>(null);

  async function onRemove(date: string) {
    setRemoving(date);
    try {
      await removeTrustBankBalance(agencyId, bankAccountId, date);
      toast.success(COPY.removed);
      reload();
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <TrustPanel title={COPY.balancesTitle}>
      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.balancesEmpty}</p>
      ) : (
        <div className="-mx-4 -mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.balance}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.status}</th>
                <th className={TRUST_TABLE_HEAD_CLASS} />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                    <p>{formatTrustDate(row.date)}</p>
                    {row.note ? <p className="text-muted-foreground text-xs">{row.note}</p> : null}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                    {formatCents(row.balanceCents)}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, row.isReconciled ? 'text-emerald-600' : 'text-amber-600')}>
                    {row.isReconciled ? COPY.reconciled : COPY.outBy(formatCents(row.outByCents))}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={removing !== null}
                      onClick={() => void onRemove(row.date)}
                    >
                      {removing === row.date ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      {COPY.remove}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TrustPanel>
  );
}
