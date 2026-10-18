'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';

import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  INVOICE_MATCH_STATUS,
  INVOICE_RESOLUTION,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_UPLOAD_KIND,
  type InvoiceResolution,
  type SelfManagedUploadKind,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  approveMaintenanceCompletion,
  recordMaintenancePayment,
  recordMaintenanceTenantSignOff,
  resolveMaintenanceInvoiceMatch,
  uploadSelfManagedCompletionFile,
  type AgentMaintenanceDetail,
  type AgentMaintenanceInvoiceMatch,
} from '@/lib/crossub-api/maintenance-client';
import { fileToBase64 } from '@/lib/file-upload';
import { cn, formatCurrency } from '@/lib/utils';

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

/** One completion gate: its label, a tick when done, and the control that clears it. */
function GateRow({ label, done, children }: { label: string; done: boolean; children?: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        {done ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label={COPY.done} />
        ) : (
          <Circle className="text-muted-foreground size-4 shrink-0" />
        )}
        <span className={cn('truncate', done && 'text-muted-foreground')}>{label}</span>
      </span>
      {done ? null : children}
    </li>
  );
}

/** A file button that uploads one completion file of the given kind. */
function UploadButton({
  requestId,
  kind,
  label,
  accept,
  busy,
  run,
}: {
  requestId: string;
  kind: SelfManagedUploadKind;
  label: string;
  accept: string;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    await run(
      async () =>
        uploadSelfManagedCompletionFile(requestId, {
          kind,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          contentBase64: await fileToBase64(file),
        }),
      COPY.uploaded,
    );
    if (inputRef.current) inputRef.current.value = '';
  };
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 px-2.5 text-xs"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

/**
 * Finish the job: the four completion gates a CROSSUB officer clears on other plans — photos and
 * invoice (uploaded for the tradie when they sent them to the agency), the tenant's confirmation,
 * and the agency's sign-off, which copies the owner. The job closes when all four are done.
 */
export function CompletionStep({
  detail,
  busy,
  run,
}: {
  detail: AgentMaintenanceDetail;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const requestId = detail.id;
  return (
    <StepCard title={COPY.completionTitle} hint={COPY.completionHint}>
      <ul className="space-y-2">
        <GateRow label={COPY.gateEvidence} done={detail.completionEvidenceUploaded}>
          <UploadButton
            requestId={requestId}
            kind={SELF_MANAGED_UPLOAD_KIND.EVIDENCE}
            label={COPY.uploadPhotos}
            accept="image/*,video/*,application/pdf"
            busy={busy}
            run={run}
          />
        </GateRow>
        <GateRow label={COPY.gateInvoice} done={detail.invoiceUploaded}>
          <UploadButton
            requestId={requestId}
            kind={SELF_MANAGED_UPLOAD_KIND.INVOICE}
            label={COPY.uploadInvoice}
            accept="image/*,application/pdf"
            busy={busy}
            run={run}
          />
        </GateRow>
        <GateRow label={COPY.gateTenant} done={detail.tenantApprovalReceived}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 px-2.5 text-xs"
            disabled={busy}
            onClick={() =>
              void run(() => recordMaintenanceTenantSignOff(requestId), COPY.tenantRecorded)
            }
          >
            {COPY.recordTenant}
          </Button>
        </GateRow>
        <GateRow label={COPY.gateAgency} done={detail.agentApprovalReceived}>
          <Button
            size="sm"
            className="h-7 shrink-0 px-2.5 text-xs"
            disabled={busy || !detail.completionEvidenceUploaded}
            title={detail.completionEvidenceUploaded ? undefined : COPY.signOffNeedsEvidence}
            onClick={() => void run(() => approveMaintenanceCompletion(requestId), COPY.signedOff)}
          >
            {COPY.signOff}
          </Button>
        </GateRow>
      </ul>
    </StepCard>
  );
}
