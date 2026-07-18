'use client';

import { CrossubLogo } from '@/components/brand/crossub-logo';
import {
  calendarDaysInclusive,
  formatInvoiceDate,
} from '@/lib/invoice-math';
import { formatCurrency } from '@/lib/utils';

export type InvoiceDocManagementLine = {
  propertyAddress: string;
  rent: number;
  pmFeeGst: 'include' | 'exclude';
  serviceRate: number;
  amount: number;
};

export type InvoiceDocSimpleLine = {
  propertyAddress: string;
  description: string;
  amount: number;
};

export type InvoiceDocumentModel = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  periodStart: string;
  periodEnd: string;
  agencyName: string;
  licenceNumber?: string | null;
  reference?: string | null;
  email?: string | null;
  abn?: string | null;
  managementFee: InvoiceDocManagementLine[];
  lettingTribunal: InvoiceDocSimpleLine[];
  otherService: InvoiceDocSimpleLine[];
  totalManagementFee: number;
  totalLettingTribunal: number;
  totalOtherService: number;
  subtotal: number;
  totalGst: number;
  totalAud: number;
  bank: {
    bankName?: string | null;
    accountName?: string | null;
    bsb?: string | null;
    accountNumber?: string | null;
  };
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-2 text-xs">
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentModel }) {
  const days = calendarDaysInclusive(invoice.periodStart, invoice.periodEnd);
  const periodLabel = `From ${formatInvoiceDate(invoice.periodStart)} To ${formatInvoiceDate(invoice.periodEnd)}${
    days > 0 ? ` (${days} days)` : ''
  }`;

  return (
    <div className="bg-white text-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 space-y-2">
          <CrossubLogo href="" showTagline size="lg" />
          <p className="text-sm font-bold tracking-wide uppercase">Tax Invoice</p>
          <div className="space-y-0.5 text-sm">
            <p className="font-semibold">{invoice.agencyName || '—'}</p>
            <p className="text-muted-foreground text-xs">
              (Licence Number: {invoice.licenceNumber?.trim() || '—'})
            </p>
            <p className="text-xs">{periodLabel}</p>
          </div>
        </div>

        <dl className="grid min-w-[16rem] gap-1.5 sm:grid-cols-2">
          <MetaRow label="Invoice Number" value={invoice.invoiceNumber || '—'} />
          <MetaRow label="Invoice Date" value={formatInvoiceDate(invoice.invoiceDate)} />
          <MetaRow label="Reference" value={invoice.reference?.trim() || '—'} />
          <MetaRow label="Due Date" value={formatInvoiceDate(invoice.dueDate)} />
          <MetaRow label="ABN" value={invoice.abn?.trim() || '—'} />
          <MetaRow label="E-mail" value={invoice.email?.trim() || '—'} />
        </dl>
      </div>

      <SectionTitle>Crossub Management Fee</SectionTitle>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-2 font-semibold">Property Address</th>
            <th className="py-2 pr-2 text-right font-semibold">Rent ($AUD)</th>
            <th className="py-2 pr-2 font-semibold">PM Fee</th>
            <th className="py-2 pr-2 text-right font-semibold">Service Rate</th>
            <th className="py-2 text-right font-semibold">Amount AUD</th>
          </tr>
        </thead>
        <tbody>
          {invoice.managementFee.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-muted-foreground py-3">
                No management fee lines
              </td>
            </tr>
          ) : (
            invoice.managementFee.map((line, i) => (
              <tr key={`mf-${i}`} className="border-b border-slate-100">
                <td className="py-2 pr-2">{i + 1}</td>
                <td className="py-2 pr-2">{line.propertyAddress || '—'}</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {formatCurrency(line.rent)}
                </td>
                <td className="py-2 pr-2 capitalize">
                  {line.pmFeeGst === 'include' ? 'Include GST' : 'Exclude GST'}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{line.serviceRate}%</td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(line.amount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <TotalRow label="Total Management Fee" amount={invoice.totalManagementFee} />

      <SectionTitle>Letting & Tribunal Cost</SectionTitle>
      <SimpleLinesTable lines={invoice.lettingTribunal} empty="No letting & tribunal lines" />
      <TotalRow
        label="Total Letting and Tribunal Cost"
        amount={invoice.totalLettingTribunal}
      />

      <SectionTitle>Other Service Fee</SectionTitle>
      <SimpleLinesTable lines={invoice.otherService} empty="No other service fee lines" />

      <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <TotalRow label="Subtotal" amount={invoice.subtotal} />
        <TotalRow label="Total GST" amount={invoice.totalGst} />
        <TotalRow label="Total AUD" amount={invoice.totalAud} strong />
      </div>

      <div className="mt-8 max-w-sm space-y-1 text-xs">
        <p className="font-semibold uppercase tracking-wide">Bank Details</p>
        <p>Bank Name: {invoice.bank.bankName?.trim() || '—'}</p>
        <p>Account Name: {invoice.bank.accountName?.trim() || '—'}</p>
        <p>BSB: {invoice.bank.bsb?.trim() || '—'}</p>
        <p>Account Number: {invoice.bank.accountNumber?.trim() || '—'}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-8 mb-2 text-sm font-bold tracking-wide uppercase">{children}</h3>
  );
}

function TotalRow({
  label,
  amount,
  strong,
}: {
  label: string;
  amount: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`mt-2 flex items-center justify-between gap-4 text-sm ${
        strong ? 'font-bold' : 'font-medium'
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(amount)}</span>
    </div>
  );
}

function SimpleLinesTable({
  lines,
  empty,
}: {
  lines: InvoiceDocSimpleLine[];
  empty: string;
}) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b text-left">
          <th className="py-2 pr-2 font-semibold">#</th>
          <th className="py-2 pr-2 font-semibold">Property Address</th>
          <th className="py-2 pr-2 font-semibold">Description</th>
          <th className="py-2 text-right font-semibold">Amount ($AUD)</th>
        </tr>
      </thead>
      <tbody>
        {lines.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-muted-foreground py-3">
              {empty}
            </td>
          </tr>
        ) : (
          lines.map((line, i) => (
            <tr key={`sl-${i}`} className="border-b border-slate-100">
              <td className="py-2 pr-2">{i + 1}</td>
              <td className="py-2 pr-2">{line.propertyAddress || '—'}</td>
              <td className="py-2 pr-2">{line.description || '—'}</td>
              <td className="py-2 text-right tabular-nums">
                {formatCurrency(line.amount)}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
