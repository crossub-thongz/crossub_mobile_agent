'use client';

import { formatCurrency } from '@/lib/utils';
import type { AgentBillingTaxInvoice } from '@/lib/crossub-api/agent-billing-client';

function formatAuDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  }).format(new Date(iso));
}

export function PlatformTaxInvoicePreview({ invoice }: { invoice: AgentBillingTaxInvoice }) {
  return (
    <div className="space-y-5 rounded-2xl border bg-background p-4 text-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1">
          <p className="text-lg font-bold tracking-wide">{invoice.title}</p>
          <p className="font-semibold">{invoice.agentName}</p>
          {invoice.agentAbn ? (
            <p className="text-muted-foreground text-xs">(ABN: {invoice.agentAbn})</p>
          ) : null}
          <div className="text-muted-foreground pt-2 text-xs leading-5">
            <p className="font-medium text-foreground">{invoice.issuerName}</p>
            {invoice.issuerAddressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
        <dl className="grid min-w-[16rem] grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Invoice Date</dt>
          <dd className="font-medium">{formatAuDate(invoice.invoiceDate)}</dd>
          <dt className="text-muted-foreground">Invoice Number</dt>
          <dd className="font-medium">{invoice.invoiceNumber}</dd>
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-medium">{invoice.reference}</dd>
          <dt className="text-muted-foreground">ABN</dt>
          <dd className="font-medium">{invoice.issuerAbn}</dd>
        </dl>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-xs">
          <thead>
            <tr className="border-y bg-muted/60 text-left">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Address</th>
              <th className="px-2 py-2 font-semibold">PM Fee</th>
              <th className="px-2 py-2 font-semibold">Rate</th>
              <th className="px-2 py-2 text-right font-semibold">Amount/PRP</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-b align-top">
                <td className="text-muted-foreground px-2 py-1.5 tabular-nums">{line.lineNo}</td>
                <td className="px-2 py-1.5">{line.address}</td>
                <td className="px-2 py-1.5 whitespace-pre-wrap">{line.pmFee}</td>
                <td className="px-2 py-1.5">
                  {[line.managementRate, line.crossubRate].filter(Boolean).join('  ')}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {formatCurrency(line.amountExGst)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1 text-xs">
          <p>
            <span className="font-semibold">Due Date:</span> {formatAuDate(invoice.dueDate)}
          </p>
          <p>Bank: {invoice.bankName}</p>
          <p>Account Name: {invoice.bankAccountName}</p>
          <p>BSB: {invoice.bankBsb}</p>
          <p>Account Number: {invoice.bankAccountNumber}</p>
        </div>
        <dl className="min-w-[14rem] space-y-1 text-xs">
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Stationery Fee</dt>
            <dd className="tabular-nums">{formatCurrency(invoice.stationeryFeeExGst)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatCurrency(invoice.subtotalExGst)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Total GST {invoice.gstPercent}%</dt>
            <dd className="tabular-nums">{formatCurrency(invoice.gstAmount)}</dd>
          </div>
          <div className="flex justify-between gap-6 border-t pt-1 font-semibold">
            <dt>TOTAL</dt>
            <dd className="tabular-nums">{formatCurrency(invoice.totalIncGst)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
