'use client';

import { Loader2, Upload } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustLinkLineDialog } from '@/components/agent/trust/trust-link-line-dialog';
import { TrustReceiptDialog } from '@/components/agent/trust/trust-receipt-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustConfirmDialog,
  TrustLoadError,
  TrustLoading,
  TrustReasonDialog,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import { TRUST_BANK_FILE } from '@/constants/trust';
import {
  TRUST_BANK_LINE_VIEW,
  TRUST_BANK_LINE_VIEW_LABEL,
  TRUST_BANK_LINE_VIEW_ORDER,
  TRUST_BANK_LINES_PAGE_SIZE,
  TRUST_BANK_WORKSPACE_COPY as COPY,
} from '@/constants/trust-bank-workspace';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  deleteTrustBankLine,
  fetchTrustBankLines,
  importTrustBankFile,
  matchSuggestedTrustBankLines,
  matchTrustBankLine,
  unmatchTrustBankLine,
  type TrustBankWorkspace,
  type TrustBankWorkspaceLine,
} from '@/lib/crossub-api/agent-trust-client';
import { fileToBase64 } from '@/lib/file-upload';
import { formatCents, formatTrustDate, trustTodayKey } from '@/lib/trust-accounting';
import type { ReceiptTenancySource } from '@/lib/trust-tenancy-search';
import { cn, formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { pageCount, suggestedMatchOf, suggestionText } from '@/utils/trust-bank-workspace';

type View = TrustBankWorkspaceLine['view'];

function viewOptions(counts: TrustBankWorkspace['counts'] | undefined) {
  const countOf: Record<View, number | undefined> = {
    UNMATCHED: counts?.unmatched,
    MATCHED: counts?.matched,
    DELETED: counts?.deleted,
  };
  return TRUST_BANK_LINE_VIEW_ORDER.map((id) => ({
    id,
    label: countOf[id] === undefined ? TRUST_BANK_LINE_VIEW_LABEL[id] : `${TRUST_BANK_LINE_VIEW_LABEL[id]} (${countOf[id]})`,
  }));
}

/** A credit line's suggested tenant, enough to open the receipt. The dialog loads the paid-to. */
function rentRowFromLine(line: TrustBankWorkspaceLine): ReceiptTenancySource | null {
  const suggestion = line.suggestion;
  if (!suggestion?.ledgerId || line.amountCents <= 0) return null;
  return {
    ledgerId: suggestion.ledgerId,
    ledgerCode: suggestion.ledgerCode ?? '',
    ledgerName: suggestion.ledgerName ?? '',
    propertyAddress: suggestion.propertyAddress ?? null,
    propertyReferenceAddress: suggestion.propertyReferenceAddress ?? null,
    hasRentProfile: suggestion.rentAmountCents != null,
    rentAmountCents: suggestion.rentAmountCents ?? null,
    rentPeriod: suggestion.rentPeriod ?? null,
  };
}

/**
 * The bank workspace (PRD phase 5, D159, D161): imported lines are kept until matched or deleted,
 * across every import. Match a line to its suggestion, to a picked unreconciled transaction or to a
 * payment batch total; receipt a deposit and then match the line to the new receipt; delete a line
 * with a reason; unmatch. Importing and matching never post anything.
 */
export function TrustBankStatementTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>(TRUST_BANK_LINE_VIEW.UNMATCHED);
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linking, setLinking] = useState<TrustBankWorkspaceLine | null>(null);
  const [receiptLine, setReceiptLine] = useState<TrustBankWorkspaceLine | null>(null);
  const [deleting, setDeleting] = useState<TrustBankWorkspaceLine | null>(null);
  const [unmatching, setUnmatching] = useState<TrustBankWorkspaceLine | null>(null);

  const lines = useTrustResource(`${agencyId}:${bankAccountId}:bank-lines:${view}:${page}`, () =>
    fetchTrustBankLines(agencyId, bankAccountId, { view, page, pageSize: TRUST_BANK_LINES_PAGE_SIZE }),
  );

  async function onFileChosen(chosen: File | undefined) {
    if (inputRef.current) inputRef.current.value = '';
    if (!chosen) return;
    if (chosen.size > TRUST_BANK_FILE.MAX_BYTES) {
      toast.error(COPY.tooLarge);
      return;
    }
    setImporting(true);
    try {
      const result = await importTrustBankFile(agencyId, bankAccountId, {
        fileName: chosen.name,
        mimeType: chosen.type || TRUST_BANK_FILE.DEFAULT_MIME_TYPE,
        sizeBytes: chosen.size,
        contentBase64: await fileToBase64(chosen),
      });
      if (result.alreadyImported) toast.info(COPY.alreadyImported);
      else toast.success(COPY.imported(result.newLineCount, result.duplicateLineCount));
      if (result.skippedBeforeOpeningCount > 0) toast.info(COPY.skipped(result.skippedBeforeOpeningCount));
      setView(TRUST_BANK_LINE_VIEW.UNMATCHED);
      setPage(1);
      lines.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.importFailed));
    } finally {
      setImporting(false);
    }
  }

  async function accept(line: TrustBankWorkspaceLine) {
    const target = suggestedMatchOf(line);
    if (!target) return;
    setBusyId(line.id);
    try {
      await matchTrustBankLine(agencyId, line.id, target);
      toast.success(COPY.matched);
      lines.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function acceptAll(candidates: readonly TrustBankWorkspaceLine[]) {
    setBusyId(TRUST_BANK_LINE_VIEW.UNMATCHED);
    try {
      const result = await matchSuggestedTrustBankLines(
        agencyId,
        bankAccountId,
        candidates.map((line) => line.id),
      );
      if (result.matchedCount > 0) toast.success(COPY.matchedCount(result.matchedCount));
      if (result.failed.length > 0) toast.error(`${COPY.failedCount(result.failed.length)}: ${result.failed[0].reason}`);
      lines.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function openReceipt(line: TrustBankWorkspaceLine) {
    if (line.amountCents <= 0) return;
    if (line.lineDate > trustTodayKey()) {
      toast.error(COPY.lineInFuture);
      return;
    }
    setReceiptLine(line);
  }

  /** Step two of "Receipt": the posted receipt explains the line (never sent as a bank line). */
  async function matchReceipted(line: TrustBankWorkspaceLine, transactionId: string) {
    try {
      await matchTrustBankLine(agencyId, line.id, { transactionId });
      toast.success(COPY.receiptThenMatch);
    } catch (err) {
      toast.error(`${COPY.receiptNotMatched}: ${apiErrorMessage(err)}`);
    } finally {
      lines.reload();
    }
  }

  const data = lines.data;
  const acceptable = view === TRUST_BANK_LINE_VIEW.UNMATCHED ? (data?.items ?? []).filter((line) => suggestedMatchOf(line)) : [];
  const busy = importing || busyId !== null;
  const pages = data ? pageCount(data.total, data.pageSize) : 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 text-sm">
          <p className="text-muted-foreground">{COPY.intro}</p>
          <p className="text-muted-foreground mt-1 text-xs">{COPY.workspaceHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
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

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <div className="min-w-0 flex-1">
          <FilterChips
            options={viewOptions(data?.counts)}
            value={view}
            onChange={(next) => {
              setView(next);
              setPage(1);
            }}
          />
        </div>
        {acceptable.length > 0 ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void acceptAll(acceptable)}>
            {busyId === TRUST_BANK_LINE_VIEW.UNMATCHED ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.acceptAll(acceptable.length)}
          </Button>
        ) : null}
      </div>

      {!data ? (
        lines.error ? (
          <TrustLoadError error={lines.error} onRetry={lines.reload} />
        ) : (
          <TrustLoading />
        )
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">{COPY.empty}</p>
      ) : (
        <div className={cn('overflow-x-auto rounded-xl border bg-card', lines.loading && 'opacity-60')}>
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.memo}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.match}</th>
                <th className={TRUST_TABLE_HEAD_CLASS} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((line) => (
                <WorkspaceRow
                  key={line.id}
                  line={line}
                  busy={busy}
                  working={busyId === line.id}
                  onAccept={() => void accept(line)}
                  onPick={() => setLinking(line)}
                  onReceipt={() => openReceipt(line)}
                  onDelete={() => setDeleting(line)}
                  onUnmatch={() => setUnmatching(line)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && pages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">{COPY.page(page, pages)}</span>
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {COPY.previous}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {COPY.next}
          </Button>
        </div>
      ) : null}

      {linking ? (
        <TrustLinkLineDialog
          key={linking.id}
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          line={linking}
          onClose={() => setLinking(null)}
          onLinked={lines.reload}
        />
      ) : null}

      {receiptLine ? (
        <TrustReceiptDialog
          key={receiptLine.id}
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          row={rentRowFromLine(receiptLine)}
          lockedAmountCents={receiptLine.amountCents}
          presetDate={receiptLine.lineDate}
          onClose={() => setReceiptLine(null)}
          onReceipted={(transactionId) => void matchReceipted(receiptLine, transactionId)}
        />
      ) : null}

      {deleting ? (
        <TrustReasonDialog
          title={COPY.deleteTitle}
          description={COPY.deleteDescription}
          reasonLabel={COPY.deleteReason}
          reasonRequired={COPY.deleteReasonRequired}
          submitLabel={COPY.deleteSubmit}
          cancelLabel={COPY.cancel}
          destructive
          optional
          onSubmit={async (reason) => {
            await deleteTrustBankLine(agencyId, deleting.id, { reason: reason || undefined });
            toast.success(COPY.deleted);
            lines.reload();
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}

      {unmatching ? (
        <TrustConfirmDialog
          title={COPY.unmatchTitle}
          description={COPY.unmatchDescription}
          submitLabel={COPY.unmatchSubmit}
          cancelLabel={COPY.cancel}
          onConfirm={async () => {
            await unmatchTrustBankLine(agencyId, unmatching.id);
            toast.success(COPY.unmatched);
            lines.reload();
          }}
          onClose={() => setUnmatching(null)}
        />
      ) : null}
    </div>
  );
}

function WorkspaceRow({
  line,
  busy,
  working,
  onAccept,
  onPick,
  onReceipt,
  onDelete,
  onUnmatch,
}: {
  line: TrustBankWorkspaceLine;
  busy: boolean;
  working: boolean;
  onAccept: () => void;
  onPick: () => void;
  onReceipt: () => void;
  onDelete: () => void;
  onUnmatch: () => void;
}) {
  const isUnmatched = line.view === TRUST_BANK_LINE_VIEW.UNMATCHED;
  const suggestion = isUnmatched ? suggestionText(line) : null;
  const canAccept = isUnmatched && suggestedMatchOf(line) !== null;

  let detail: ReactNode = <span className="text-muted-foreground">—</span>;
  if (line.view === TRUST_BANK_LINE_VIEW.MATCHED) {
    const what = line.transaction
      ? COPY.matchedTransaction(line.transaction.auditNumber, line.transaction.description)
      : line.batch
        ? COPY.matchedBatch(line.batch.batchNumber, line.batch.paymentCount)
        : null;
    detail = (
      <>
        <p>{what ?? '—'}</p>
        {line.matchedAt ? (
          <p className="text-muted-foreground text-xs">{COPY.matchedBy(line.matchedByName ?? null, formatDate(line.matchedAt))}</p>
        ) : null}
      </>
    );
  } else if (line.view === TRUST_BANK_LINE_VIEW.DELETED) {
    detail = <p className="text-muted-foreground">{COPY.deletedBy(line.deletedReason ?? '', line.deletedByName ?? null)}</p>;
  } else if (suggestion) {
    detail = (
      <>
        <p>{suggestion}</p>
        {line.suggestion?.amountDiffersFromRent ? (
          <p className="text-amber-700 text-xs dark:text-amber-300">{COPY.amountDiffers}</p>
        ) : null}
      </>
    );
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>{formatTrustDate(line.lineDate)}</td>
      <td className={TRUST_TABLE_CELL_CLASS}>
        <p>{line.memo}</p>
        {line.reference ? <p className="text-muted-foreground text-xs">{line.reference}</p> : null}
        {line.importFileName ? <p className="text-muted-foreground text-xs">{line.importFileName}</p> : null}
      </td>
      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>{formatCents(line.amountCents)}</td>
      <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>{detail}</td>
      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right whitespace-nowrap')}>
        {working ? (
          <Loader2 className="ml-auto size-4 animate-spin" />
        ) : (
          <div className="flex justify-end gap-1.5">
            {canAccept ? (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={onAccept}>
                {COPY.accept}
              </Button>
            ) : null}
            {isUnmatched && line.amountCents > 0 ? (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={onReceipt}>
                {COPY.receipt}
              </Button>
            ) : null}
            {isUnmatched ? (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={onPick}>
                {COPY.pick}
              </Button>
            ) : null}
            {isUnmatched ? (
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" disabled={busy} onClick={onDelete}>
                {COPY.delete}
              </Button>
            ) : null}
            {line.view === TRUST_BANK_LINE_VIEW.MATCHED ? (
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" disabled={busy} onClick={onUnmatch}>
                {COPY.unmatch}
              </Button>
            ) : null}
          </div>
        )}
      </td>
    </tr>
  );
}
