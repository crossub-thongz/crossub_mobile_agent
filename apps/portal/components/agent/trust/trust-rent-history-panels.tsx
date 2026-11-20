'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { TrustCorrectionLegs } from '@/components/agent/trust/trust-correction-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustConfirmDialog,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
  TrustPill,
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
  TRUST_CORRECTION_ALLOCATION_OPTIONS,
  TRUST_CORRECTION_BLOCK_LABEL,
  TRUST_CORRECTION_COPY as CORRECTION_COPY,
  TRUST_CORRECTION_KIND_LABEL,
  TRUST_CORRECTION_LIMITS,
  TRUST_MOVE_OUT_COPY as MOVE_OUT_COPY,
  TRUST_RENT_PERIOD_WORD,
  TRUST_RENT_RATES_COPY as RATES_COPY,
} from '@/constants/trust-corrections';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustLedgerCorrections,
  previewTrustMoveOut,
  removeTrustRentRate,
  setTrustMoveOut,
  setTrustRentRate,
  type TrustLedger,
  type TrustMoveOutPreview,
  type TrustRentRate,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, newTrustIdempotencyKey, parseDollarsToCents } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn } from '@/lib/utils';

type RentProfile = NonNullable<TrustLedger['rentProfile']>;

const allocationLabel = (kind: string) =>
  TRUST_CORRECTION_ALLOCATION_OPTIONS.find((option) => option.id === kind)?.label ?? kind;

// --------------------------------------------------------------------------- Rent rates (D153)

/** The tenancy's dated rent rates, with add and remove. */
export function TrustRentRatesPanel({
  agencyId,
  ledger,
  profile,
  onChanged,
}: {
  agencyId: string;
  ledger: TrustLedger;
  profile: RentProfile;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<TrustRentRate | null>(null);
  const rates = [...(profile.rates ?? [])].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  async function remove(rate: TrustRentRate) {
    setRemovingId(rate.id);
    try {
      await removeTrustRentRate(agencyId, ledger.id, rate.id);
      toast.success(RATES_COPY.removed);
      onChanged();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <TrustPanel
      title={RATES_COPY.title}
      actions={
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAdding(true)}>
          {RATES_COPY.add}
        </Button>
      }
    >
      <p className="text-muted-foreground mb-2 text-xs">{RATES_COPY.description}</p>
      {rates.length === 0 ? (
        <p className="text-muted-foreground text-sm">{RATES_COPY.empty}</p>
      ) : (
        <ul className="divide-y text-sm">
          {rates.map((rate) => (
            <li key={rate.id} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-muted-foreground">{`${RATES_COPY.from} ${formatTrustDate(rate.effectiveFrom)}`}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{formatCents(rate.amountCents)}</span>
                {rates.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={RATES_COPY.remove}
                    disabled={removingId === rate.id}
                    onClick={() => setConfirming(rate)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {confirming ? (
        <TrustConfirmDialog
          title={RATES_COPY.remove}
          description={RATES_COPY.removeConfirm(formatTrustDate(confirming.effectiveFrom))}
          submitLabel={RATES_COPY.remove}
          cancelLabel={RATES_COPY.cancel}
          destructive
          onConfirm={() => remove(confirming)}
          onClose={() => setConfirming(null)}
        />
      ) : null}
      {adding ? (
        <RateDialog agencyId={agencyId} ledger={ledger} profile={profile} onClose={() => setAdding(false)} onSaved={onChanged} />
      ) : null}
    </TrustPanel>
  );
}

function RateDialog({
  agencyId,
  ledger,
  profile,
  onClose,
  onSaved,
}: {
  agencyId: string;
  ledger: TrustLedger;
  profile: RentProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [from, setFrom] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!from) {
      toast.error(RATES_COPY.dateRequired);
      return;
    }
    const amountCents = parseDollarsToCents(amount);
    if (amountCents == null || amountCents <= 0) {
      toast.error(RATES_COPY.amountInvalid);
      return;
    }
    setPending(true);
    try {
      await setTrustRentRate(agencyId, ledger.id, { effectiveFrom: from, amountCents, note: note.trim() || undefined });
      toast.success(RATES_COPY.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <SimpleDialog
      title={RATES_COPY.dialogTitle}
      description={RATES_COPY.dialogDescription}
      pending={pending}
      submitLabel={RATES_COPY.submit}
      cancelLabel={RATES_COPY.cancel}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trust-rate-from">{RATES_COPY.effectiveFrom}</Label>
          <Input id="trust-rate-from" type="date" value={from} disabled={pending} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trust-rate-amount">{RATES_COPY.amountLabel(TRUST_RENT_PERIOD_WORD[profile.rentPeriod])}</Label>
          <Input id="trust-rate-amount" inputMode="decimal" value={amount} disabled={pending} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trust-rate-note">{RATES_COPY.note}</Label>
        <Input
          id="trust-rate-note"
          value={note}
          maxLength={TRUST_CORRECTION_LIMITS.rentNoteMax}
          disabled={pending}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </SimpleDialog>
  );
}

// --------------------------------------------------------------------------- Move-out (D155)

/** The tenancy's move-out: rent is owed up to it; rent paid past it goes back to the deposit. */
export function TrustMoveOutPanel({
  agencyId,
  ledger,
  profile,
  onChanged,
}: {
  agencyId: string;
  ledger: TrustLedger;
  profile: RentProfile;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const moveOut = profile.moveOutDate ?? null;
  return (
    <TrustPanel
      title={MOVE_OUT_COPY.title}
      actions={
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setOpen(true)}>
          {moveOut ? MOVE_OUT_COPY.change : MOVE_OUT_COPY.set}
        </Button>
      }
    >
      {moveOut ? (
        <div className="space-y-1 text-sm">
          <p>{MOVE_OUT_COPY.current(formatTrustDate(moveOut))}</p>
          {profile.finalLiabilityRemainingCents != null ? (
            <p className="text-muted-foreground text-xs">
              {MOVE_OUT_COPY.remaining(formatCents(profile.finalLiabilityRemainingCents))}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{MOVE_OUT_COPY.none}</p>
      )}
      {open ? (
        <MoveOutDialog agencyId={agencyId} ledger={ledger} current={moveOut} onClose={() => setOpen(false)} onSaved={onChanged} />
      ) : null}
    </TrustPanel>
  );
}

function MoveOutDialog({
  agencyId,
  ledger,
  current,
  onClose,
  onSaved,
}: {
  agencyId: string;
  ledger: TrustLedger;
  current: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(current ?? '');
  const [preview, setPreview] = useState<TrustMoveOutPreview | null>(null);
  const [previewFor, setPreviewFor] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [idempotencyKey] = useState(newTrustIdempotencyKey);
  const previewed = preview && previewFor === date ? preview : null;

  async function runPreview(moveOutDate: string | null) {
    setPending(true);
    try {
      setPreview(await previewTrustMoveOut(agencyId, ledger.id, { moveOutDate }));
      setPreviewFor(moveOutDate ?? '');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function confirm(moveOutDate: string | null) {
    setPending(true);
    try {
      const excess = previewed?.excessCents ?? 0;
      await setTrustMoveOut(agencyId, ledger.id, { moveOutDate, idempotencyKey: excess > 0 ? idempotencyKey : undefined });
      toast.success(moveOutDate ? MOVE_OUT_COPY.saved : MOVE_OUT_COPY.cleared);
      onSaved();
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
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{MOVE_OUT_COPY.dialogTitle}</DialogTitle>
          <DialogDescription>{MOVE_OUT_COPY.dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="trust-move-out-date">{MOVE_OUT_COPY.date}</Label>
              <Input id="trust-move-out-date" type="date" value={date} disabled={pending} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !date}
              onClick={() => (date ? void runPreview(date) : toast.error(MOVE_OUT_COPY.dateRequired))}
            >
              {MOVE_OUT_COPY.preview}
            </Button>
          </div>
          {previewed ? (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p>{MOVE_OUT_COPY.paidTo(formatTrustDate(previewed.paidToBefore), formatTrustDate(previewed.paidToAfter))}</p>
              <p className={cn(previewed.excessCents > 0 ? 'font-medium' : 'text-muted-foreground')}>
                {previewed.excessCents > 0 ? MOVE_OUT_COPY.excess(formatCents(previewed.excessCents)) : MOVE_OUT_COPY.noExcess}
              </p>
              {previewed.legs.length > 0 ? <TrustCorrectionLegs legs={previewed.legs} /> : null}
              {previewed.blockedReason ? (
                <p className="text-destructive text-xs">{TRUST_CORRECTION_BLOCK_LABEL[previewed.blockedReason]}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          {current ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => void confirm(null)}>
              {MOVE_OUT_COPY.clearSubmit}
            </Button>
          ) : null}
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {MOVE_OUT_COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || !previewed?.canConfirm} onClick={() => void confirm(date)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {MOVE_OUT_COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------------- Corrections list (D156)

/** Allocation and move-out corrections touching this tenant folio. */
export function TrustLedgerCorrectionsPanel({ agencyId, ledgerId }: { agencyId: string; ledgerId: string }) {
  const corrections = useTrustResource(`${agencyId}:${ledgerId}:corrections`, () =>
    fetchTrustLedgerCorrections(agencyId, ledgerId),
  );
  const items = corrections.data?.items ?? [];
  return (
    <TrustPanel title={CORRECTION_COPY.listTitle}>
      {corrections.error ? <TrustLoadError error={corrections.error} onRetry={corrections.reload} /> : null}
      {corrections.loading && !corrections.data ? <TrustLoading /> : null}
      {corrections.data && items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{CORRECTION_COPY.listEmpty}</p>
      ) : null}
      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className={TRUST_TABLE_HEAD_CLASS}>Date</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>Correction</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className={TRUST_TABLE_CELL_CLASS}>{formatTrustDate(row.createdAt.slice(0, 10))}</td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TrustPill className="bg-secondary text-secondary-foreground">
                        {TRUST_CORRECTION_KIND_LABEL[row.kind]}
                      </TrustPill>
                      {row.originalAuditNumber != null ? <span className="text-xs">#{row.originalAuditNumber}</span> : null}
                    </div>
                    <p className="text-xs">
                      {CORRECTION_COPY.movedBetween(
                        `${allocationLabel(row.fromKind)} (${row.fromLedgerName})`,
                        `${allocationLabel(row.toKind)} (${row.toLedgerName})`,
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">{row.reason}</p>
                    {row.journalAuditNumbers.length > 0 ? (
                      <p className="text-muted-foreground text-xs">
                        {CORRECTION_COPY.journals(row.journalAuditNumbers.map((n) => `#${n}`).join(', '))}
                      </p>
                    ) : null}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>{formatCents(row.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </TrustPanel>
  );
}

// --------------------------------------------------------------------------- Shared

function SimpleDialog({
  title,
  description,
  pending,
  submitLabel,
  cancelLabel,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  description: string;
  pending: boolean;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" disabled={pending} onClick={onSubmit}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
