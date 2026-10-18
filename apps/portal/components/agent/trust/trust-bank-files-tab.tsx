'use client';

import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustDownloadButton,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_BANK_FILES_COPY as COPY,
  TRUST_BATCH_METHOD,
  TRUST_BATCH_METHOD_LABEL,
  TRUST_PAGE_SIZE_MAX,
  TRUST_PAYMENT_METHOD_LABEL,
  type TrustBatchMethod,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  createTrustPaymentBatch,
  downloadTrustPaymentBatchFile,
  downloadTrustPaymentBatchReport,
  fetchTrustPaymentBatch,
  fetchTrustPaymentBatches,
  fetchTrustPaymentsSummary,
  type TrustPaymentBatch,
  type TrustPaymentsSummary,
} from '@/lib/crossub-api/agent-trust-client';
import { formatPropertyDateTime } from '@/lib/format-datetime';
import { formatCents, formatTrustDate, trustTodayKey } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function PoolCard({
  method,
  pool,
  ready,
  onCreate,
}: {
  method: TrustBatchMethod;
  pool: TrustPaymentsSummary['eft'];
  ready: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-muted-foreground text-xs">{TRUST_BATCH_METHOD_LABEL[method]}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {COPY.poolCount(pool.count, formatCents(pool.totalCents))}
      </p>
      {pool.lastBatch ? (
        <p className="text-muted-foreground mt-0.5 text-xs">
          {COPY.lastFile(pool.lastBatch.batchNumber, formatTrustDate(pool.lastBatch.processingDate))}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="mt-3"
        disabled={pool.count === 0 || !ready}
        onClick={onCreate}
      >
        <FileDown className="size-4" />
        {method === TRUST_BATCH_METHOD.EFT ? COPY.createAba : COPY.createBpay}
      </Button>
    </div>
  );
}

function CreateBatchDialog({
  agencyId,
  bankAccountId,
  method,
  onClose,
  onCreated,
}: {
  agencyId: string;
  bankAccountId: string;
  method: TrustBatchMethod;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [processingDate, setProcessingDate] = useState(trustTodayKey);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      const batch = await createTrustPaymentBatch(agencyId, bankAccountId, {
        method,
        processingDate: processingDate || undefined,
      });
      toast.success(COPY.created(batch.batchNumber));
      onCreated();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {method === TRUST_BATCH_METHOD.EFT ? COPY.createAba : COPY.createBpay}
          </DialogTitle>
          <DialogDescription>{TRUST_BATCH_METHOD_LABEL[method]}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="trust-batch-date">{COPY.processingDate}</Label>
          <Input
            id="trust-batch-date"
            type="date"
            value={processingDate}
            min={trustTodayKey()}
            disabled={pending}
            onChange={(e) => setProcessingDate(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.close}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {method === TRUST_BATCH_METHOD.EFT ? COPY.createAba : COPY.createBpay}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchDialog({
  agencyId,
  batchId,
  onClose,
}: {
  agencyId: string;
  batchId: string;
  onClose: () => void;
}) {
  const { data, error, reload } = useTrustResource(`${agencyId}:${batchId}`, () =>
    fetchTrustPaymentBatch(agencyId, batchId),
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data ? COPY.detailTitle(data.batchNumber) : '…'}</DialogTitle>
          <DialogDescription>
            {data
              ? `${TRUST_PAYMENT_METHOD_LABEL[data.method]} · ${formatTrustDate(data.processingDate)} · ${formatCents(data.totalCents)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {data ? (
          <div className="max-h-[60vh] overflow-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b">
                <tr>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.payee}</th>
                  <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.ledger}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.account}</th>
                  <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-b-0">
                    <td className={TRUST_TABLE_CELL_CLASS}>
                      <p className="font-medium">{payment.payeeName}</p>
                      <p className="text-muted-foreground text-xs">{payment.reference}</p>
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden md:table-cell')}>
                      <p>{payment.ledger.name}</p>
                      <p className="text-muted-foreground font-mono text-xs">{payment.ledger.code}</p>
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'tabular-nums')}>
                      {payment.bpayReference
                        ? `${payment.bpayBillerCode ?? ''} ${payment.bpayReference}`
                        : `${payment.bsb ?? ''} ${payment.accountNumberMasked ?? ''}`}
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                      {formatCents(payment.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : (
          <TrustLoading />
        )}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {COPY.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchDownloads({ agencyId, batch }: { agencyId: string; batch: TrustPaymentBatch }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <TrustDownloadButton
        label={COPY.file}
        filename={batch.fileName}
        fetchBlob={() => downloadTrustPaymentBatchFile(agencyId, batch.id)}
        failedMessage={COPY.downloadFailed}
      />
      <TrustDownloadButton
        label={COPY.report}
        filename={batch.reportFileName}
        fetchBlob={() => downloadTrustPaymentBatchReport(agencyId, batch.id)}
        failedMessage={COPY.downloadFailed}
      />
    </div>
  );
}

/**
 * Bank transfers and BPAY payments from disbursements and bill payments wait in a pool; freeze
 * the pool into a numbered ABA (or BPAY CSV) file, then upload it to the bank.
 */
export function TrustBankFilesTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const [creating, setCreating] = useState<TrustBatchMethod | null>(null);
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);
  const summary = useTrustResource(`${agencyId}:${bankAccountId}:summary`, () =>
    fetchTrustPaymentsSummary(agencyId, bankAccountId),
  );
  const batches = useTrustResource(`${agencyId}:${bankAccountId}:batches`, () =>
    fetchTrustPaymentBatches(agencyId, bankAccountId, { pageSize: TRUST_PAGE_SIZE_MAX }),
  );

  function reloadAll() {
    summary.reload();
    batches.reload();
  }

  return (
    <div className="space-y-4">
      <TrustPanel title={COPY.pool}>
        {!summary.data ? (
          summary.error ? (
            <TrustLoadError error={summary.error} onRetry={summary.reload} />
          ) : (
            <TrustLoading />
          )
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <PoolCard
                method={TRUST_BATCH_METHOD.EFT}
                pool={summary.data.eft}
                ready={summary.data.abaReady}
                onCreate={() => setCreating(TRUST_BATCH_METHOD.EFT)}
              />
              <PoolCard
                method={TRUST_BATCH_METHOD.BPAY}
                pool={summary.data.bpay}
                ready
                onCreate={() => setCreating(TRUST_BATCH_METHOD.BPAY)}
              />
            </div>
            {!summary.data.abaReady && summary.data.abaMissing.length > 0 ? (
              <div className="text-sm">
                <p className="text-muted-foreground">{COPY.abaNotReady}</p>
                <ul className="mt-1 list-disc pl-5">
                  {summary.data.abaMissing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {summary.data.chequeCount > 0 ? (
              <p className="text-muted-foreground text-xs">{COPY.chequeCount(summary.data.chequeCount)}</p>
            ) : null}
          </div>
        )}
      </TrustPanel>

      <TrustPanel title={COPY.batches}>
        {!batches.data ? (
          batches.error ? (
            <TrustLoadError error={batches.error} onRetry={batches.reload} />
          ) : (
            <TrustLoading />
          )
        ) : batches.data.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{COPY.empty}</p>
        ) : (
          <div className="-mx-4 -mb-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b">
                <tr>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.number}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.method}</th>
                  <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>
                    {COPY.processingDate}
                  </th>
                  <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.payments}</th>
                  <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.total}</th>
                  <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.createdAt}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS} />
                </tr>
              </thead>
              <tbody>
                {batches.data.items.map((batch) => (
                  <tr
                    key={batch.id}
                    className="hover:bg-muted/40 cursor-pointer border-b last:border-b-0"
                    onClick={() => setOpenBatchId(batch.id)}
                  >
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'font-medium whitespace-nowrap')}>
                      #{batch.batchNumber}
                    </td>
                    <td className={TRUST_TABLE_CELL_CLASS}>
                      {TRUST_PAYMENT_METHOD_LABEL[batch.method]}
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden whitespace-nowrap md:table-cell')}>
                      {formatTrustDate(batch.processingDate)}
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                      {batch.paymentCount}
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                      {formatCents(batch.totalCents)}
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>
                      <p>{formatPropertyDateTime(batch.createdAt)}</p>
                      {batch.createdByName ? (
                        <p className="text-muted-foreground text-xs">{batch.createdByName}</p>
                      ) : null}
                    </td>
                    <td className={TRUST_TABLE_CELL_CLASS} onClick={(e) => e.stopPropagation()}>
                      <BatchDownloads agencyId={agencyId} batch={batch} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TrustPanel>

      {creating ? (
        <CreateBatchDialog
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          method={creating}
          onClose={() => setCreating(null)}
          onCreated={reloadAll}
        />
      ) : null}
      {openBatchId ? (
        <BatchDialog agencyId={agencyId} batchId={openBatchId} onClose={() => setOpenBatchId(null)} />
      ) : null}
    </div>
  );
}
