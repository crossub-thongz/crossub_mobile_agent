'use client';

import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustInvoiceDialog } from '@/components/agent/trust/trust-invoice-dialog';
import { TrustNewInvoiceDialog } from '@/components/agent/trust/trust-new-invoice-dialog';
import { TrustTransferDepositDialog } from '@/components/agent/trust/trust-transfer-deposit-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
  TrustPill,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import { TRUST_PAGE_SIZE_MAX } from '@/constants/trust';
import {
  TRUST_FOLIO_INVOICE_VIEW,
  TRUST_INVOICE_DISPLAY_STATUS_LABEL,
  TRUST_INVOICE_DISPLAY_STATUS_TONE,
  TRUST_INVOICE_FILTER,
  TRUST_TENANT_EXTRAS_COPY as COPY,
  TRUST_TENANT_HISTORY_ROW_KIND,
  TRUST_TENANT_HISTORY_STATUS,
  TRUST_TENANT_HISTORY_STATUS_LABEL,
  TRUST_TENANT_HISTORY_STATUS_TONE,
  TRUST_TRANSFER_DEPOSIT_COPY,
  type TrustFolioInvoiceView,
} from '@/constants/trust-invoices';
import { useTrustResource, type TrustResource } from '@/hooks/use-trust-resource';
import type { TrustAccountCode, TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import {
  fetchTrustOpenInvoices,
  fetchTrustTenantHistory,
  fetchTrustTenantInvoices,
  type TrustTenantHistory,
  type TrustTenantHistoryRow,
  type TrustTenantInvoice,
} from '@/lib/crossub-api/agent-trust-invoices-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

const FOLIO_INVOICE_VIEWS = [
  { id: TRUST_FOLIO_INVOICE_VIEW.OPEN, label: COPY.open },
  { id: TRUST_FOLIO_INVOICE_VIEW.CANCELLED, label: COPY.cancelled },
] as const satisfies readonly { id: TrustFolioInvoiceView; label: string }[];

/** Which tenant dialog is showing. */
const EXTRAS_DIALOG = {
  NEW_INVOICE: 'new-invoice',
  TRANSFER: 'transfer',
} as const;
type ExtrasDialog = (typeof EXTRAS_DIALOG)[keyof typeof EXTRAS_DIALOG];

/**
 * A tenant ledger's invoices (open or cancelled, D104) and its processed payments with the
 * tenancy totals; Create invoice, and Transfer deposit once a deposit is held.
 */
export function TrustTenantExtras({
  agencyId,
  ledger,
  accountCodes,
  onChanged,
}: {
  agencyId: string;
  ledger: TrustLedger;
  accountCodes: readonly TrustAccountCode[];
  onChanged: () => void;
}) {
  const bankAccountId = ledger.trustBankAccountId;
  const [view, setView] = useState<TrustFolioInvoiceView>(TRUST_FOLIO_INVOICE_VIEW.OPEN);
  const [dialog, setDialog] = useState<ExtrasDialog | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const depositHeldCents = ledger.rentProfile?.depositHeldCents ?? 0;

  const history = useTrustResource(`${agencyId}:${ledger.id}`, () =>
    fetchTrustTenantHistory(agencyId, ledger.id, { pageSize: TRUST_PAGE_SIZE_MAX }),
  );
  const invoices = useTrustResource(`${agencyId}:${ledger.id}:${view}`, () =>
    view === TRUST_FOLIO_INVOICE_VIEW.OPEN
      ? fetchTrustOpenInvoices(agencyId, ledger.id)
      : fetchTrustTenantInvoices(agencyId, bankAccountId, {
          tenantLedgerId: ledger.id,
          status: TRUST_INVOICE_FILTER.CANCELLED,
          pageSize: TRUST_PAGE_SIZE_MAX,
        }).then((list) => list.items),
  );

  const afterChange = () => {
    history.reload();
    invoices.reload();
    onChanged();
  };

  return (
    <div className="space-y-4">
      <TrustPanel
        title={COPY.invoicesTitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={depositHeldCents <= 0}
              onClick={() => setDialog(EXTRAS_DIALOG.TRANSFER)}
            >
              {TRUST_TRANSFER_DEPOSIT_COPY.action}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDialog(EXTRAS_DIALOG.NEW_INVOICE)}
            >
              {COPY.newInvoice}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {history.data ? <InvoiceFigures header={history.data.header} /> : null}
          <FilterChips options={FOLIO_INVOICE_VIEWS} value={view} onChange={setView} />
          {!invoices.data ? (
            invoices.error ? (
              <TrustLoadError error={invoices.error} onRetry={invoices.reload} />
            ) : (
              <TrustLoading />
            )
          ) : invoices.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {view === TRUST_FOLIO_INVOICE_VIEW.OPEN ? COPY.noOpen : COPY.noCancelled}
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {invoices.data.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} onOpen={() => setOpenId(invoice.id)} />
              ))}
            </ul>
          )}
        </div>
      </TrustPanel>

      <TenantHistory resource={history} />

      {dialog === EXTRAS_DIALOG.NEW_INVOICE ? (
        <TrustNewInvoiceDialog
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          accountCodes={accountCodes}
          fixedTenant={ledger}
          onClose={() => setDialog(null)}
          onCreated={afterChange}
        />
      ) : dialog === EXTRAS_DIALOG.TRANSFER ? (
        <TrustTransferDepositDialog
          agencyId={agencyId}
          ledger={ledger}
          depositHeldCents={depositHeldCents}
          onClose={() => setDialog(null)}
          onTransferred={afterChange}
        />
      ) : null}
      {openId ? (
        <TrustInvoiceDialog
          key={openId}
          agencyId={agencyId}
          invoiceId={openId}
          onClose={() => setOpenId(null)}
          onChanged={afterChange}
        />
      ) : null}
    </div>
  );
}

function InvoiceFigures({ header }: { header: TrustTenantHistory['header'] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <dt className="text-muted-foreground text-xs">{COPY.owing}</dt>
        <dd className="tabular-nums">{formatCents(header.openInvoiceCents)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">{COPY.invoiceArrears}</dt>
        <dd className={cn('tabular-nums', header.invoiceArrearsCents > 0 && 'text-destructive font-medium')}>
          {formatCents(header.invoiceArrearsCents)}
        </dd>
      </div>
    </dl>
  );
}

function InvoiceRow({ invoice, onOpen }: { invoice: TrustTenantInvoice; onOpen: () => void }) {
  return (
    <li>
      <button type="button" className="flex w-full items-center gap-3 py-2.5 text-left" onClick={onOpen}>
        <div className="min-w-0 flex-1">
          <p className="truncate">{COPY.invoiceLine(invoice.invoiceNumber, invoice.details)}</p>
          <p className="text-muted-foreground text-xs">
            {COPY.invoiceMeta(invoice.accountCode.name, formatTrustDate(invoice.dueDate))}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular-nums">{formatCents(invoice.outstandingCents)}</p>
          <p className="text-muted-foreground text-xs tabular-nums">{COPY.owingOf(formatCents(invoice.amountCents))}</p>
        </div>
        <TrustPill className={TRUST_INVOICE_DISPLAY_STATUS_TONE[invoice.displayStatus]}>
          {TRUST_INVOICE_DISPLAY_STATUS_LABEL[invoice.displayStatus]}
        </TrustPill>
      </button>
    </li>
  );
}

function TenantHistory({ resource }: { resource: TrustResource<TrustTenantHistory> }) {
  const { data, error, loading, reload } = resource;
  return (
    <TrustPanel title={COPY.historyTitle}>
      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.noHistory}</p>
      ) : (
        <div className="-mx-4 -mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.receiptNumber}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.details}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.arrears}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.status}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <HistoryRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-2 text-xs">
            <span className="font-semibold">{COPY.totals}</span>
            <span>
              {COPY.rentPaid} <span className="text-foreground tabular-nums">{formatCents(data.totals.rentPaidCents)}</span>
            </span>
            <span>
              {COPY.invoicesPaid}{' '}
              <span className="text-foreground tabular-nums">{formatCents(data.totals.invoicesPaidCents)}</span>
            </span>
            <span>
              {COPY.depositHeld}{' '}
              <span className="text-foreground tabular-nums">{formatCents(data.totals.depositHeldCents)}</span>
            </span>
            <span>{COPY.receipts(data.totals.receiptCount)}</span>
            {data.total > data.items.length ? <span>{COPY.showing(data.items.length, data.total)}</span> : null}
          </div>
        </div>
      )}
    </TrustPanel>
  );
}

function HistoryRow({ row }: { row: TrustTenantHistoryRow }) {
  const isEvent = row.rowKind === TRUST_TENANT_HISTORY_ROW_KIND.RENT_EVENT;
  const isInvoice = row.rowKind === TRUST_TENANT_HISTORY_ROW_KIND.INVOICE_PAYMENT;
  const isReversed = row.transactionStatus === TRUST_TENANT_HISTORY_STATUS.REVERSED;
  return (
    <tr className={cn('border-b last:border-b-0', isReversed && 'text-muted-foreground')}>
      <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>{formatTrustDate(row.date)}</td>
      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-muted-foreground hidden tabular-nums md:table-cell')}>
        {row.receiptNumber ?? '—'}
      </td>
      <td className={cn(TRUST_TABLE_CELL_CLASS, isEvent && 'text-muted-foreground italic')}>
        <p>{isInvoice ? COPY.invoiceType : row.typeLabel}</p>
        <p className="text-muted-foreground text-xs">
          {isInvoice && row.invoiceNumber != null ? `#${row.invoiceNumber} · ` : ''}
          {row.details}
        </p>
      </td>
      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums', isReversed && 'line-through')}>
        {row.amountCents != null ? formatCents(row.amountCents) : '—'}
      </td>
      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-muted-foreground hidden lg:table-cell')}>
        {isInvoice ? '' : (row.arrearsText ?? '—')}
      </td>
      <td className={TRUST_TABLE_CELL_CLASS}>
        {row.displayStatus ? (
          <TrustPill className={TRUST_TENANT_HISTORY_STATUS_TONE[row.displayStatus]}>
            {TRUST_TENANT_HISTORY_STATUS_LABEL[row.displayStatus]}
          </TrustPill>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}
