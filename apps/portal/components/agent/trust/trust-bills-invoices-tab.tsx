'use client';

import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustBillsTab } from '@/components/agent/trust/trust-bills-tab';
import { TrustInvoicesView } from '@/components/agent/trust/trust-invoices-view';
import { TrustStat } from '@/components/agent/trust/trust-ui';
import {
  TRUST_BILLS_SUMMARY_COPY as COPY,
  TRUST_BILLS_VIEW,
  TRUST_BILLS_VIEWS,
  type TrustBillsView,
} from '@/constants/trust-invoices';
import { useTrustResource } from '@/hooks/use-trust-resource';
import type { TrustAccountCode } from '@/lib/crossub-api/agent-trust-client';
import { fetchTrustBillsSummary, type TrustBillsSummary } from '@/lib/crossub-api/agent-trust-invoices-client';
import { formatCents } from '@/lib/trust-accounting';
import { billsReadyToPay } from '@/utils/trust-invoices';

/** Bills & Invoices: four summary tiles, then owner bills or tenant invoices. */
export function TrustBillsInvoicesTab({
  agencyId,
  bankAccountId,
  accountCodes,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
}) {
  const [view, setView] = useState<TrustBillsView>(TRUST_BILLS_VIEW.BILLS);
  const summary = useTrustResource(`${agencyId}:${bankAccountId}`, () =>
    fetchTrustBillsSummary(agencyId, bankAccountId),
  );

  return (
    <div className="space-y-4">
      <FilterChips options={TRUST_BILLS_VIEWS} value={view} onChange={setView} />
      {summary.data ? <SummaryTiles summary={summary.data} /> : null}
      {view === TRUST_BILLS_VIEW.INVOICES ? (
        <TrustInvoicesView
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          accountCodes={accountCodes}
          onChanged={summary.reload}
        />
      ) : (
        <TrustBillsTab
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          accountCodes={accountCodes}
          onChanged={summary.reload}
        />
      )}
    </div>
  );
}

/** The demo's four tiles: bills to pay, bills short of funds, bills due, tenant invoices owing. */
function SummaryTiles({ summary }: { summary: TrustBillsSummary }) {
  const ready = billsReadyToPay(summary);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <TrustStat
        label={COPY.readyToPay}
        value={ready.count}
        hint={formatCents(ready.cents)}
        tone={ready.count > 0 ? 'text-emerald-700 dark:text-emerald-300' : undefined}
      />
      <TrustStat
        label={COPY.insufficient}
        value={summary.insufficientCount}
        hint={formatCents(summary.insufficientCents)}
        tone={summary.insufficientCount > 0 ? 'text-destructive' : undefined}
      />
      <TrustStat label={COPY.billsDue} value={summary.billsDueCount} hint={formatCents(summary.billsDueCents)} />
      <TrustStat
        label={COPY.invoicesOutstanding}
        value={summary.invoicesOutstandingCount}
        hint={
          summary.invoicesOverdueCount > 0
            ? `${formatCents(summary.invoicesOutstandingCents)} · ${COPY.invoicesOverdue(summary.invoicesOverdueCount)}`
            : formatCents(summary.invoicesOutstandingCents)
        }
        tone={summary.invoicesOverdueCount > 0 ? 'text-destructive' : undefined}
      />
    </div>
  );
}
