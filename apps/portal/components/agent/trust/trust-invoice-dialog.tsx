'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import {
  TrustDownloadButton,
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
import { TRUST_LEDGER_KIND } from '@/constants/trust';
import {
  TRUST_INVOICE_DETAIL_COPY as COPY,
  TRUST_INVOICE_DISPLAY_STATUS_LABEL,
  TRUST_INVOICE_DISPLAY_STATUS_TONE,
  TRUST_INVOICES_COPY,
} from '@/constants/trust-invoices';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  cancelTrustTenantInvoice,
  downloadTrustTenantInvoiceAttachment,
  fetchTrustTenantInvoice,
  type TrustTenantInvoice,
} from '@/lib/crossub-api/agent-trust-invoices-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { canCancelTrustInvoice } from '@/utils/trust-invoices';

/** One tenant invoice with its payments; Cancel while nothing is paid. Mount it per open. */
export function TrustInvoiceDialog({
  agencyId,
  invoiceId,
  onClose,
  onChanged,
}: {
  agencyId: string;
  invoiceId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${invoiceId}`, () =>
    fetchTrustTenantInvoice(agencyId, invoiceId),
  );
  const [cancelling, setCancelling] = useState(false);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {!data ? (
          <>
            <DialogHeader>
              <DialogTitle>{TRUST_INVOICES_COPY.number}</DialogTitle>
              <DialogDescription />
            </DialogHeader>
            {error ? <TrustLoadError error={error} onRetry={reload} /> : loading ? <TrustLoading /> : null}
          </>
        ) : (
          <InvoiceBody agencyId={agencyId} invoice={data} />
        )}
        <DialogFooter>
          {data && canCancelTrustInvoice(data) ? (
            <Button type="button" variant="outline" onClick={() => setCancelling(true)}>
              {COPY.cancelInvoice}
            </Button>
          ) : null}
          <Button type="button" onClick={onClose}>
            {COPY.close}
          </Button>
        </DialogFooter>
        {cancelling && data ? (
          <TrustReasonDialog
            title={COPY.cancelTitle(data.invoiceNumber)}
            description={COPY.cancelDescription}
            reasonLabel={COPY.cancelReason}
            reasonRequired={COPY.cancelReasonRequired}
            submitLabel={COPY.cancelSubmit}
            cancelLabel={COPY.cancelKeep}
            destructive
            onSubmit={async (reason) => {
              const saved = await cancelTrustTenantInvoice(agencyId, data.id, { reason });
              toast.success(COPY.cancelledToast(saved.invoiceNumber));
              reload();
              onChanged();
            }}
            onClose={() => setCancelling(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceBody({ agencyId, invoice }: { agencyId: string; invoice: TrustTenantInvoice }) {
  const fromLabel =
    invoice.beneficiaryLedger.kind === TRUST_LEDGER_KIND.SUPPLIER ? COPY.fromSupplier : COPY.fromOwner;
  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle>{COPY.title(invoice.invoiceNumber)}</DialogTitle>
          <TrustPill className={TRUST_INVOICE_DISPLAY_STATUS_TONE[invoice.displayStatus]}>
            {TRUST_INVOICE_DISPLAY_STATUS_LABEL[invoice.displayStatus]}
          </TrustPill>
        </div>
        <DialogDescription>{invoice.details}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <Figure label={COPY.amount} value={formatCents(invoice.amountCents)} />
          <Figure label={COPY.paid} value={formatCents(invoice.paidCents)} />
          <Figure
            label={COPY.outstanding}
            value={formatCents(invoice.outstandingCents)}
            tone={invoice.outstandingCents > 0 ? 'text-destructive' : undefined}
          />
        </div>

        <dl className="space-y-1">
          <Fact label={COPY.tenant} value={`${invoice.tenantLedger.code} · ${invoice.tenantLedger.name}`} />
          <Fact label={fromLabel} value={`${invoice.beneficiaryLedger.code} · ${invoice.beneficiaryLedger.name}`} />
          {invoice.property ? <Fact label={COPY.property} value={invoice.property.referenceAddress} /> : null}
          <Fact label={COPY.type} value={invoice.accountCode.name} />
          <Fact label={COPY.gst} value={formatCents(invoice.gstCents)} />
          <Fact label={COPY.date} value={formatTrustDate(invoice.invoiceDate)} />
          <Fact label={COPY.dueDate} value={formatTrustDate(invoice.dueDate)} />
          <Fact label={COPY.period} value={invoice.period ?? '—'} />
          <Fact label={COPY.createdBy} value={invoice.createdByName ?? '—'} />
        </dl>

        {invoice.sourceBillId ? (
          <p className="text-muted-foreground text-xs">{COPY.fromBill(invoice.sourceBillNumber)}</p>
        ) : null}

        {invoice.attachment ? (
          <TrustDownloadButton
            label={invoice.attachment.fileName}
            filename={invoice.attachment.fileName}
            fetchBlob={() => downloadTrustTenantInvoiceAttachment(agencyId, invoice.id)}
            failedMessage={TRUST_INVOICES_COPY.attachmentFailed}
          />
        ) : null}

        <section className="space-y-2">
          <p className="text-xs font-semibold">{COPY.payments}</p>
          {invoice.payments.length === 0 ? (
            <p className="text-muted-foreground text-xs">{COPY.noPayments}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p>{COPY.receiptNumber(payment.receiptNumber, payment.auditNumber)}</p>
                    <p className="text-muted-foreground text-xs">{formatTrustDate(payment.effectiveDate)}</p>
                  </div>
                  <p className={cn('tabular-nums', payment.amountCents < 0 && 'text-destructive')}>
                    {formatCents(payment.amountCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {invoice.cancelledAt ? (
          <section className="rounded-lg border border-dashed p-3">
            <p className="text-xs font-semibold">{COPY.cancelled}</p>
            <p className="mt-1">{invoice.cancelledReason ?? '—'}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{formatTrustDate(invoice.cancelledAt)}</p>
          </section>
        ) : null}
      </div>
    </>
  );
}

function Figure({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn('mt-0.5 font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
