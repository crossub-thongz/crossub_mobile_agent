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

function groupLinesByProperty<T extends { address: string }>(
  lines: T[],
): Array<{ address: string; lineNo: string; lines: T[] }> {
  const groups: Array<{ address: string; lines: T[] }> = [];
  for (const line of lines) {
    const address = line.address.trim() || 'Agency charges';
    const last = groups[groups.length - 1];
    if (last && last.address === address) last.lines.push(line);
    else groups.push({ address, lines: [line] });
  }
  return groups.map((group, index) => ({
    address: group.address,
    lineNo: String(index + 1).padStart(3, '0'),
    lines: group.lines,
  }));
}

const SERVICE_TYPE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal session',
  service_fee: 'Full Service fee',
  letting_fee: 'Letting fee',
};

function serviceLabelFor(line: { serviceLabel?: string; serviceType: string }): string {
  if (line.serviceLabel?.trim()) return line.serviceLabel.trim();
  return SERVICE_TYPE_LABEL[line.serviceType] ?? line.serviceType.replace(/_/g, ' ');
}

function issuerLetterheadLines(name: string, addressLines: string[]): string[] {
  const trimmed = name.trim();
  const propertyManagement = /^(.*?)\s+Property Management Pty Ltd$/i.exec(trimmed);
  if (propertyManagement) {
    return [propertyManagement[1], 'Property Management', 'Pty Ltd', ...addressLines];
  }
  const suffix = ' Pty Ltd';
  if (trimmed.endsWith(suffix)) {
    return [trimmed.slice(0, -suffix.length).trim(), 'Pty Ltd', ...addressLines];
  }
  return [trimmed, ...addressLines];
}

export function PlatformTaxInvoicePreview({ invoice }: { invoice: AgentBillingTaxInvoice }) {
  const issuerLines = issuerLetterheadLines(invoice.issuerName, invoice.issuerAddressLines);

  return (
    <div className="space-y-5 rounded-2xl border bg-background p-4 text-sm sm:p-6">
      <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[1.15fr_0.95fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-col items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/crossub-logo.png"
              alt="CROSSUB"
              width={40}
              height={40}
              className="size-10 rounded-sm object-cover"
            />
            <p className="w-10 text-center text-[11px] font-bold leading-none tracking-wide text-[#004063]">
              CROSSUB
            </p>
          </div>
          <p className="text-lg font-bold tracking-wide">{invoice.title}</p>
          <p className="font-medium text-[#C0504D]">{invoice.agentName}</p>
          {invoice.agentAbn ? <p className="text-xs">(ABN: {invoice.agentAbn})</p> : null}
        </div>
        <dl className="space-y-3 text-xs">
          <div>
            <dt className="font-semibold">Invoice Date</dt>
            <dd>{formatAuDate(invoice.invoiceDate)}</dd>
          </div>
          <div>
            <dt className="font-semibold">Invoice Month</dt>
            <dd>{invoice.periodLabel}</dd>
          </div>
          <div>
            <dt className="font-semibold">Invoice Number</dt>
            <dd>{invoice.invoiceNumber}</dd>
          </div>
          <div>
            <dt className="font-semibold">Reference</dt>
            <dd className="text-[#C0504D]">{invoice.reference}</dd>
          </div>
          <div>
            <dt className="font-semibold">ABN</dt>
            <dd>{invoice.issuerAbn}</dd>
          </div>
          <div>
            <dt className="font-semibold">Due Date</dt>
            <dd>{formatAuDate(invoice.dueDate)}</dd>
          </div>
        </dl>
        <div className="text-xs leading-5">
          {issuerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-xs">
          <thead>
            <tr className="border-y bg-muted/60 text-left">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Address</th>
              <th className="px-2 py-2 font-semibold">Rent</th>
              <th className="px-2 py-2 font-semibold">PM Fee / Day</th>
              <th className="px-2 py-2 font-semibold">Rate</th>
              <th className="px-2 py-2 font-semibold">Active Days</th>
              <th className="px-2 py-2 text-right font-semibold">Amount/PRP</th>
            </tr>
          </thead>
          <tbody>
            {groupLinesByProperty(invoice.lines).flatMap((group) => [
              <tr key={`property-${group.address}`} className="bg-muted/40 border-b">
                <td className="px-2 py-1.5 font-semibold tabular-nums">{group.lineNo}</td>
                <td className="px-2 py-1.5 font-semibold" colSpan={6}>
                  {group.address}
                </td>
              </tr>,
              ...group.lines.map((line) => (
                <tr key={line.id} className="text-muted-foreground border-b align-top text-[11px]">
                  <td className="px-2 py-1.5" />
                  <td className="px-2 py-1.5 pl-3">{serviceLabelFor(line)}</td>
                  <td className="px-2 py-1.5 whitespace-pre-wrap">{line.rentAud ?? ''}</td>
                  <td className="px-2 py-1.5">{line.managementFee ?? ''}</td>
                  <td className="px-2 py-1.5">{line.crossubRate}</td>
                  <td className="px-2 py-1.5">{line.activeDays ?? ''}</td>
                  <td className="text-foreground px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(line.amountExGst)}
                  </td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>

      {invoice.lines.some((line) => line.footnote) ? (
        <ul className="text-muted-foreground space-y-0.5 text-[11px]">
          {invoice.lines
            .filter((line) => line.footnote)
            .map((line) => (
              <li key={`${line.id}-note`}>* {line.footnote}</li>
            ))}
        </ul>
      ) : null}

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
