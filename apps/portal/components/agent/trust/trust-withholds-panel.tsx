'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { TrustLoadError, TrustLoading, TrustPanel } from '@/components/agent/trust/trust-ui';
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
import { Textarea } from '@/components/ui/textarea';
import { TRUST_INPUT_LIMITS, TRUST_WITHHOLDS_COPY as COPY } from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  createTrustWithhold,
  fetchTrustWithholds,
  releaseTrustWithhold,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, parseDollarsToCents } from '@/lib/trust-accounting';
import { formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Amounts held back on an owner ledger from its payouts, with hold and release. */
export function TrustWithholdsPanel({
  agencyId,
  ledgerId,
  onChanged,
}: {
  agencyId: string;
  ledgerId: string;
  onChanged: () => void;
}) {
  const withholds = useTrustResource(`${agencyId}:${ledgerId}:withholds`, () =>
    fetchTrustWithholds(agencyId, ledgerId),
  );
  const [holding, setHolding] = useState(false);
  const [releasing, setReleasing] = useState<string | null>(null);

  async function onRelease(withholdId: string) {
    setReleasing(withholdId);
    try {
      await releaseTrustWithhold(agencyId, withholdId, {});
      toast.success(COPY.releasedToast);
      withholds.reload();
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setReleasing(null);
    }
  }

  const data = withholds.data;

  return (
    <TrustPanel
      title={COPY.title}
      actions={
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setHolding(true)}>
          <Plus className="size-3.5" />
          {COPY.hold}
        </Button>
      }
    >
      {!data ? (
        withholds.error ? (
          <TrustLoadError error={withholds.error} onRetry={withholds.reload} />
        ) : (
          <TrustLoading />
        )
      ) : data.active.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.empty}</p>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground text-xs">{COPY.activeTotal(formatCents(data.activeTotalCents))}</p>
          <ul className="divide-y">
            {data.active.map((withhold) => (
              <li key={withhold.id} className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium tabular-nums">{formatCents(withhold.amountCents)}</p>
                  <p className="text-muted-foreground text-xs">
                    {withhold.reason} · {formatDate(withhold.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={releasing !== null}
                  onClick={() => void onRelease(withhold.id)}
                >
                  {releasing === withhold.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {COPY.release}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {holding ? (
        <HoldDialog
          agencyId={agencyId}
          ledgerId={ledgerId}
          onClose={() => setHolding(false)}
          onHeld={() => {
            withholds.reload();
            onChanged();
          }}
        />
      ) : null}
    </TrustPanel>
  );
}

function HoldDialog({
  agencyId,
  ledgerId,
  onClose,
  onHeld,
}: {
  agencyId: string;
  ledgerId: string;
  onClose: () => void;
  onHeld: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const amountCents = parseDollarsToCents(amount);
    if (amountCents == null || amountCents <= 0) {
      toast.error(COPY.amountInvalid);
      return;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error(COPY.reasonRequired);
      return;
    }
    setPending(true);
    try {
      await createTrustWithhold(agencyId, ledgerId, { amountCents, reason: trimmed });
      toast.success(COPY.held);
      onHeld();
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
          <DialogTitle>{COPY.holdTitle}</DialogTitle>
          <DialogDescription>{COPY.holdDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-withhold-amount">{COPY.amount}</Label>
            <Input
              id="trust-withhold-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              disabled={pending}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-withhold-reason">{COPY.reason}</Label>
            <Textarea
              id="trust-withhold-reason"
              inputKind="message"
              className="min-h-16"
              value={reason}
              maxLength={TRUST_INPUT_LIMITS.withholdReasonMax}
              disabled={pending}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
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
      </DialogContent>
    </Dialog>
  );
}
