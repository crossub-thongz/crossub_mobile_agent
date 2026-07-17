'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { PageIntro } from '@/components/agent/page-intro';
import { AccountingListTable } from '@/components/agent/portfolio-module-tables';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import { accountingToJobRow } from '@/lib/portfolio-case-dialog';
import { formatCurrency } from '@/lib/utils';

export default function AccountingPage() {
  const { accounting } = useAgentData();
  const { selectedJob, selectedId, openJob, closeJob } = usePortfolioCaseDialog();
  const searchParams = useSearchParams();
  const arrearsOnly = searchParams.get('filter') === 'arrears';

  const openAccounting = useCallback(
    (item: (typeof accounting)[number]) => {
      const job = accountingToJobRow(item);
      if (job) openJob(job);
    },
    [openJob],
  );

  const list = useMemo(() => {
    if (arrearsOnly) return accounting.filter((a) => a.arrearsAmount > 0);
    return accounting;
  }, [accounting, arrearsOnly]);

  const totalIncome = accounting.reduce((s, a) => s + a.rentPaidYtd, 0);
  const totalArrears = accounting.reduce((s, a) => s + a.arrearsAmount, 0);
  const totalBills = accounting.reduce(
    (s, a) => s + (a.bills?.filter((b) => b.status === 'outstanding').reduce((t, b) => t + b.amount, 0) ?? 0),
    0,
  );

  return (
    <AgentShell title="Accounting" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro
          description={
            arrearsOnly
              ? 'Properties with outstanding rent and collection history.'
              : 'Rental income and arrears across your portfolio.'
          }
        />

        {totalBills > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalBills)}
            </span>
            <span className="text-muted-foreground"> outstanding bills across portfolio</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary size-4" />
              <p className="text-muted-foreground text-[10px] font-medium uppercase">Income YTD</p>
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="rounded-2xl border border-destructive/25 bg-gradient-to-br from-destructive/10 to-card p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="text-destructive size-4" />
              <p className="text-destructive text-[10px] font-medium uppercase">Arrears</p>
            </div>
            <p className="text-destructive mt-2 text-xl font-bold tabular-nums">
              {formatCurrency(totalArrears)}
            </p>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            title={arrearsOnly ? 'No arrears' : 'No accounting records'}
            description={
              arrearsOnly
                ? 'All tenants are up to date on rent.'
                : 'Payment records will appear when connected to crossub_web.'
            }
          />
        ) : (
          <AccountingListTable
            items={list}
            selectedId={selectedId}
            onItemClick={openAccounting}
          />
        )}

        <PortfolioCaseDialogHost
          job={selectedJob}
          onClose={closeJob}
          onOpenJob={openJob}
        />

        <ModuleCommunications
          categories={['Accounting']}
          title="Rent reminders, invoices & receipts"
          emptyHint="No accounting emails or messages yet."
        />
      </div>
    </AgentShell>
  );
}
