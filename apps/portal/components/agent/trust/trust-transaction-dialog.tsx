'use client';

import { ArrowLeftRight, Undo2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { TrustCorrectionDialog } from '@/components/agent/trust/trust-correction-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustPill,
  TrustReasonDialog,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TRUST_PAYMENT_METHOD_LABEL,
  TRUST_REVERSE_COPY,
  TRUST_TRANSACTION_DISPLAY_STATUS_LABEL,
  TRUST_TRANSACTION_DISPLAY_STATUS_TONE,
  TRUST_TRANSACTION_KIND_LABEL,
  TRUST_TRANSACTIONS_COPY as COPY,
} from '@/constants/trust';
import { TRUST_CORRECTION_ALLOCATION_OPTIONS, TRUST_CORRECTION_COPY } from '@/constants/trust-corrections';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustTransactionCorrections,
  fetchTrustTransaction,
  reverseTrustTransaction,
  type TrustTransaction,
} from '@/lib/crossub-api/agent-trust-client';
import {
  isPostedOriginalTrustTransaction,
  formatCents,
  formatTrustDate,
  newTrustIdempotencyKey,
} from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { isCorrectableReceipt } from '@/utils/trust-corrections';

const allocationLabel = (kind: string) =>
  TRUST_CORRECTION_ALLOCATION_OPTIONS.find((option) => option.id === kind)?.label ?? kind;

/** PRD phase 4 (D156): the corrections made to this receipt, oldest first. */
function ReceiptCorrections({ agencyId, transactionId, version }: { agencyId: string; transactionId: string; version: number }) {
  const { data } = useTrustResource(`${agencyId}:${transactionId}:corrections:${version}`, () =>
    fetchTrustTransactionCorrections(agencyId, transactionId),
  );
  if (!data || data.items.length === 0) return null;
  return (
    <div className="space-y-1 rounded-lg border p-3">
      <p className="text-xs font-medium">{TRUST_CORRECTION_COPY.listTitle}</p>
      {data.items.map((row) => (
        <p key={row.id} className="text-xs">
          {`${formatTrustDate(row.createdAt.slice(0, 10))} · ${formatCents(row.amountCents)} · ${TRUST_CORRECTION_COPY.movedBetween(
            `${allocationLabel(row.fromKind)} (${row.fromLedgerName})`,
            `${allocationLabel(row.toKind)} (${row.toLedgerName})`,
          )} · ${row.reason}`}
        </p>
      ))}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm">{children}</p>
    </div>
  );
}

function TransactionBody({ tx }: { tx: TrustTransaction }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrustPill className="bg-secondary text-secondary-foreground">
          {TRUST_TRANSACTION_KIND_LABEL[tx.kind]}
        </TrustPill>
        <TrustPill className={TRUST_TRANSACTION_DISPLAY_STATUS_TONE[tx.displayStatus]}>
          {TRUST_TRANSACTION_DISPLAY_STATUS_LABEL[tx.displayStatus]}
        </TrustPill>
        {tx.receiptNumber != null ? (
          <span className="text-muted-foreground text-xs">{COPY.receiptNumber(tx.receiptNumber)}</span>
        ) : null}
        {tx.billNumber != null ? (
          <span className="text-muted-foreground text-xs">{COPY.bill(tx.billNumber)}</span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact label={COPY.date}>{formatTrustDate(tx.effectiveDate)}</Fact>
        <Fact label={COPY.amount}>
          <span className="tabular-nums">{formatCents(tx.cashAmountCents)}</span>
        </Fact>
        <Fact label={COPY.method}>{tx.method ? TRUST_PAYMENT_METHOD_LABEL[tx.method] : '—'}</Fact>
        <Fact label={COPY.party}>{tx.partyName ?? '—'}</Fact>
        <Fact label={COPY.reference}>{tx.reference ?? '—'}</Fact>
        <Fact label={COPY.postedBy}>{tx.createdByName ?? '—'}</Fact>
      </div>

      {tx.isReversal ? <p className="text-muted-foreground text-xs">{COPY.reversalOf}</p> : null}
      {tx.reversalReason ? (
        <p className="text-muted-foreground text-xs">{COPY.reversedReason(tx.reversalReason)}</p>
      ) : null}

      {tx.bankLine ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground text-xs">{COPY.bankLine}</p>
          <p>
            {formatTrustDate(tx.bankLine.lineDate)} · {tx.bankLine.memo} ·{' '}
            <span className="tabular-nums">{formatCents(tx.bankLine.amountCents)}</span>
          </p>
        </div>
      ) : null}

      <div>
        <p className="mb-1 text-sm font-semibold">{COPY.entries}</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.ledger}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.details}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
              </tr>
            </thead>
            <tbody>
              {tx.entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{entry.ledgerName}</p>
                    <p className="text-muted-foreground font-mono text-xs">{entry.ledgerCode}</p>
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    {entry.details ?? entry.accountCodeName ?? '—'}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                    {formatCents(entry.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** One transaction with its ledger entries; a posted original can be reversed with a reason. */
export function TrustTransactionDialog({
  agencyId,
  transactionId,
  onClose,
  onReversed,
}: {
  agencyId: string;
  transactionId: string;
  onClose: () => void;
  onReversed: () => void;
}) {
  const { data, error, reload } = useTrustResource(`${agencyId}:${transactionId}`, () =>
    fetchTrustTransaction(agencyId, transactionId),
  );
  const [reversing, setReversing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correctionsVersion, setCorrectionsVersion] = useState(0);
  const [idempotencyKey] = useState(newTrustIdempotencyKey);

  async function reverse(reason: string) {
    if (!data) return;
    await reverseTrustTransaction(agencyId, transactionId, { idempotencyKey, reason });
    toast.success(TRUST_REVERSE_COPY.done(data.auditNumber));
    onReversed();
    reload();
  }

  return (
    <>
      <Dialog
        open={!reversing && !correcting}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{data ? COPY.detailTitle(data.auditNumber) : '…'}</DialogTitle>
            <DialogDescription>{data?.description ?? ''}</DialogDescription>
          </DialogHeader>
          {data ? (
            <div className="space-y-3">
              <TransactionBody tx={data} />
              {isCorrectableReceipt(data) ? (
                <ReceiptCorrections agencyId={agencyId} transactionId={transactionId} version={correctionsVersion} />
              ) : null}
            </div>
          ) : error ? (
            <TrustLoadError error={error} onRetry={reload} />
          ) : (
            <TrustLoading />
          )}
          <DialogFooter>
            {data && isCorrectableReceipt(data) ? (
              <Button type="button" variant="outline" onClick={() => setCorrecting(true)}>
                <ArrowLeftRight className="size-4" />
                {TRUST_CORRECTION_COPY.action}
              </Button>
            ) : null}
            {data && isPostedOriginalTrustTransaction(data) ? (
              <Button type="button" variant="outline" onClick={() => setReversing(true)}>
                <Undo2 className="size-4" />
                {COPY.reverse}
              </Button>
            ) : null}
            <Button type="button" onClick={onClose}>
              {COPY.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {correcting && data ? (
        <TrustCorrectionDialog
          agencyId={agencyId}
          transaction={data}
          onClose={() => setCorrecting(false)}
          onCorrected={() => {
            setCorrectionsVersion((n) => n + 1);
            onReversed();
            reload();
          }}
        />
      ) : null}
      {reversing && data ? (
        <TrustReasonDialog
          title={TRUST_REVERSE_COPY.title(data.auditNumber)}
          description={TRUST_REVERSE_COPY.description}
          reasonLabel={TRUST_REVERSE_COPY.reason}
          reasonRequired={TRUST_REVERSE_COPY.reasonRequired}
          submitLabel={TRUST_REVERSE_COPY.submit}
          cancelLabel={TRUST_REVERSE_COPY.cancel}
          destructive
          onSubmit={reverse}
          onClose={() => setReversing(false)}
        />
      ) : null}
    </>
  );
}
