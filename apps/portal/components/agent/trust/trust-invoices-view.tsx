'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustInvoiceDialog } from '@/components/agent/trust/trust-invoice-dialog';
import { TrustNewInvoiceDialog } from '@/components/agent/trust/trust-new-invoice-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustDownloadButton,
  TrustLoadError,
  TrustLoading,
  TrustPill,
  TrustSearchInput,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import { TRUST_PAGE_COPY, TRUST_PAGE_SIZE_MAX } from '@/constants/trust';
import {
  TRUST_INVOICE_DISPLAY_STATUS_LABEL,
  TRUST_INVOICE_DISPLAY_STATUS_TONE,
  TRUST_INVOICE_FILTER,
  TRUST_INVOICE_FILTER_ALL,
  TRUST_INVOICES_COPY as COPY,
  type TrustInvoiceStageFilter,
} from '@/constants/trust-invoices';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import type { TrustAccountCode } from '@/lib/crossub-api/agent-trust-client';
import {
  downloadTrustTenantInvoiceAttachment,
  fetchTrustTenantInvoices,
  type TrustTenantInvoiceList,
} from '@/lib/crossub-api/agent-trust-invoices-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

function stageOptions(counts: TrustTenantInvoiceList['counts'] | undefined) {
  const n = (value: number | undefined) => (value == null ? '' : ` (${value})`);
  return [
    { id: TRUST_INVOICE_FILTER.DUE, label: `${COPY.due}${n(counts?.due)}` },
    { id: TRUST_INVOICE_FILTER.FUTURE, label: `${COPY.future}${n(counts?.future)}` },
    { id: TRUST_INVOICE_FILTER.PAID, label: `${COPY.paid}${n(counts?.paid)}` },
    { id: TRUST_INVOICE_FILTER_ALL, label: `${COPY.all}${n(counts?.all)}` },
  ] as const satisfies readonly { id: TrustInvoiceStageFilter; label: string }[];
}

/** Tenant invoices on Bills (D103 tabs Due / Future / Paid): list, create, view and cancel. */
export function TrustInvoicesView({
  agencyId,
  bankAccountId,
  accountCodes,
  onChanged,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
  onChanged: () => void;
}) {
  const [stage, setStage] = useState<TrustInvoiceStageFilter>(TRUST_INVOICE_FILTER.DUE);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useDebouncedValue(search.trim());

  const { data, error, loading, reload } = useTrustResource(
    `${agencyId}:${bankAccountId}:${stage}:${query}`,
    () =>
      fetchTrustTenantInvoices(agencyId, bankAccountId, {
        pageSize: TRUST_PAGE_SIZE_MAX,
        status: stage === TRUST_INVOICE_FILTER_ALL ? undefined : stage,
        search: query || undefined,
      }),
  );
  const afterChange = () => {
    reload();
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <TrustSearchInput value={search} onChange={setSearch} placeholder={COPY.searchPlaceholder} />
        <div className="min-w-0 flex-1">
          <FilterChips options={stageOptions(data?.counts)} value={stage} onChange={setStage} />
        </div>
        <Button type="button" size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {COPY.newInvoice}
        </Button>
      </div>

      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          {query ? TRUST_PAGE_COPY.noMatches : COPY.empty}
        </p>
      ) : (
        <div className={cn('overflow-x-auto rounded-xl border bg-card', loading && 'opacity-60')}>
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.number}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.tenant}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.from}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.dueDate}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.outstanding}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.status}</th>
                <th className={TRUST_TABLE_HEAD_CLASS} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((invoice) => (
                <tr key={invoice.id} className="border-b last:border-b-0">
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                    <p className="font-medium">#{invoice.invoiceNumber}</p>
                    <p className="text-muted-foreground text-xs">{formatTrustDate(invoice.invoiceDate)}</p>
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{invoice.tenantLedger.name}</p>
                    <p className="text-muted-foreground text-xs">{invoice.details}</p>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>
                    <p>{invoice.beneficiaryLedger.name}</p>
                    <p className="text-muted-foreground text-xs">{invoice.property?.referenceAddress ?? '—'}</p>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden whitespace-nowrap md:table-cell')}>
                    {formatTrustDate(invoice.dueDate)}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                    <p>{formatCents(invoice.outstandingCents)}</p>
                    <p className="text-muted-foreground text-xs">{formatCents(invoice.amountCents)}</p>
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <TrustPill className={TRUST_INVOICE_DISPLAY_STATUS_TONE[invoice.displayStatus]}>
                      {TRUST_INVOICE_DISPLAY_STATUS_LABEL[invoice.displayStatus]}
                    </TrustPill>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setOpenId(invoice.id)}
                      >
                        {COPY.view}
                      </Button>
                      {invoice.attachment ? (
                        <TrustDownloadButton
                          label={COPY.attachment}
                          filename={invoice.attachment.fileName}
                          fetchBlob={() => downloadTrustTenantInvoiceAttachment(agencyId, invoice.id)}
                          failedMessage={COPY.attachmentFailed}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating ? (
        <TrustNewInvoiceDialog
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          accountCodes={accountCodes}
          onClose={() => setCreating(false)}
          onCreated={afterChange}
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
