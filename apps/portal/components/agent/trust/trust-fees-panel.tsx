'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_FEE_CHARGE_STATUS,
  TRUST_FEE_CHARGE_STATUS_LABEL,
  TRUST_FEE_CHARGE_STATUS_TONE,
  TRUST_FEES_COPY as COPY,
  TRUST_NEW_FEE_COPY as NEW_COPY,
  TRUST_PAGE_SIZE_MAX,
  TRUST_WAIVE_FEE_COPY,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  createTrustFeeCharge,
  fetchTrustFeeCharges,
  postPendingTrustFees,
  waiveTrustFeeCharge,
  type TrustAccountCode,
  type TrustFeeCharge,
} from '@/lib/crossub-api/agent-trust-client';
import {
  feeCategoryCodes,
  formatCents,
  formatTrustDate,
  newTrustIdempotencyKey,
  parseDollarsToCents,
  trustTodayKey,
} from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function NewFeeDialog({
  agencyId,
  ledgerId,
  accountCodes,
  onClose,
  onCreated,
}: {
  agencyId: string;
  ledgerId: string;
  accountCodes: readonly TrustAccountCode[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const categories = feeCategoryCodes(accountCodes);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [gstInclusive, setGstInclusive] = useState(true);
  const [accountCodeId, setAccountCodeId] = useState('');
  const [chargeDate, setChargeDate] = useState(trustTodayKey);
  const [idempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);

  async function submit() {
    const amountCents = parseDollarsToCents(amount);
    if (!name.trim() || !amountCents || !accountCodeId || !chargeDate) {
      toast.error(NEW_COPY.incomplete);
      return;
    }
    setPending(true);
    try {
      await createTrustFeeCharge(agencyId, ledgerId, {
        idempotencyKey,
        name: name.trim(),
        amountCents,
        gstInclusive,
        accountCodeId,
        chargeDate,
      });
      toast.success(NEW_COPY.done);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{NEW_COPY.title}</DialogTitle>
          <DialogDescription>{NEW_COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-fee-name">{NEW_COPY.name}</Label>
            <Input
              id="trust-fee-name"
              value={name}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-fee-amount">{NEW_COPY.amount}</Label>
              <Input
                id="trust-fee-amount"
                inputMode="decimal"
                value={amount}
                disabled={pending}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-fee-date">{NEW_COPY.date}</Label>
              <Input
                id="trust-fee-date"
                type="date"
                value={chargeDate}
                max={trustTodayKey()}
                disabled={pending}
                onChange={(e) => setChargeDate(e.target.value)}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={gstInclusive}
              disabled={pending}
              onChange={(e) => setGstInclusive(e.target.checked)}
              className="rounded border-border"
            />
            {NEW_COPY.gstInclusive}
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="trust-fee-category">{NEW_COPY.category}</Label>
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">{NEW_COPY.noCategories}</p>
            ) : (
              <select
                id="trust-fee-category"
                className={SELECT_CLASS}
                value={accountCodeId}
                disabled={pending}
                onChange={(e) => setAccountCodeId(e.target.value)}
              >
                <option value="">{NEW_COPY.chooseCategory}</option>
                {categories.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.code} {code.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {NEW_COPY.cancel}
          </Button>
          <Button
            type="button"
            disabled={pending || categories.length === 0}
            onClick={() => void submit()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {NEW_COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** An owner ledger's fee charges: charge a one-off fee, post what is pending, or waive one. */
export function TrustFeesPanel({
  agencyId,
  ledgerId,
  accountCodes,
  onChanged,
}: {
  agencyId: string;
  ledgerId: string;
  accountCodes: readonly TrustAccountCode[];
  onChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [waiving, setWaiving] = useState<TrustFeeCharge | null>(null);
  const [posting, setPosting] = useState(false);
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${ledgerId}:fees`, () =>
    fetchTrustFeeCharges(agencyId, ledgerId, { pageSize: TRUST_PAGE_SIZE_MAX }),
  );

  function changed() {
    reload();
    onChanged();
  }

  async function postPending() {
    setPosting(true);
    try {
      const result = await postPendingTrustFees(agencyId, ledgerId);
      toast.success(COPY.postedResult(result.posted, result.stillPending));
      changed();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPosting(false);
    }
  }

  return (
    <TrustPanel
      title={COPY.title}
      actions={
        <div className="flex gap-2">
          {data && data.totals.pendingCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={posting}
              onClick={() => void postPending()}
            >
              {posting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {COPY.postPending}
            </Button>
          ) : null}
          <Button type="button" size="sm" className="h-7 text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            {COPY.charge}
          </Button>
        </div>
      }
    >
      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            {COPY.pending(formatCents(data.totals.pendingCents), data.totals.pendingCount)} ·{' '}
            {COPY.postedThisMonth(formatCents(data.totals.postedThisMonthCents))}
          </p>
          {data.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{COPY.empty}</p>
          ) : (
            <div className="-mx-4 -mb-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b">
                  <tr>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.date}</th>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.fee}</th>
                    <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                    <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.status}</th>
                    <th className={TRUST_TABLE_HEAD_CLASS} />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((charge) => (
                    <tr key={charge.id} className="border-b last:border-b-0">
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                        {formatTrustDate(charge.chargeDate)}
                      </td>
                      <td className={TRUST_TABLE_CELL_CLASS}>
                        <p>{charge.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {charge.pendingReason ?? charge.waivedReason ?? charge.accountCode.name}
                        </p>
                      </td>
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                        {formatCents(charge.amountCents)}
                      </td>
                      <td className={TRUST_TABLE_CELL_CLASS}>
                        <TrustPill className={TRUST_FEE_CHARGE_STATUS_TONE[charge.status]}>
                          {TRUST_FEE_CHARGE_STATUS_LABEL[charge.status]}
                        </TrustPill>
                      </td>
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                        {charge.status === TRUST_FEE_CHARGE_STATUS.PENDING ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setWaiving(charge)}
                          >
                            {COPY.waive}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {creating ? (
        <NewFeeDialog
          agencyId={agencyId}
          ledgerId={ledgerId}
          accountCodes={accountCodes}
          onClose={() => setCreating(false)}
          onCreated={changed}
        />
      ) : null}
      {waiving ? (
        <TrustReasonDialog
          title={TRUST_WAIVE_FEE_COPY.title(waiving.name)}
          description={TRUST_WAIVE_FEE_COPY.description}
          reasonLabel={TRUST_WAIVE_FEE_COPY.reason}
          reasonRequired={TRUST_WAIVE_FEE_COPY.reasonRequired}
          submitLabel={TRUST_WAIVE_FEE_COPY.submit}
          cancelLabel={TRUST_WAIVE_FEE_COPY.cancel}
          onSubmit={async (reason) => {
            await waiveTrustFeeCharge(agencyId, waiving.id, { reason });
            toast.success(TRUST_WAIVE_FEE_COPY.done);
            changed();
          }}
          onClose={() => setWaiving(null)}
        />
      ) : null}
    </TrustPanel>
  );
}
