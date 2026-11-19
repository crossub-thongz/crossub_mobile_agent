'use client';

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import {
  TRUST_OWNER_BILL_LIST,
  TRUST_OWNER_BILL_SOURCE,
  TRUST_OWNER_BILL_SOURCE_LABEL,
  TRUST_OWNER_BILLS_COPY as COPY,
  TRUST_PAGE_SIZE_MAX,
  type TrustOwnerBillList,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustOwnerBills,
  payTrustOwnerBills,
  type TrustOwnerBillItem,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, newTrustIdempotencyKey } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  collectShortfallFromError,
  selectedTotalCents,
  selectionBody,
} from '@/lib/utils/trust-owner-bills';

/**
 * An owner's supplier bills and agency fees in one place (Accounting PRD Step 3, D147): Pending
 * bills to tick and pay, Paid bills as the record. Paying is full only and all together: if the
 * owner's Available (balance less withheld) does not cover the whole selection, nothing is paid.
 */
export function TrustOwnerBillsPanel({
  agencyId,
  ledgerId,
  reloadKey,
  onChanged,
}: {
  agencyId: string;
  ledgerId: string;
  reloadKey: string;
  onChanged: () => void;
}) {
  const [list, setList] = useState<TrustOwnerBillList>(TRUST_OWNER_BILL_LIST.PENDING);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const { data, error, loading, reload } = useTrustResource(`${agencyId}:${ledgerId}:${list}:${reloadKey}`, () =>
    fetchTrustOwnerBills(agencyId, ledgerId, { list, pageSize: TRUST_PAGE_SIZE_MAX }),
  );
  const isPending = list === TRUST_OWNER_BILL_LIST.PENDING;
  const items = useMemo(() => data?.items ?? [], [data]);
  const totalCents = selectedTotalCents(items, selected);
  const overAvailable = data ? totalCents > data.availableCents : false;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function switchList(next: TrustOwnerBillList) {
    setList(next);
    setSelected(new Set());
  }

  return (
    <TrustPanel
      title={COPY.title}
      actions={
        <div className="flex gap-1">
          {[TRUST_OWNER_BILL_LIST.PENDING, TRUST_OWNER_BILL_LIST.PAID].map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={list === value ? 'secondary' : 'ghost'}
              className="h-7 text-xs"
              onClick={() => switchList(value)}
            >
              {COPY.tabs[value]}
              {value === TRUST_OWNER_BILL_LIST.PENDING && data && data.pendingCount > 0 ? ` (${data.pendingCount})` : ''}
            </Button>
          ))}
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
        <div className="space-y-3">
          {isPending ? (
            <p className="text-muted-foreground text-xs">{COPY.available(formatCents(data.availableCents))}</p>
          ) : null}
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{isPending ? COPY.emptyPending : COPY.emptyPaid}</p>
          ) : (
            <ul className="-mx-4 divide-y border-y">
              {items.map((item) => (
                <OwnerBillRow
                  key={item.id}
                  item={item}
                  selectable={isPending}
                  checked={selected.has(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </ul>
          )}
          {isPending && selected.size > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={cn('text-xs', overAvailable ? 'text-destructive' : 'text-muted-foreground')}>
                {overAvailable
                  ? COPY.overAvailable
                  : COPY.selected(formatCents(totalCents), formatCents(data.availableCents))}
              </p>
              <Button type="button" size="sm" className="h-8" disabled={overAvailable} onClick={() => setConfirming(true)}>
                {COPY.paySelected(selected.size)}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {confirming && data ? (
        <PayDialog
          agencyId={agencyId}
          ledgerId={ledgerId}
          items={items}
          selected={selected}
          totalCents={totalCents}
          availableCents={data.availableCents}
          onClose={() => setConfirming(false)}
          onPaid={() => {
            setSelected(new Set());
            reload();
            onChanged();
          }}
        />
      ) : null}
    </TrustPanel>
  );
}

function OwnerBillRow({
  item,
  selectable,
  checked,
  onToggle,
}: {
  item: TrustOwnerBillItem;
  selectable: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const isBill = item.source === TRUST_OWNER_BILL_SOURCE.SUPPLIER_BILL;
  const dateLine = item.paidAt
    ? COPY.paidOn(formatTrustDate(item.paidAt.slice(0, 10)), item.auditNumber ?? null)
    : item.date
      ? isBill
        ? COPY.due(formatTrustDate(item.date))
        : COPY.charged(formatTrustDate(item.date))
      : null;
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {item.payeeName ? `${item.payeeName} · ` : ''}
          {item.description}
        </p>
        <p className="text-muted-foreground text-xs">
          {[
            TRUST_OWNER_BILL_SOURCE_LABEL[item.source],
            item.number ? `#${item.number}` : null,
            item.invoiceReference,
            dateLine,
            item.pendingReason,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium tabular-nums">{formatCents(item.amountCents)}</p>
        {item.shortfallCents ? (
          <TrustPill className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            {COPY.shortBy(formatCents(item.shortfallCents))}
          </TrustPill>
        ) : null}
      </div>
    </>
  );
  return (
    <li>
      {selectable ? (
        <label className="hover:bg-muted/40 flex cursor-pointer items-start gap-3 px-4 py-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="border-border mt-1 rounded"
            aria-label={item.description}
          />
          {content}
        </label>
      ) : (
        <div className="flex items-start gap-3 px-4 py-2.5">{content}</div>
      )}
    </li>
  );
}

function PayDialog({
  agencyId,
  ledgerId,
  items,
  selected,
  totalCents,
  availableCents,
  onClose,
  onPaid,
}: {
  agencyId: string;
  ledgerId: string;
  items: readonly TrustOwnerBillItem[];
  selected: ReadonlySet<string>;
  totalCents: number;
  availableCents: number;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [idempotencyKey] = useState(newTrustIdempotencyKey);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      const result = await payTrustOwnerBills(agencyId, ledgerId, {
        idempotencyKey,
        ...selectionBody(items, selected, TRUST_OWNER_BILL_SOURCE.SUPPLIER_BILL),
      });
      toast.success(COPY.done(result.billIds.length + result.feeChargeIds.length, formatCents(result.totalCents)));
      onPaid();
      onClose();
    } catch (err) {
      const shortfall = collectShortfallFromError(err);
      toast.error(shortfall ? COPY.notEnough(formatCents(shortfall)) : apiErrorMessage(err));
      onClose();
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{COPY.confirmTitle}</DialogTitle>
          <DialogDescription>{COPY.confirmDescription}</DialogDescription>
        </DialogHeader>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{COPY.confirmTotal}</dt>
            <dd className="font-semibold tabular-nums">{formatCents(totalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{COPY.confirmAvailable}</dt>
            <dd className="tabular-nums">{formatCents(availableCents)}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
