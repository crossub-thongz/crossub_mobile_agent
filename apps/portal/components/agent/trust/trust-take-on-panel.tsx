'use client';

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
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
  TRUST_INPUT_LIMITS,
  TRUST_LEDGER_KIND,
  TRUST_LEDGER_KIND_LABEL,
  TRUST_TAKE_ON_COPY as COPY,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustTakeOn,
  postTrustTakeOn,
  type TrustTakeOnLedgerRow,
  type TrustTakeOnStatus,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, parseDollarsToCents } from '@/lib/trust-accounting';
import { cn, formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** A tenant row takes money only once its rent is set (D82). */
function rowLocked(row: TrustTakeOnLedgerRow): boolean {
  return row.kind === TRUST_LEDGER_KIND.TENANT && !row.hasRentProfile;
}

/**
 * Opening balances (take-on, D85): one amount per open ledger, adding up to the bank opening
 * balance, posted once as an OPENING transaction. The API checks the total and every row again.
 */
export function TrustTakeOnPanel({ agencyId, bankAccountId }: { agencyId: string; bankAccountId: string }) {
  const status = useTrustResource(`${agencyId}:${bankAccountId}:take-on`, () =>
    fetchTrustTakeOn(agencyId, bankAccountId),
  );

  return (
    <TrustPanel title={COPY.title}>
      {status.data ? (
        <TakeOnBody agencyId={agencyId} bankAccountId={bankAccountId} status={status.data} onPosted={status.reload} />
      ) : status.error ? (
        <TrustLoadError error={status.error} onRetry={status.reload} />
      ) : (
        <TrustLoading />
      )}
    </TrustPanel>
  );
}

function TakeOnBody({
  agencyId,
  bankAccountId,
  status,
  onPosted,
}: {
  agencyId: string;
  bankAccountId: string;
  status: TrustTakeOnStatus;
  onPosted: () => void;
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const parsed = useMemo(() => {
    let total = 0;
    let invalid = false;
    for (const row of status.ledgers) {
      const typed = (amounts[row.ledgerId] ?? '').trim();
      if (!typed) continue;
      const cents = parseDollarsToCents(typed);
      if (cents == null) invalid = true;
      else total += cents;
    }
    return { total, invalid };
  }, [amounts, status.ledgers]);

  const header = (
    <p className="text-muted-foreground text-sm">
      {status.openingDate
        ? COPY.bankOpening(formatCents(status.openingBalanceCents), formatTrustDate(status.openingDate))
        : COPY.noOpeningDate}
    </p>
  );

  if (status.posted) {
    return (
      <div className="space-y-1">
        {header}
        <p className="text-sm">
          {COPY.postedSummary(
            status.openingAuditNumber,
            status.postedAt ? formatDate(status.postedAt) : '—',
            status.postedByName,
          )}
        </p>
      </div>
    );
  }

  const difference = status.openingBalanceCents - parsed.total;

  async function onPost() {
    const rows = status.ledgers
      .map((row) => ({ ledgerId: row.ledgerId, amountCents: parseDollarsToCents((amounts[row.ledgerId] ?? '').trim()) }))
      .filter((row): row is { ledgerId: string; amountCents: number } => row.amountCents != null && row.amountCents > 0);
    setPending(true);
    try {
      await postTrustTakeOn(agencyId, bankAccountId, { rows, note: note.trim() || undefined });
      toast.success(COPY.posted);
      setConfirming(false);
      onPosted();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  function openConfirm() {
    if (parsed.invalid) {
      toast.error(COPY.amountInvalid);
      return;
    }
    if (difference !== 0) {
      toast.error(COPY.notBalanced);
      return;
    }
    setConfirming(true);
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{COPY.description}</p>
      {header}
      {status.blockerLabel ? <p className="text-sm text-amber-600">{status.blockerLabel}</p> : null}
      {status.tenantsWithoutRent.length > 0 ? (
        <p className="text-sm text-amber-600">{COPY.tenantsWithoutRent(status.tenantsWithoutRent.length)}</p>
      ) : null}
      {status.ledgers.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.noLedgers}</p>
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-card sticky top-0 border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.ledger}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.kind}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'w-40 text-right')}>{COPY.amount}</th>
              </tr>
            </thead>
            <tbody>
              {status.ledgers.map((row) => (
                <tr key={row.ledgerId} className="border-b last:border-b-0">
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground text-xs">
                      <span className="font-mono">{row.code}</span>
                      {row.propertyReferenceAddress ? ` · ${row.propertyReferenceAddress}` : ''}
                    </p>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden md:table-cell')}>
                    {TRUST_LEDGER_KIND_LABEL[row.kind]}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                    {rowLocked(row) ? (
                      <span className="text-xs text-amber-600">{COPY.tenantNoRent}</span>
                    ) : (
                      <Input
                        aria-label={`${COPY.amount} ${row.name}`}
                        inputMode="decimal"
                        className="h-8 text-right"
                        placeholder="0.00"
                        value={amounts[row.ledgerId] ?? ''}
                        disabled={pending || !status.canPost}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [row.ledgerId]: e.target.value }))}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="text-sm">
          <p>
            {COPY.total}: <span className="font-semibold tabular-nums">{formatCents(parsed.total)}</span>
          </p>
          <p className={cn('text-xs', difference === 0 ? 'text-emerald-600' : 'text-amber-600')}>
            {difference === 0
              ? COPY.balanced
              : difference > 0
                ? COPY.remaining(formatCents(difference))
                : COPY.over(formatCents(-difference))}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="trust-take-on-note">{COPY.note}</Label>
            <Input
              id="trust-take-on-note"
              className="h-9 w-56"
              value={note}
              maxLength={TRUST_INPUT_LIMITS.takeOnNoteMax}
              disabled={pending || !status.canPost}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button type="button" disabled={pending || !status.canPost} onClick={openConfirm}>
            {COPY.submit}
          </Button>
        </div>
      </div>

      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirming(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{COPY.confirmTitle}</DialogTitle>
            <DialogDescription>{COPY.confirmBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
              {COPY.cancel}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void onPost()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {COPY.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
