'use client';

import { useId, useState } from 'react';

import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  INVOICE_MATCH_STATUS,
  INVOICE_RESOLUTION,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  type InvoiceResolution,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  approveMaintenanceCompletion,
  recordMaintenancePayment,
  resolveMaintenanceInvoiceMatch,
  type AgentMaintenanceInvoiceMatch,
} from '@/lib/crossub-api/maintenance-client';
import { formatCurrency } from '@/lib/utils';

/** Accept an invoice that differs from the approved quote, or dispute it. */
export function InvoiceDecisionStep({
  requestId,
  match,
  busy,
  run,
}: {
  requestId: string;
  match: AgentMaintenanceInvoiceMatch;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [note, setNote] = useState('');
  const invoice = formatCurrency(match.invoiceAmount);
  const summary =
    match.status === INVOICE_MATCH_STATUS.UNMATCHED || match.approvedAmount === null
      ? COPY.invoiceUnmatched(invoice)
      : COPY.invoiceVariance(invoice, formatCurrency(match.approvedAmount));

  const resolve = (resolution: InvoiceResolution) =>
    run(
      () =>
        resolveMaintenanceInvoiceMatch(requestId, match.id, {
          resolution,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      COPY.invoiceResolved,
    );

  return (
    <StepCard title={COPY.invoiceTitle} hint={summary} tone="attention">
      <div>
        <FieldLabel htmlFor={`${id}-note`}>{COPY.invoiceNote}</FieldLabel>
        <Input id={`${id}-note`} value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void resolve(INVOICE_RESOLUTION.APPROVE_VARIANCE)}
        >
          {COPY.acceptVariance}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void resolve(INVOICE_RESOLUTION.DISPUTE)}
        >
          {COPY.dispute}
        </Button>
      </div>
    </StepCard>
  );
}

/** Record the agency's own payment to the tradie (an off-platform settlement). */
export function PaymentStep({
  requestId,
  match,
  busy,
  run,
}: {
  requestId: string;
  match: AgentMaintenanceInvoiceMatch;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [amount, setAmount] = useState(String(match.invoiceAmount));
  const [reference, setReference] = useState('');
  const amountValue = Number(amount);

  return (
    <StepCard title={COPY.paymentTitle}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel htmlFor={`${id}-amount`}>{COPY.paidAmount}</FieldLabel>
          <Input
            id={`${id}-amount`}
            type="number"
            min={1}
            inputMode="decimal"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor={`${id}-reference`}>{COPY.paymentReference}</FieldLabel>
          <Input
            id={`${id}-reference`}
            value={reference}
            disabled={busy}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      </div>
      <Button
        size="sm"
        disabled={busy || !(amountValue > 0)}
        onClick={() =>
          void run(
            () =>
              recordMaintenancePayment(requestId, match.id, {
                paidAmount: amountValue,
                ...(reference.trim() ? { reference: reference.trim() } : {}),
              }),
            COPY.paymentRecorded,
          )
        }
      >
        {COPY.recordPayment}
      </Button>
    </StepCard>
  );
}

/** Sign the completed work off; the owner is copied. Needs the tradie's completion photos. */
export function CompletionStep({
  requestId,
  evidenceUploaded,
  busy,
  run,
}: {
  requestId: string;
  evidenceUploaded: boolean;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  return (
    <StepCard
      title={COPY.completionTitle}
      hint={evidenceUploaded ? COPY.completionReady : COPY.completionNeedsEvidence}
    >
      <Button
        size="sm"
        disabled={busy || !evidenceUploaded}
        onClick={() => void run(() => approveMaintenanceCompletion(requestId), COPY.signedOff)}
      >
        {COPY.signOff}
      </Button>
    </StepCard>
  );
}
