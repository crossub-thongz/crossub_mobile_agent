'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilePlus2, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import {
  ArrearsListTable,
  filterArrearsItems,
  RentReconciliationListTable,
  StatementsListTable,
  sumOutstandingBills,
} from '@/components/accounting/accounting-portfolio-tables';
import { AccountingSettingsSection } from '@/components/accounting/accounting-settings-section';
import { InvoiceEditorDialog } from '@/components/accounting/invoice-editor-dialog';
import { InvoiceListTable } from '@/components/accounting/invoice-list-table';
import { InvoicePreviewDialog } from '@/components/accounting/invoice-preview-dialog';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { PageIntro } from '@/components/agent/page-intro';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  ACCOUNTING_SECTION_DESCRIPTION,
  ACCOUNTING_SECTIONS,
  parseAccountingSection,
  type AccountingSectionId,
} from '@/constants/accounting-sections';
import { ROUTES, propertyDetail } from '@/constants/routes';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import {
  deleteInvoice,
  fetchInvoices,
  type AgentInvoiceListItem,
} from '@/lib/crossub-api/agent-client';
import { accountingToJobRow } from '@/lib/portfolio-case-dialog';
import { formatCurrency } from '@/lib/utils';

export default function AccountingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accounting, properties, primaryAgency } = useAgentData();
  const { selectedJob, selectedId, openJob, closeJob } = usePortfolioCaseDialog();

  const [section, setSection] = useState<AccountingSectionId>(() =>
    parseAccountingSection(searchParams.get('section'), {
      tab: searchParams.get('tab'),
      filter: searchParams.get('filter'),
    }),
  );

  const [invoices, setInvoices] = useState<AgentInvoiceListItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const next = parseAccountingSection(searchParams.get('section'), {
      tab: searchParams.get('tab'),
      filter: searchParams.get('filter'),
    });
    setSection(next);
  }, [searchParams]);

  const changeSection = useCallback(
    (next: AccountingSectionId) => {
      setSection(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', next);
      router.replace(`${ROUTES.ACCOUNTING}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

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
    if (section === 'invoices') void loadInvoices();
  }, [section, loadInvoices]);

  const openArrearsCase = useCallback(
    (item: (typeof accounting)[number]) => {
      const job = accountingToJobRow(item);
      if (job) {
        openJob(job);
        return;
      }
      router.push(`${propertyDetail(item.propertyId)}?tab=Accounting#rent-arrears`);
    },
    [openJob, router],
  );

  const arrearsItems = useMemo(() => filterArrearsItems(accounting), [accounting]);
  const totalIncome = accounting.reduce((s, a) => s + a.rentPaidYtd, 0);
  const totalRentArrears = accounting.reduce((s, a) => s + a.arrearsAmount, 0);
  const totalBillArrears = sumOutstandingBills(accounting);

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
        <PageIntro description={ACCOUNTING_SECTION_DESCRIPTION[section]} />

        <FilterChips
          options={[...ACCOUNTING_SECTIONS]}
          value={section}
          onChange={(id) => changeSection(id as AccountingSectionId)}
        />

        {section === 'rent_reconciliation' ? (
          <>
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
                  <p className="text-destructive text-[10px] font-medium uppercase">
                    Outstanding
                  </p>
                </div>
                <p className="text-destructive mt-2 text-xl font-bold tabular-nums">
                  {formatCurrency(totalRentArrears + totalBillArrears)}
                </p>
              </div>
            </div>

            {accounting.length === 0 ? (
              <EmptyState
                title="No accounting records"
                description="Rent reconciliation will appear when portfolio accounting data is available."
              />
            ) : (
              <RentReconciliationListTable items={accounting} />
            )}

            <ModuleCommunications
              categories={['Accounting']}
              title="Rent receipts & reconciliation"
              emptyHint="No accounting emails or messages yet."
            />
          </>
        ) : null}

        {section === 'invoices' ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Invoice number, period, invoice date, and due date.
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
        ) : null}

        {section === 'arrears' ? (
          <>
            {(totalRentArrears > 0 || totalBillArrears > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-destructive/25 bg-gradient-to-br from-destructive/10 to-card p-4">
                  <p className="text-destructive text-[10px] font-medium uppercase">
                    Rent arrears
                  </p>
                  <p className="text-destructive mt-2 text-xl font-bold tabular-nums">
                    {formatCurrency(totalRentArrears)}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-card p-4">
                  <p className="text-[10px] font-medium uppercase text-amber-600 dark:text-amber-400">
                    Invoice arrears
                  </p>
                  <p className="mt-2 text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalBillArrears)}
                  </p>
                </div>
              </div>
            )}

            {arrearsItems.length === 0 ? (
              <EmptyState
                title="No arrears"
                description="All tenants are up to date on rent and invoices."
              />
            ) : (
              <ArrearsListTable
                items={arrearsItems}
                selectedId={selectedId}
                onItemClick={openArrearsCase}
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
        ) : null}

        {section === 'statements' ? (
          accounting.length === 0 ? (
            <EmptyState
              title="No properties"
              description="Owner statements will appear once properties are assigned to your portfolio."
            />
          ) : (
            <StatementsListTable items={accounting} />
          )
        ) : null}

        {section === 'settings' ? <AccountingSettingsSection /> : null}
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
