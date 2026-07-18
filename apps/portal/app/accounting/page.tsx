'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FilePlus2, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import { InvoiceEditorDialog } from '@/components/accounting/invoice-editor-dialog';
import { InvoiceListTable } from '@/components/accounting/invoice-list-table';
import { InvoicePreviewDialog } from '@/components/accounting/invoice-preview-dialog';
import { EmptyState } from '@/components/agent/empty-state';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { PageIntro } from '@/components/agent/page-intro';
import { AccountingListTable } from '@/components/agent/portfolio-module-tables';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import {
  deleteInvoice,
  fetchInvoices,
  type AgentInvoiceListItem,
} from '@/lib/crossub-api/agent-client';
import { accountingToJobRow } from '@/lib/portfolio-case-dialog';
import { cn, formatCurrency } from '@/lib/utils';

type AccountingTab = 'rent' | 'invoices';

export default function AccountingPage() {
  const { accounting, properties, primaryAgency } = useAgentData();
  const { selectedJob, selectedId, openJob, closeJob } = usePortfolioCaseDialog();
  const searchParams = useSearchParams();
  const arrearsOnly = searchParams.get('filter') === 'arrears';
  const [tab, setTab] = useState<AccountingTab>(
    searchParams.get('tab') === 'invoices' ? 'invoices' : 'rent',
  );

  const [invoices, setInvoices] = useState<AgentInvoiceListItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      setInvoices(await fetchInvoices());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'invoices') void loadInvoices();
  }, [tab, loadInvoices]);

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
    (s, a) =>
      s +
      (a.bills?.filter((b) => b.status === 'outstanding').reduce((t, b) => t + b.amount, 0) ??
        0),
    0,
  );

  async function handleDelete(invoiceId: string) {
    const invoice = invoices.find((i) => i.id === invoiceId);
    const ok = window.confirm(
      `Delete invoice ${invoice?.invoiceNumber ?? ''}? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await deleteInvoice(invoiceId);
      toast.success('Invoice deleted');
      await loadInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete invoice');
    }
  }

  return (
    <AgentShell title="Accounting" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro
          description={
            tab === 'invoices'
              ? 'Create and manage Crossub management fee tax invoices.'
              : arrearsOnly
                ? 'Properties with outstanding rent and collection history.'
                : 'Rental income and arrears across your portfolio.'
          }
        />

        <div className="flex rounded-lg border bg-card p-1">
          {(
            [
              { id: 'rent' as const, label: 'Rent & arrears' },
              { id: 'invoices' as const, label: 'Invoices' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                tab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'rent' ? (
          <>
            {totalBills > 0 && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalBills)}
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  outstanding bills across portfolio
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-primary size-4" />
                  <p className="text-muted-foreground text-[10px] font-medium uppercase">
                    Income YTD
                  </p>
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums">
                  {formatCurrency(totalIncome)}
                </p>
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
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Invoice Number, period, invoice date, and due date.
              </p>
              <Button
                type="button"
                size="sm"
                disabled={!primaryAgency}
                onClick={() => {
                  setEditorMode('create');
                  setActiveInvoiceId(null);
                  setEditorOpen(true);
                }}
              >
                <FilePlus2 className="mr-1.5 size-4" />
                Create invoice
              </Button>
            </div>

            {!primaryAgency ? (
              <EmptyState
                title="Agency required"
                description="Complete your agency profile before creating invoices."
              />
            ) : invoicesLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Loading invoices…
              </p>
            ) : invoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Create a Crossub management fee tax invoice for your agency."
              />
            ) : (
              <InvoiceListTable
                items={invoices}
                onPreview={(id) => {
                  setPreviewInvoiceId(id);
                  setPreviewOpen(true);
                }}
                onEdit={(id) => {
                  setEditorMode('edit');
                  setActiveInvoiceId(id);
                  setEditorOpen(true);
                }}
                onDelete={(id) => void handleDelete(id)}
              />
            )}
          </>
        )}
      </div>

      <InvoiceEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mode={editorMode}
        invoiceId={activeInvoiceId}
        agency={primaryAgency}
        properties={properties}
        onSaved={() => void loadInvoices()}
      />

      <InvoicePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        invoiceId={previewInvoiceId}
      />
    </AgentShell>
  );
}
