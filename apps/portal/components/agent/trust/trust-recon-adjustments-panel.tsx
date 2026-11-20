'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { TrustLoadError, TrustLoading, TrustPanel, TrustPill } from '@/components/agent/trust/trust-ui';
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
import { TRUST_RECON_ADJUSTMENT_COPY as COPY } from '@/constants/trust-bank-workspace';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  addTrustReconAdjustment,
  fetchTrustReconAdjustments,
  removeTrustReconAdjustment,
  type TrustReconAdjustment,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, trustTodayKey } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { parseSignedNonZeroCents } from '@/utils/trust-bank-workspace';

/**
 * PRD phase 5 (D163): signed bank-side reconciliation adjustments, added and removed by hand. One
 * counts from its date until removed; earlier cutoffs and locked months keep it. Never a cash book
 * entry.
 */
export function TrustReconAdjustmentsPanel({
  agencyId,
  bankAccountId,
  refreshKey,
  onChanged,
}: {
  agencyId: string;
  bankAccountId: string;
  refreshKey: number;
  onChanged: () => void;
}) {
  const list = useTrustResource(`${agencyId}:${bankAccountId}:recon-adjustments:${refreshKey}`, () =>
    fetchTrustReconAdjustments(agencyId, bankAccountId),
  );
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<TrustReconAdjustment | null>(null);

  function changed() {
    list.reload();
    onChanged();
  }

  return (
    <TrustPanel
      title={COPY.title}
      actions={
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAdding(true)}>
          {COPY.add}
        </Button>
      }
    >
      <p className="text-muted-foreground mb-2 text-xs">{COPY.intro}</p>
      {!list.data ? (
        list.error ? (
          <TrustLoadError error={list.error} onRetry={list.reload} />
        ) : (
          <TrustLoading />
        )
      ) : list.data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.empty}</p>
      ) : (
        <ul className="divide-y text-sm">
          {list.data.items.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">{row.reason}</p>
                <p className="text-muted-foreground text-xs">
                  {COPY.from(formatTrustDate(row.effectiveDate))}
                  {row.removedOn ? ` · ${COPY.removedOn(formatTrustDate(row.removedOn))}` : ''}
                  {row.removedReason ? ` · ${row.removedReason}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums">{formatCents(row.amountCents)}</span>
                {row.removedOn ? null : (
                  <>
                    <TrustPill className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{COPY.active}</TrustPill>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRemoving(row)}>
                      {COPY.remove}
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <AddDialog
          onClose={() => setAdding(false)}
          onSubmit={async (body) => {
            await addTrustReconAdjustment(agencyId, bankAccountId, body);
            toast.success(COPY.added);
            changed();
          }}
        />
      ) : null}
      {removing ? (
        <RemoveDialog
          adjustment={removing}
          onClose={() => setRemoving(null)}
          onSubmit={async (body) => {
            await removeTrustReconAdjustment(agencyId, bankAccountId, removing.id, body);
            toast.success(COPY.removed);
            changed();
          }}
        />
      ) : null}
    </TrustPanel>
  );
}

function AddDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (body: { effectiveDate: string; amountCents: number; reason: string }) => Promise<void>;
}) {
  const [date, setDate] = useState(trustTodayKey());
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);

  async function submit() {
    const cents = parseSignedNonZeroCents(amount);
    if (cents === null) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if (!reason.trim()) {
      toast.error(COPY.reasonRequired);
      return;
    }
    setPending(true);
    try {
      await onSubmit({ effectiveDate: date, amountCents: cents, reason: reason.trim() });
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.addTitle}</DialogTitle>
          <DialogDescription>{COPY.intro}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="recon-adj-date">{COPY.date}</Label>
            <Input id="recon-adj-date" type="date" value={date} max={trustTodayKey()} disabled={pending} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recon-adj-amount">{COPY.amount}</Label>
            <Input id="recon-adj-amount" inputMode="decimal" value={amount} disabled={pending} placeholder="-212.93" onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recon-adj-reason">{COPY.reason}</Label>
            <Input id="recon-adj-reason" value={reason} disabled={pending} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({
  adjustment,
  onClose,
  onSubmit,
}: {
  adjustment: TrustReconAdjustment;
  onClose: () => void;
  onSubmit: (body: { removedOn: string; reason: string }) => Promise<void>;
}) {
  const [date, setDate] = useState(trustTodayKey());
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!reason.trim()) {
      toast.error(COPY.reasonRequired);
      return;
    }
    setPending(true);
    try {
      await onSubmit({ removedOn: date, reason: reason.trim() });
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.removeTitle}</DialogTitle>
          <DialogDescription>
            {adjustment.reason} · {formatCents(adjustment.amountCents)}. {COPY.removeDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="recon-adj-remove-date">{COPY.removeOn}</Label>
            <Input
              id="recon-adj-remove-date"
              type="date"
              value={date}
              min={adjustment.effectiveDate}
              max={trustTodayKey()}
              disabled={pending}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recon-adj-remove-reason">{COPY.removeReason}</Label>
            <Input id="recon-adj-remove-reason" value={reason} disabled={pending} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.removeSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
