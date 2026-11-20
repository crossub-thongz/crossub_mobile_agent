'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustLedgerSelect, useTrustOpenLedgers } from '@/components/agent/trust/trust-ledger-select';
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
import { TRUST_LEDGER_KIND } from '@/constants/trust';
import {
  TRUST_CORRECTION_ALLOCATION,
  TRUST_CORRECTION_ALLOCATION_OPTIONS,
  TRUST_CORRECTION_BLOCK_LABEL,
  TRUST_CORRECTION_COPY as COPY,
  TRUST_CORRECTION_LIMITS,
  type TrustCorrectionAllocation,
} from '@/constants/trust-corrections';
import {
  confirmTrustCorrection,
  previewTrustCorrection,
  type CorrectTrustAllocationInput,
  type TrustCorrectionLeg,
  type TrustCorrectionPreview,
  type TrustLedger,
  type TrustTransaction,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, newTrustIdempotencyKey, parseDollarsToCents } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn } from '@/lib/utils';
import { isCorrectionTargetDifferent, receiptAllocations } from '@/utils/trust-corrections';

const TENANT_KINDS = [TRUST_LEDGER_KIND.TENANT] as const;

/** The money moves of a correction or move-out: from folio → to folio, with the source's Available. */
export function TrustCorrectionLegs({ legs }: { legs: readonly TrustCorrectionLeg[] }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{COPY.legs}</p>
      <ul className="space-y-1 text-xs">
        {legs.map((leg) => (
          <li key={`${leg.fromLedgerId}:${leg.toLedgerId}`} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {leg.fromLedgerId === leg.toLedgerId
                ? `${leg.fromLedgerCode}: ${COPY.noMove}`
                : `${leg.fromLedgerCode} ${leg.fromLedgerName} → ${leg.toLedgerCode} ${leg.toLedgerName}`}
            </span>
            <span className="flex items-center gap-2 tabular-nums">
              {formatCents(leg.amountCents)}
              <span className={cn(leg.fundsOk ? 'text-muted-foreground' : 'text-destructive font-medium')}>
                {leg.fundsOk ? COPY.available(formatCents(leg.fromAvailableCents)) : COPY.short}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * PRD phase 4 (D156): move part of a posted receipt's Rent or Deposit to Rent or Deposit of this or
 * another tenant on the same trust account. Preview first; confirming posts all the journals and
 * paid-to changes together, or nothing.
 */
export function TrustCorrectionDialog({
  agencyId,
  transaction,
  onClose,
  onCorrected,
}: {
  agencyId: string;
  transaction: TrustTransaction;
  onClose: () => void;
  onCorrected: () => void;
}) {
  const receipt = receiptAllocations(transaction);
  const tenants = useTrustOpenLedgers(agencyId, transaction.trustBankAccountId, TENANT_KINDS);
  const [fromKind, setFromKind] = useState<TrustCorrectionAllocation>(
    receipt.amounts[TRUST_CORRECTION_ALLOCATION.RENT] > 0 ? TRUST_CORRECTION_ALLOCATION.RENT : TRUST_CORRECTION_ALLOCATION.DEPOSIT,
  );
  const [toKind, setToKind] = useState<TrustCorrectionAllocation>(
    fromKind === TRUST_CORRECTION_ALLOCATION.RENT ? TRUST_CORRECTION_ALLOCATION.DEPOSIT : TRUST_CORRECTION_ALLOCATION.RENT,
  );
  const [toLedger, setToLedger] = useState<TrustLedger | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<{ key: string; data: TrustCorrectionPreview } | null>(null);
  const [pending, setPending] = useState(false);
  const [idempotencyKey] = useState(newTrustIdempotencyKey);

  const fromLedgerId = receipt.tenantLedgerId ?? '';
  const toLedgerId = toLedger?.id ?? fromLedgerId;
  const amountCents = parseDollarsToCents(amount);
  const trimmedReason = reason.trim();
  const key = [fromKind, toKind, toLedgerId, amountCents ?? '', trimmedReason].join('|');
  const current = preview?.key === key ? preview.data : null;

  function input(): CorrectTrustAllocationInput | null {
    if (amountCents == null || amountCents <= 0) {
      toast.error(COPY.amountInvalid);
      return null;
    }
    if (!trimmedReason) {
      toast.error(COPY.reasonRequired);
      return null;
    }
    if (!isCorrectionTargetDifferent({ fromKind, fromLedgerId, toKind, toLedgerId })) {
      toast.error(COPY.tenantRequired);
      return null;
    }
    return { fromKind, fromLedgerId, toKind, toLedgerId, amountCents, reason: trimmedReason };
  }

  async function runPreview() {
    const body = input();
    if (!body) return;
    setPending(true);
    try {
      setPreview({ key, data: await previewTrustCorrection(agencyId, transaction.id, body) });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    const body = input();
    if (!body) return;
    setPending(true);
    try {
      await confirmTrustCorrection(agencyId, transaction.id, { ...body, idempotencyKey });
      toast.success(COPY.done);
      onCorrected();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const kindSelect = (id: string, value: TrustCorrectionAllocation, onChange: (next: TrustCorrectionAllocation) => void) => (
    <select
      id={id}
      className={SELECT_CLASS}
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value as TrustCorrectionAllocation)}
    >
      {TRUST_CORRECTION_ALLOCATION_OPTIONS.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.title(transaction.auditNumber)}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-correction-from">
                {COPY.from}
                {receipt.tenantName ? ` (${COPY.fromTenant(receipt.tenantName)})` : ''}
              </Label>
              {kindSelect('trust-correction-from', fromKind, setFromKind)}
              <p className="text-muted-foreground text-xs">{formatCents(receipt.amounts[fromKind])}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-correction-to">{COPY.to}</Label>
              {kindSelect('trust-correction-to', toKind, setToKind)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-correction-tenant">{COPY.toTenant}</Label>
            <TrustLedgerSelect
              id="trust-correction-tenant"
              ledgers={tenants.data ?? []}
              value={toLedger ?? tenants.data?.find((ledger) => ledger.id === fromLedgerId) ?? null}
              placeholder={COPY.chooseTenant}
              disabled={pending || !tenants.data}
              onChange={setToLedger}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-correction-amount">{COPY.amount}</Label>
              <Input id="trust-correction-amount" inputMode="decimal" value={amount} disabled={pending} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-correction-reason">{COPY.reason}</Label>
              <Input
                id="trust-correction-reason"
                value={reason}
                maxLength={TRUST_CORRECTION_LIMITS.reasonMax}
                disabled={pending}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          {current ? (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground text-xs">{COPY.remaining(formatCents(current.remainingCents))}</p>
              {current.legs.length > 0 ? <TrustCorrectionLegs legs={current.legs} /> : null}
              {current.paidTo.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">{COPY.paidTo}</p>
                  {current.paidTo.map((row) => (
                    <p key={row.ledgerId} className="flex justify-between gap-2 text-xs">
                      <span>{`${row.ledgerCode} ${row.ledgerName}`}</span>
                      <span className="tabular-nums">
                        {COPY.paidToChange(formatTrustDate(row.effectivePaidToBefore), formatTrustDate(row.effectivePaidToAfter))}
                      </span>
                    </p>
                  ))}
                </div>
              ) : null}
              {current.managementFeeDifferenceCents > 0 ? (
                <p className="text-muted-foreground text-xs">{COPY.managementFee(formatCents(current.managementFeeDifferenceCents))}</p>
              ) : null}
              {current.blockedReason ? (
                <p className="text-destructive text-xs">{TRUST_CORRECTION_BLOCK_LABEL[current.blockedReason]}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => void runPreview()}>
            {COPY.preview}
          </Button>
          <Button type="button" disabled={pending || !current?.canConfirm} onClick={() => void confirm()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
