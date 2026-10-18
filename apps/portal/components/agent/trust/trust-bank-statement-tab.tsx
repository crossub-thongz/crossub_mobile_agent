'use client';

import { Loader2, RefreshCw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustLinkLineDialog } from '@/components/agent/trust/trust-link-line-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustPill,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  TRUST_BANK_FILE,
  TRUST_BANK_LINE_FILTER_ALL,
  TRUST_BANK_LINE_STATUS,
  TRUST_BANK_LINE_STATUS_LABEL,
  TRUST_BANK_LINE_STATUS_TONE,
  TRUST_BANK_STATEMENT_COPY as COPY,
  type TrustBankLineFilter,
} from '@/constants/trust';
import {
  processMatchedTrustBankLines,
  readTrustBankStatement,
  unlinkTrustBankLine,
  type ReadTrustBankFileInput,
  type TrustBankFile,
  type TrustBankFileLine,
} from '@/lib/crossub-api/agent-trust-client';
import { fileToBase64 } from '@/lib/file-upload';
import {
  formatCents,
  formatTrustDate,
  newTrustIdempotencyKey,
  trustBankLineInput,
} from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function filterOptions(counts: TrustBankFile['counts']) {
  return [
    { id: TRUST_BANK_LINE_FILTER_ALL, label: `${COPY.all} (${counts.all})` },
    { id: TRUST_BANK_LINE_STATUS.UNMATCHED, label: `${COPY.unmatched} (${counts.unmatched})` },
    { id: TRUST_BANK_LINE_STATUS.MATCHED, label: `${COPY.matched} (${counts.matched})` },
    { id: TRUST_BANK_LINE_STATUS.PROCESSED, label: `${COPY.reconciled} (${counts.reconciled})` },
  ] as const satisfies readonly { id: TrustBankLineFilter; label: string }[];
}

function suggestionText(line: TrustBankFileLine): string | null {
  const s = line.suggestion;
  if (!s) return null;
  if (s.ledgerName) {
    return COPY.suggestionTenant(s.ledgerName, s.propertyReferenceAddress ?? s.propertyAddress ?? null);
  }
  if (s.transactionAuditNumber != null) {
    return COPY.suggestionTransaction(s.transactionAuditNumber, s.transactionDescription ?? '');
  }
  return null;
}

/**
 * Import a QIF bank statement and reconcile it line by line, as the staff bank statement screen
 * does: accept a suggested match, match a line to a posted transaction, or unmatch a reconciled
 * line. The file is never stored (D98), so every action re-reads it to refresh the statuses.
 */
export function TrustBankStatementTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<ReadTrustBankFileInput | null>(null);
  const [file, setFile] = useState<TrustBankFile | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<TrustBankLineFilter>(TRUST_BANK_LINE_FILTER_ALL);
  const [reading, setReading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [linking, setLinking] = useState<TrustBankFileLine | null>(null);

  async function read(input: ReadTrustBankFileInput) {
    setReading(true);
    try {
      const next = await readTrustBankStatement(agencyId, bankAccountId, input);
      setUpload(input);
      setFile(next);
      // One idempotency key per line per read: a double submit posts once.
      setKeys(Object.fromEntries(next.lines.map((line) => [line.key, newTrustIdempotencyKey()])));
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.readFailed));
    } finally {
      setReading(false);
    }
  }

  async function onFileChosen(chosen: File | undefined) {
    if (inputRef.current) inputRef.current.value = '';
    if (!chosen) return;
    if (chosen.size > TRUST_BANK_FILE.MAX_BYTES) {
      toast.error(COPY.tooLarge);
      return;
    }
    await read({
      fileName: chosen.name,
      mimeType: chosen.type || TRUST_BANK_FILE.DEFAULT_MIME_TYPE,
      sizeBytes: chosen.size,
      contentBase64: await fileToBase64(chosen),
    });
  }

  function refresh() {
    if (upload) void read(upload);
  }

  async function processLines(lines: readonly TrustBankFileLine[], busy: string) {
    setBusyKey(busy);
    try {
      const result = await processMatchedTrustBankLines(agencyId, bankAccountId, {
        lines: lines.map((line) => ({
          bankLine: trustBankLineInput(line),
          idempotencyKey: keys[line.key] ?? newTrustIdempotencyKey(),
          ledgerId: line.suggestion?.ledgerId ?? undefined,
          transactionId: line.suggestion?.transactionId ?? undefined,
        })),
      });
      if (result.processedCount > 0) toast.success(COPY.processed(result.processedCount));
      if (result.failed.length > 0) {
        toast.error(`${COPY.failed(result.failed.length)}: ${result.failed[0].reason}`);
      }
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function unlink(line: TrustBankFileLine) {
    if (!line.savedLineId) return;
    setBusyKey(line.key);
    try {
      await unlinkTrustBankLine(agencyId, line.savedLineId);
      toast.success(COPY.unlinked);
      refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  const matched = file?.lines.filter((line) => line.status === TRUST_BANK_LINE_STATUS.MATCHED) ?? [];
  const shown =
    file?.lines.filter((line) => filter === TRUST_BANK_LINE_FILTER_ALL || line.status === filter) ?? [];
  const busy = reading || busyKey !== null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 text-sm">
          {file ? (
            <>
              <p className="font-medium">{file.fileName}</p>
              <p className="text-muted-foreground text-xs">
                {COPY.summary(file.lineCount, formatTrustDate(file.dateFrom), formatTrustDate(file.dateTo))}
                {file.skippedBeforeOpeningCount > 0
                  ? ` · ${COPY.skipped(file.skippedBeforeOpeningCount)}`
                  : ''}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">{COPY.intro}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {file ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={refresh}>
              <RefreshCw className="size-4" />
              {COPY.reread}
            </Button>
          ) : null}
          <Button type="button" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {reading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {COPY.choose}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={TRUST_BANK_FILE.ACCEPT}
            className="hidden"
            onChange={(e) => void onFileChosen(e.target.files?.[0])}
          />
        </div>
      </div>

      {file ? (
        <>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <div className="min-w-0 flex-1">
              <FilterChips options={filterOptions(file.counts)} value={filter} onChange={setFilter} />
            </div>
            {matched.length > 0 ? (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void processLines(matched, TRUST_BANK_LINE_STATUS.MATCHED)}
              >
                {busyKey === TRUST_BANK_LINE_STATUS.MATCHED ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {COPY.processAll(matched.length)}
              </Button>
            ) : null}
          </div>

          {shown.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
              {COPY.empty}
            </p>
          ) : (
            <div className={cn('overflow-x-auto rounded-xl border bg-card', reading && 'opacity-60')}>
              <table className="w-full border-collapse text-sm">
                <thead className="border-b">
                  <tr>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.memo}</th>
                    <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.status}</th>
                    <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.match}</th>
                    <th className={TRUST_TABLE_HEAD_CLASS} />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((line) => {
                    const suggestion = suggestionText(line);
                    return (
                      <tr key={line.key} className="border-b last:border-b-0">
                        <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                          {formatTrustDate(line.lineDate)}
                        </td>
                        <td className={TRUST_TABLE_CELL_CLASS}>
                          <p>{line.memo}</p>
                          {line.reference ? (
                            <p className="text-muted-foreground text-xs">{line.reference}</p>
                          ) : null}
                        </td>
                        <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                          {formatCents(line.amountCents)}
                        </td>
                        <td className={TRUST_TABLE_CELL_CLASS}>
                          <TrustPill className={TRUST_BANK_LINE_STATUS_TONE[line.status]}>
                            {TRUST_BANK_LINE_STATUS_LABEL[line.status]}
                          </TrustPill>
                        </td>
                        <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>
                          {line.transaction ? (
                            <p>{COPY.reconciledTo(line.transaction.auditNumber, line.transaction.description)}</p>
                          ) : suggestion ? (
                            <>
                              <p>{suggestion}</p>
                              {line.suggestion?.amountDiffersFromRent ? (
                                <p className="text-amber-700 text-xs dark:text-amber-300">
                                  {COPY.amountDiffers}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right whitespace-nowrap')}>
                          {busyKey === line.key ? (
                            <Loader2 className="ml-auto size-4 animate-spin" />
                          ) : line.status === TRUST_BANK_LINE_STATUS.MATCHED ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={busy}
                              onClick={() => void processLines([line], line.key)}
                            >
                              {COPY.processOne}
                            </Button>
                          ) : line.status === TRUST_BANK_LINE_STATUS.UNMATCHED ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={busy}
                              onClick={() => setLinking(line)}
                            >
                              {COPY.link}
                            </Button>
                          ) : line.status === TRUST_BANK_LINE_STATUS.PROCESSED && line.savedLineId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              disabled={busy}
                              onClick={() => void unlink(line)}
                            >
                              {COPY.unlink}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {linking ? (
        <TrustLinkLineDialog
          key={linking.key}
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          line={linking}
          onClose={() => setLinking(null)}
          onLinked={refresh}
        />
      ) : null}
    </div>
  );
}
