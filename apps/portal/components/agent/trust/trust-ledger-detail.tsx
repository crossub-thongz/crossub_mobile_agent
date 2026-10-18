'use client';

import { ArrowLeft } from 'lucide-react';

import { TrustFeesPanel } from '@/components/agent/trust/trust-fees-panel';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustEmailOwnerButton,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
  TrustPill,
  TrustDownloadButton,
  TrustStatementPdfButton,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  TRUST_LEDGER_FILE_FORMAT,
  TRUST_LEDGER_KIND,
  TRUST_LEDGER_KIND_LABEL,
  TRUST_LEDGERS_COPY as COPY,
  TRUST_PAGE_SIZE_MAX,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  downloadTrustLedgerFile,
  fetchTrustLedger,
  fetchTrustLedgerEntries,
  fetchTrustLedgerStatements,
  type TrustAccountCode,
  type TrustLedger,
} from '@/lib/crossub-api/agent-trust-client';
import {
  formatCents,
  formatTrustDate,
  trustLedgerFilename,
  trustStatementFilename,
} from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

export function TrustLedgerDetail({
  agencyId,
  ledgerId,
  accountCodes,
  onBack,
}: {
  agencyId: string;
  ledgerId: string;
  accountCodes: readonly TrustAccountCode[];
  onBack: () => void;
}) {
  const ledger = useTrustResource(`${agencyId}:${ledgerId}`, () =>
    fetchTrustLedger(agencyId, ledgerId),
  );

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {COPY.back}
      </Button>

      {!ledger.data ? (
        ledger.error ? (
          <TrustLoadError error={ledger.error} onRetry={ledger.reload} />
        ) : (
          <TrustLoading />
        )
      ) : (
        <>
          <LedgerHeader agencyId={agencyId} ledger={ledger.data} />
          <div
            className={cn(
              'grid gap-4',
              ledger.data.kind === TRUST_LEDGER_KIND.OWNER && 'lg:grid-cols-[3fr_2fr]',
            )}
          >
            <LedgerEntries agencyId={agencyId} ledgerId={ledgerId} />
            {ledger.data.kind === TRUST_LEDGER_KIND.OWNER ? (
              <div className="space-y-4">
                <OwnerStatements agencyId={agencyId} ledger={ledger.data} />
                <TrustFeesPanel
                  agencyId={agencyId}
                  ledgerId={ledgerId}
                  accountCodes={accountCodes}
                  onChanged={ledger.reload}
                />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function LedgerHeader({ agencyId, ledger }: { agencyId: string; ledger: TrustLedger }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">{ledger.code}</span>
          <TrustPill className="bg-secondary text-secondary-foreground">
            {TRUST_LEDGER_KIND_LABEL[ledger.kind]}
          </TrustPill>
        </div>
        <p className="mt-1 text-lg font-semibold leading-tight">{ledger.name}</p>
        {ledger.propertyAddress ? (
          <p className="text-muted-foreground mt-0.5 text-sm">{ledger.propertyAddress}</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="text-right">
          <p className="text-muted-foreground text-xs">{COPY.balance}</p>
          <p className="text-xl font-semibold tabular-nums">{formatCents(ledger.balanceCents)}</p>
        </div>
        <div className="flex gap-2">
          <TrustDownloadButton
            label={COPY.downloadCsv}
            filename={trustLedgerFilename(ledger.code, TRUST_LEDGER_FILE_FORMAT.CSV)}
            fetchBlob={() => downloadTrustLedgerFile(agencyId, ledger.id, TRUST_LEDGER_FILE_FORMAT.CSV)}
            failedMessage={COPY.downloadFailed}
          />
          <TrustDownloadButton
            label={COPY.downloadLedgerPdf}
            filename={trustLedgerFilename(ledger.code, TRUST_LEDGER_FILE_FORMAT.PDF)}
            fetchBlob={() => downloadTrustLedgerFile(agencyId, ledger.id, TRUST_LEDGER_FILE_FORMAT.PDF)}
            failedMessage={COPY.downloadFailed}
          />
        </div>
      </div>
    </div>
  );
}

function LedgerEntries({ agencyId, ledgerId }: { agencyId: string; ledgerId: string }) {
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${ledgerId}`, () =>
    fetchTrustLedgerEntries(agencyId, ledgerId, { pageSize: TRUST_PAGE_SIZE_MAX }),
  );

  return (
    <TrustPanel title={COPY.entries}>
      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.noEntries}</p>
      ) : (
        <div className="-mx-4 -mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.details}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden text-right md:table-cell')}>
                  {COPY.runningBalance}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                    {formatTrustDate(entry.effectiveDate)}
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p>{entry.details ?? entry.accountCodeName ?? '—'}</p>
                    <p className="text-muted-foreground text-xs">#{entry.auditNumber}</p>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                    {formatCents(entry.amountCents)}
                  </td>
                  <td
                    className={cn(
                      TRUST_TABLE_CELL_CLASS,
                      'text-muted-foreground hidden text-right tabular-nums md:table-cell',
                    )}
                  >
                    {formatCents(entry.balanceAfterCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > data.items.length ? (
            <p className="text-muted-foreground border-t px-3 py-2 text-xs">
              {COPY.showing(data.items.length, data.total)}
            </p>
          ) : null}
        </div>
      )}
    </TrustPanel>
  );
}

function OwnerStatements({ agencyId, ledger }: { agencyId: string; ledger: TrustLedger }) {
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${ledger.id}`, () =>
    fetchTrustLedgerStatements(agencyId, ledger.id, { pageSize: TRUST_PAGE_SIZE_MAX }),
  );

  return (
    <TrustPanel title={COPY.statements}>
      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.noStatements}</p>
      ) : (
        <ul className="divide-y text-sm">
          {data.items.map((statement) => (
            <li key={statement.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{COPY.statementNumber(statement.statementNumber)}</p>
                  <p className="text-muted-foreground text-xs">
                    {COPY.period(
                      formatTrustDate(statement.periodStart),
                      formatTrustDate(statement.periodEnd),
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">{COPY.closing}</p>
                  <p className="tabular-nums">{formatCents(statement.closingBalanceCents)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <TrustStatementPdfButton
                  agencyId={agencyId}
                  statementId={statement.id}
                  filename={trustStatementFilename(ledger.code, statement.statementNumber)}
                  label={COPY.downloadPdf}
                />
                <TrustEmailOwnerButton
                  agencyId={agencyId}
                  statementId={statement.id}
                  label={COPY.emailOwner}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </TrustPanel>
  );
}
