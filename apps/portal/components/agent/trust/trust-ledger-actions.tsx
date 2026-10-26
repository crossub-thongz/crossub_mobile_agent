'use client';

import { Landmark, Loader2, Pencil, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { TrustPayoutDialog } from '@/components/agent/trust/trust-payout-dialog';
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
  TRUST_LEDGER_ACTIONS_COPY as COPY,
  TRUST_LEDGER_KIND,
  TRUST_LEDGER_STATUS,
  TRUST_PAYOUT_COPY,
} from '@/constants/trust';
import { closeTrustLedger, updateTrustLedger, type TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Which ledger dialog is showing. */
const LEDGER_ACTION = {
  RENAME: 'rename',
  CLOSE: 'close',
  PAYOUT: 'payout',
} as const;
type LedgerAction = (typeof LEDGER_ACTION)[keyof typeof LEDGER_ACTION];

/** Tenant ledgers are never paid out; everyone else has payout details. */
function hasPayoutDetails(ledger: TrustLedger): boolean {
  return ledger.kind !== TRUST_LEDGER_KIND.TENANT;
}

/** Rename (and an owner's management period), payout details, and closing an empty ledger. */
export function TrustLedgerActions({
  agencyId,
  ledger,
  onChanged,
}: {
  agencyId: string;
  ledger: TrustLedger;
  onChanged: () => void;
}) {
  const [action, setAction] = useState<LedgerAction | null>(null);
  const open = ledger.status === TRUST_LEDGER_STATUS.OPEN;
  const close = () => setAction(null);

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        {hasPayoutDetails(ledger) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!open}
            onClick={() => setAction(LEDGER_ACTION.PAYOUT)}
          >
            <Landmark className="size-3.5" />
            {TRUST_PAYOUT_COPY.edit}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setAction(LEDGER_ACTION.RENAME)}
        >
          <Pencil className="size-3.5" />
          {COPY.rename}
        </Button>
        {open ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={ledger.balanceCents !== 0}
            onClick={() => setAction(LEDGER_ACTION.CLOSE)}
          >
            <XCircle className="size-3.5" />
            {COPY.close}
          </Button>
        ) : null}
      </div>

      {action === LEDGER_ACTION.PAYOUT ? (
        <TrustPayoutDialog
          agencyId={agencyId}
          ledgerId={ledger.id}
          ledgerName={ledger.name}
          ledgerKind={ledger.kind}
          onClose={close}
          onSaved={onChanged}
        />
      ) : action === LEDGER_ACTION.RENAME ? (
        <RenameDialog agencyId={agencyId} ledger={ledger} onClose={close} onSaved={onChanged} />
      ) : action === LEDGER_ACTION.CLOSE ? (
        <CloseDialog agencyId={agencyId} ledger={ledger} onClose={close} onClosed={onChanged} />
      ) : null}
    </>
  );
}

function RenameDialog({
  agencyId,
  ledger,
  onClose,
  onSaved,
}: {
  agencyId: string;
  ledger: TrustLedger;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isOwner = ledger.kind === TRUST_LEDGER_KIND.OWNER;
  const [name, setName] = useState(ledger.name);
  const [start, setStart] = useState(ledger.managementStart ?? '');
  const [end, setEnd] = useState(ledger.managementEnd ?? '');
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(COPY.nameRequired);
      return;
    }
    setPending(true);
    try {
      await updateTrustLedger(agencyId, ledger.id, {
        name: trimmed === ledger.name ? undefined : trimmed,
        ...(isOwner && start !== (ledger.managementStart ?? '') ? { managementStart: start || null } : {}),
        ...(isOwner && end !== (ledger.managementEnd ?? '') ? { managementEnd: end || null } : {}),
      });
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
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.renameTitle}</DialogTitle>
          <DialogDescription>{ledger.code}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-ledger-name">{COPY.name}</Label>
            <Input
              id="trust-ledger-name"
              value={name}
              maxLength={TRUST_INPUT_LIMITS.ledgerNameMax}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {isOwner ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="trust-ledger-start">{COPY.managementStart}</Label>
                <Input
                  id="trust-ledger-start"
                  type="date"
                  value={start}
                  disabled={pending}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trust-ledger-end">{COPY.managementEnd}</Label>
                <Input
                  id="trust-ledger-end"
                  type="date"
                  value={end}
                  disabled={pending}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({
  agencyId,
  ledger,
  onClose,
  onClosed,
}: {
  agencyId: string;
  ledger: TrustLedger;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    try {
      await closeTrustLedger(agencyId, ledger.id);
      toast.success(COPY.closed);
      onClosed();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.closeTitle}</DialogTitle>
          <DialogDescription>{COPY.closeBody}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void onConfirm()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.closeConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
