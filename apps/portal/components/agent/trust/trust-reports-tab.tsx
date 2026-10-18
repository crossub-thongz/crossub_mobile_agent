'use client';

import { useState, type ReactNode } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustDownloadButton,
  TrustLoadError,
  TrustLoading,
  TrustPill,
} from '@/components/agent/trust/trust-ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_LEDGER_KIND_LABEL,
  TRUST_REPORT_KIND,
  TRUST_REPORT_KINDS,
  TRUST_REPORTS_COPY as COPY,
  type TrustLedgerKind,
  type TrustReportKind,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  downloadTrustReportCsv,
  fetchTrustFolioBalancesReport,
  fetchTrustReceiptsReport,
  fetchTrustUnpresentedReport,
  fetchTrustWithdrawalsReport,
  type TrustCashReport,
  type TrustFolioBalanceReport,
  type TrustReportQuery,
  type TrustUnpresentedReport,
} from '@/lib/crossub-api/agent-trust-client';
import {
  formatCents,
  formatTrustDate,
  isTrustPeriodReport,
  trustMonthStartKey,
  trustReportFilename,
  trustTodayKey,
} from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

type AnyReport = TrustCashReport | TrustFolioBalanceReport | TrustUnpresentedReport;

function loadReport(
  agencyId: string,
  bankAccountId: string,
  kind: TrustReportKind,
  query: TrustReportQuery,
): Promise<AnyReport> {
  switch (kind) {
    case TRUST_REPORT_KIND.RECEIPTS:
      return fetchTrustReceiptsReport(agencyId, bankAccountId, query);
    case TRUST_REPORT_KIND.WITHDRAWALS:
      return fetchTrustWithdrawalsReport(agencyId, bankAccountId, query);
    case TRUST_REPORT_KIND.FOLIO_BALANCES:
      return fetchTrustFolioBalancesReport(agencyId, bankAccountId, query);
    case TRUST_REPORT_KIND.UNPRESENTED_PAYMENTS:
      return fetchTrustUnpresentedReport(agencyId, bankAccountId, query);
  }
}

function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="border-b">
        <tr>{head}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

const RIGHT_HEAD = cn(TRUST_TABLE_HEAD_CLASS, 'text-right');
const RIGHT_CELL = cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums');

function CashRows({ report }: { report: TrustCashReport }) {
  return (
    <Table
      head={
        <>
          <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
          <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.audit}</th>
          <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.description}</th>
          <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.party}</th>
          <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.method}</th>
          <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.reference}</th>
          <th className={RIGHT_HEAD}>{COPY.amount}</th>
        </>
      }
    >
      {report.rows.map((row) => (
        <tr key={`${row.auditNumber}:${row.dateKey}`} className="border-b last:border-b-0">
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>{formatTrustDate(row.dateKey)}</td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'tabular-nums')}>#{row.auditNumber}</td>
          <td className={TRUST_TABLE_CELL_CLASS}>
            {row.description}
            {row.isReversal ? (
              <TrustPill className="bg-muted text-muted-foreground ml-2">{COPY.reversal}</TrustPill>
            ) : null}
          </td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden md:table-cell')}>{row.partyName ?? '—'}</td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>{row.method ?? '—'}</td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>{row.reference ?? '—'}</td>
          <td className={RIGHT_CELL}>{formatCents(row.amountCents)}</td>
        </tr>
      ))}
    </Table>
  );
}

function FolioRows({ report }: { report: TrustFolioBalanceReport }) {
  return (
    <Table
      head={
        <>
          <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.code}</th>
          <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.name}</th>
          <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.kind}</th>
          <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.property}</th>
          <th className={RIGHT_HEAD}>{COPY.balance}</th>
        </>
      }
    >
      {report.rows.map((row) => (
        <tr key={row.code} className="border-b last:border-b-0">
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'font-mono text-xs')}>{row.code}</td>
          <td className={TRUST_TABLE_CELL_CLASS}>{row.name}</td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden md:table-cell')}>
            {TRUST_LEDGER_KIND_LABEL[row.kind as TrustLedgerKind] ?? row.kind}
          </td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>
            {row.propertyReferenceAddress ?? row.propertyAddress ?? '—'}
          </td>
          <td className={RIGHT_CELL}>{formatCents(row.balanceCents)}</td>
        </tr>
      ))}
    </Table>
  );
}

function UnpresentedRows({ report }: { report: TrustUnpresentedReport }) {
  return (
    <Table
      head={
        <>
          <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
          <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.audit}</th>
          <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.description}</th>
          <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.payee}</th>
          <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.method}</th>
          <th className={RIGHT_HEAD}>{COPY.days}</th>
          <th className={RIGHT_HEAD}>{COPY.amount}</th>
        </>
      }
    >
      {report.rows.map((row) => (
        <tr key={`${row.auditNumber}:${row.dateKey}`} className="border-b last:border-b-0">
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>{formatTrustDate(row.dateKey)}</td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'tabular-nums')}>#{row.auditNumber}</td>
          <td className={TRUST_TABLE_CELL_CLASS}>{row.description}</td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden md:table-cell')}>{row.payeeName ?? '—'}</td>
          <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>{row.method ?? '—'}</td>
          <td className={RIGHT_CELL}>{row.daysOutstanding}</td>
          <td className={RIGHT_CELL}>{formatCents(row.amountCents)}</td>
        </tr>
      ))}
    </Table>
  );
}

function ReportRows({ kind, report }: { kind: TrustReportKind; report: AnyReport }) {
  switch (kind) {
    case TRUST_REPORT_KIND.RECEIPTS:
    case TRUST_REPORT_KIND.WITHDRAWALS:
      return <CashRows report={report as TrustCashReport} />;
    case TRUST_REPORT_KIND.FOLIO_BALANCES:
      return <FolioRows report={report as TrustFolioBalanceReport} />;
    case TRUST_REPORT_KIND.UNPRESENTED_PAYMENTS:
      return <UnpresentedRows report={report as TrustUnpresentedReport} />;
  }
}

function DateField({
  id,
  label,
  value,
  onChange,
  min,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        className="h-9 w-40"
        value={value}
        min={min}
        max={trustTodayKey()}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** The staff trust reports for the agency's account, each with its CSV download. */
export function TrustReportsTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const today = trustTodayKey();
  const [kind, setKind] = useState<TrustReportKind>(TRUST_REPORT_KIND.RECEIPTS);
  const [from, setFrom] = useState(() => trustMonthStartKey(today));
  const [to, setTo] = useState(today);
  const [asOf, setAsOf] = useState(today);
  const period = isTrustPeriodReport(kind);
  const query: TrustReportQuery = period ? { from, to } : { asOf };
  const ready = period ? Boolean(from && to) : Boolean(asOf);

  const { data, error, loading, reload } = useTrustResource(
    ready ? `${agencyId}:${bankAccountId}:${kind}:${JSON.stringify(query)}` : null,
    () => loadReport(agencyId, bankAccountId, kind, query),
  );
  const report = data && data.kind === kind ? data : null;

  return (
    <div className="space-y-3">
      <FilterChips options={TRUST_REPORT_KINDS} value={kind} onChange={setKind} />
      <div className="flex flex-wrap items-end gap-2">
        {period ? (
          <>
            <DateField id="trust-report-from" label={COPY.from} value={from} onChange={setFrom} />
            <DateField id="trust-report-to" label={COPY.to} value={to} onChange={setTo} min={from} />
          </>
        ) : (
          <DateField id="trust-report-as-of" label={COPY.asOf} value={asOf} onChange={setAsOf} />
        )}
        <div className="ml-auto">
          <TrustDownloadButton
            label={COPY.downloadCsv}
            filename={trustReportFilename(kind, query)}
            fetchBlob={() => downloadTrustReportCsv(agencyId, bankAccountId, kind, query)}
            failedMessage={COPY.downloadFailed}
          />
        </div>
      </div>

      {!report ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : (
        <div className={cn('rounded-xl border bg-card', loading && 'opacity-60')}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm">
            <p className="font-semibold">{report.label}</p>
            <p className="text-muted-foreground">
              {COPY.rows(report.rowCount)} · {COPY.total}{' '}
              <span className="text-foreground font-semibold tabular-nums">
                {formatCents(report.totalCents)}
              </span>
            </p>
          </div>
          {report.truncated ? (
            <p className="border-b px-4 py-2 text-xs text-amber-700 dark:text-amber-300">{COPY.truncated}</p>
          ) : null}
          {report.rows.length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">{COPY.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <ReportRows kind={kind} report={report} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
