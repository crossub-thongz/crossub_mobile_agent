'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustLoadError, TrustLoading } from '@/components/agent/trust/trust-ui';
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
  TRUST_INPUT_LIMITS,
  TRUST_LEDGER_KIND,
  TRUST_PAYOUT_COPY as COPY,
  TRUST_PAYOUT_DUE_SOURCE,
  TRUST_PAYOUT_FREQUENCIES,
  TRUST_PAYOUT_FREQUENCY,
  TRUST_PAYOUT_FREQUENCY_LABEL,
  TRUST_PAYOUT_METHOD,
  TRUST_PAYOUT_METHOD_LABEL,
  TRUST_PAYOUT_METHODS,
  type TrustLedgerKind,
  type TrustPayoutFrequency,
  type TrustPayoutRowMethod,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustPayoutMethods,
  putTrustPayoutMethods,
  setTrustPayoutSchedule,
  type TrustPayoutMethods,
} from '@/lib/crossub-api/agent-trust-client';
import { trustPayoutRowDraft, trustPayoutRowsInput, type TrustPayoutRowDraft } from '@/lib/trust-setup';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Payout details (bank account, BPAY or cheque, split by share) and, on an owner ledger, the
 * payout schedule. Replaces "Payout details are set up by CROSSUB". Mount per open.
 */
export function TrustPayoutDialog({
  agencyId,
  ledgerId,
  ledgerName,
  ledgerKind,
  onClose,
  onSaved,
}: {
  agencyId: string;
  ledgerId: string;
  ledgerName: string;
  ledgerKind: TrustLedgerKind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const saved = useTrustResource(`${agencyId}:${ledgerId}:payout`, () => fetchTrustPayoutMethods(agencyId, ledgerId));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{COPY.dialogTitle(ledgerName)}</DialogTitle>
          <DialogDescription>{COPY.dialogDescription}</DialogDescription>
        </DialogHeader>
        {saved.data ? (
          <PayoutForm
            agencyId={agencyId}
            ledgerId={ledgerId}
            ledgerName={ledgerName}
            isOwner={ledgerKind === TRUST_LEDGER_KIND.OWNER}
            saved={saved.data}
            onClose={onClose}
            onSaved={onSaved}
          />
        ) : saved.error ? (
          <TrustLoadError error={saved.error} onRetry={saved.reload} />
        ) : (
          <TrustLoading />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PayoutForm({
  agencyId,
  ledgerId,
  ledgerName,
  isOwner,
  saved,
  onClose,
  onSaved,
}: {
  agencyId: string;
  ledgerId: string;
  ledgerName: string;
  isOwner: boolean;
  saved: TrustPayoutMethods;
  onClose: () => void;
  onSaved: () => void;
}) {
  const activeRows = saved.rows.filter((row) => row.isActive);
  const [rows, setRows] = useState<TrustPayoutRowDraft[]>(() =>
    activeRows.length > 0
      ? activeRows.map((row) => trustPayoutRowDraft(row, ledgerName, ''))
      : [trustPayoutRowDraft(null, ledgerName, '100')],
  );
  const [frequency, setFrequency] = useState<TrustPayoutFrequency>(saved.payoutFrequency);
  // Only a date set by hand is shown to edit; a worked-out one stays the API's to work out.
  const initialNextDue =
    saved.nextPayoutDueSource === TRUST_PAYOUT_DUE_SOURCE.SET ? (saved.nextPayoutDue ?? '') : '';
  const [nextDue, setNextDue] = useState(initialNextDue);
  const [pending, setPending] = useState(false);

  const update = (key: string, patch: Partial<TrustPayoutRowDraft>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  async function onSubmit() {
    const checked = trustPayoutRowsInput(rows);
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    setPending(true);
    try {
      await putTrustPayoutMethods(agencyId, ledgerId, { rows: checked.value });
      const scheduleChanged = frequency !== saved.payoutFrequency || nextDue !== initialNextDue;
      if (isOwner && scheduleChanged) {
        // Omitted keeps the stored date; null clears it (always for ON_DEMAND).
        const nextPayoutDue =
          frequency === TRUST_PAYOUT_FREQUENCY.ON_DEMAND ? null : nextDue || (initialNextDue ? null : undefined);
        await setTrustPayoutSchedule(agencyId, ledgerId, { payoutFrequency: frequency, nextPayoutDue });
      }
      toast.success(COPY.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.key} className="space-y-3 rounded-lg border p-3">
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr_6rem]">
              <div className="space-y-1.5">
                <Label htmlFor={`payout-method-${index}`}>{COPY.method}</Label>
                <select
                  id={`payout-method-${index}`}
                  className={SELECT_CLASS}
                  value={row.method}
                  disabled={pending}
                  onChange={(e) => update(row.key, { method: e.target.value as TrustPayoutRowMethod })}
                >
                  {TRUST_PAYOUT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {TRUST_PAYOUT_METHOD_LABEL[method]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`payout-payee-${index}`}>{COPY.payeeName}</Label>
                <Input
                  id={`payout-payee-${index}`}
                  value={row.payeeName}
                  maxLength={TRUST_INPUT_LIMITS.payeeNameMax}
                  disabled={pending}
                  onChange={(e) => update(row.key, { payeeName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`payout-share-${index}`}>{COPY.share}</Label>
                <Input
                  id={`payout-share-${index}`}
                  inputMode="decimal"
                  value={row.sharePercent}
                  disabled={pending}
                  onChange={(e) => update(row.key, { sharePercent: e.target.value })}
                />
              </div>
            </div>
            {row.method === TRUST_PAYOUT_METHOD.EFT ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`payout-bsb-${index}`}>{COPY.bsb}</Label>
                  <Input
                    id={`payout-bsb-${index}`}
                    inputMode="numeric"
                    value={row.bsb}
                    placeholder="062-000"
                    disabled={pending}
                    onChange={(e) => update(row.key, { bsb: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`payout-account-${index}`}>{COPY.accountNumber}</Label>
                  <Input
                    id={`payout-account-${index}`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={row.accountNumber}
                    placeholder={row.accountNumberMasked ?? undefined}
                    disabled={pending}
                    onChange={(e) => update(row.key, { accountNumber: e.target.value })}
                  />
                  {row.accountNumberMasked ? (
                    <p className="text-muted-foreground text-xs">{COPY.accountNumberKeep(row.accountNumberMasked)}</p>
                  ) : null}
                </div>
              </div>
            ) : row.method === TRUST_PAYOUT_METHOD.BPAY ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`payout-biller-${index}`}>{COPY.billerCode}</Label>
                  <Input
                    id={`payout-biller-${index}`}
                    inputMode="numeric"
                    value={row.bpayBillerCode}
                    disabled={pending}
                    onChange={(e) => update(row.key, { bpayBillerCode: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`payout-ref-${index}`}>{COPY.reference}</Label>
                  <Input
                    id={`payout-ref-${index}`}
                    inputMode="numeric"
                    value={row.bpayReference}
                    disabled={pending}
                    onChange={(e) => update(row.key, { bpayReference: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={pending}
                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              >
                <Trash2 className="size-3.5" />
                {COPY.remove}
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setRows((prev) => [...prev, trustPayoutRowDraft(null, ledgerName, '')])}
        >
          <Plus className="size-4" />
          {COPY.addMethod}
        </Button>

        {isOwner ? (
          <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payout-frequency">{COPY.frequency}</Label>
              <select
                id="payout-frequency"
                className={SELECT_CLASS}
                value={frequency}
                disabled={pending}
                onChange={(e) => setFrequency(e.target.value as TrustPayoutFrequency)}
              >
                {TRUST_PAYOUT_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {TRUST_PAYOUT_FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </select>
            </div>
            {frequency !== TRUST_PAYOUT_FREQUENCY.ON_DEMAND ? (
              <div className="space-y-1.5">
                <Label htmlFor="payout-next-due">{COPY.nextPayoutDue}</Label>
                <Input
                  id="payout-next-due"
                  type="date"
                  value={nextDue}
                  disabled={pending}
                  onChange={(e) => setNextDue(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
          {COPY.cancel}
        </Button>
        <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {COPY.submit}
        </Button>
      </DialogFooter>
    </>
  );
}
