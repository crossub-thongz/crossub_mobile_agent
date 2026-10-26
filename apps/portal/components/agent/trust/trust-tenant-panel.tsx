'use client';

import { Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { TrustPanel } from '@/components/agent/trust/trust-ui';
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
  TRUST_BOND_COPY as BOND_COPY,
  TRUST_INPUT_LIMITS,
  TRUST_RENT_RESET_COPY as RESET_COPY,
} from '@/constants/trust';
import { resetTrustRent, setTrustBond, type TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import { centsToDollarsInput, formatCents, formatTrustDate, parseDollarsToCents } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

type RentProfile = NonNullable<TrustLedger['rentProfile']>;

/** Which tenant dialog is showing. */
const TENANT_DIALOG = {
  BOND: 'bond',
  RESET: 'reset',
} as const;
type TenantDialog = (typeof TENANT_DIALOG)[keyof typeof TENANT_DIALOG];

/** A tenant ledger's bond record and the manual paid-to reset; shown once the rent is set. */
export function TrustTenantPanel({
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
  const [dialog, setDialog] = useState<TenantDialog | null>(null);
  const close = () => setDialog(null);
  const hasBond = profile.bondRequiredCents != null || profile.bondHeldCents > 0;

  return (
    <TrustPanel
      title={BOND_COPY.title}
      actions={
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialog(TENANT_DIALOG.RESET)}>
            {RESET_COPY.action}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialog(TENANT_DIALOG.BOND)}>
            {BOND_COPY.edit}
          </Button>
        </div>
      }
    >
      {hasBond ? (
        <dl className="space-y-1 text-sm">
          <Line label={BOND_COPY.required} value={formatCents(profile.bondRequiredCents)} />
          <Line label={BOND_COPY.dueOn} value={formatTrustDate(profile.bondDueOn)} />
          <Line label={BOND_COPY.reference} value={profile.bondReference ?? '—'} />
          <p className="text-muted-foreground pt-1 text-xs">
            {BOND_COPY.held(formatCents(profile.bondHeldCents))}
            {profile.bondOutstandingCents > 0 ? ` · ${BOND_COPY.outstanding(formatCents(profile.bondOutstandingCents))}` : ''}
          </p>
        </dl>
      ) : (
        <p className="text-muted-foreground text-sm">{BOND_COPY.none}</p>
      )}

      {dialog === TENANT_DIALOG.BOND ? (
        <BondDialog agencyId={agencyId} ledger={ledger} profile={profile} onClose={close} onSaved={onChanged} />
      ) : dialog === TENANT_DIALOG.RESET ? (
        <ResetDialog agencyId={agencyId} ledger={ledger} profile={profile} onClose={close} onSaved={onChanged} />
      ) : null}
    </TrustPanel>
  );
}

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function FormDialog({
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
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
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

/** Blank is "none" (null); otherwise dollars to cents, or undefined when the text is not an amount. */
function optionalCents(input: string): number | null | undefined {
  if (!input.trim()) return null;
  return parseDollarsToCents(input) ?? undefined;
}

function BondDialog({
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
  const [required, setRequired] = useState(centsToDollarsInput(profile.bondRequiredCents));
  const [dueOn, setDueOn] = useState(profile.bondDueOn ?? '');
  const [received, setReceived] = useState(centsToDollarsInput(profile.bondReceivedCents));
  const [paidDirect, setPaidDirect] = useState(centsToDollarsInput(profile.bondPaidDirectCents));
  const [reference, setReference] = useState(profile.bondReference ?? '');
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const bondRequiredCents = optionalCents(required);
    const bondReceivedCents = optionalCents(received);
    const bondPaidDirectCents = optionalCents(paidDirect);
    if (bondRequiredCents === undefined || bondReceivedCents === undefined || bondPaidDirectCents === undefined) {
      toast.error(BOND_COPY.amountInvalid);
      return;
    }
    setPending(true);
    try {
      await setTrustBond(agencyId, ledger.id, {
        bondRequiredCents,
        bondDueOn: dueOn || null,
        bondReceivedCents,
        bondPaidDirectCents,
        bondReference: reference.trim() || null,
      });
      toast.success(BOND_COPY.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDialog
      title={BOND_COPY.dialogTitle(ledger.name)}
      description={BOND_COPY.dialogDescription}
      pending={pending}
      submitLabel={BOND_COPY.submit}
      cancelLabel={BOND_COPY.cancel}
      onSubmit={() => void onSubmit()}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trust-bond-required">{BOND_COPY.required}</Label>
          <Input id="trust-bond-required" inputMode="decimal" value={required} disabled={pending} onChange={(e) => setRequired(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trust-bond-due">{BOND_COPY.dueOn}</Label>
          <Input id="trust-bond-due" type="date" value={dueOn} disabled={pending} onChange={(e) => setDueOn(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trust-bond-received">{BOND_COPY.received}</Label>
          <Input id="trust-bond-received" inputMode="decimal" value={received} disabled={pending} onChange={(e) => setReceived(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trust-bond-direct">{BOND_COPY.paidDirect}</Label>
          <Input id="trust-bond-direct" inputMode="decimal" value={paidDirect} disabled={pending} onChange={(e) => setPaidDirect(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trust-bond-reference">{BOND_COPY.reference}</Label>
        <Input
          id="trust-bond-reference"
          value={reference}
          maxLength={TRUST_INPUT_LIMITS.bondReferenceMax}
          disabled={pending}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
    </FormDialog>
  );
}

function ResetDialog({
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
  const [paidTo, setPaidTo] = useState(profile.paidToDate);
  const [partPayment, setPartPayment] = useState(centsToDollarsInput(profile.partPaymentCents));
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const partPaymentCents = partPayment.trim() ? parseDollarsToCents(partPayment) : 0;
    if (partPaymentCents == null) {
      toast.error(RESET_COPY.amountInvalid);
      return;
    }
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error(RESET_COPY.noteRequired);
      return;
    }
    setPending(true);
    try {
      await resetTrustRent(agencyId, ledger.id, {
        paidToDate: paidTo !== profile.paidToDate ? paidTo : undefined,
        partPaymentCents: partPaymentCents !== profile.partPaymentCents ? partPaymentCents : undefined,
        note: trimmed,
      });
      toast.success(RESET_COPY.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDialog
      title={RESET_COPY.title(ledger.name)}
      description={RESET_COPY.description}
      pending={pending}
      submitLabel={RESET_COPY.submit}
      cancelLabel={RESET_COPY.cancel}
      onSubmit={() => void onSubmit()}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trust-reset-paid-to">{RESET_COPY.paidTo}</Label>
          <Input id="trust-reset-paid-to" type="date" value={paidTo} disabled={pending} onChange={(e) => setPaidTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trust-reset-part">{RESET_COPY.partPayment}</Label>
          <Input id="trust-reset-part" inputMode="decimal" value={partPayment} disabled={pending} onChange={(e) => setPartPayment(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trust-reset-note">{RESET_COPY.note}</Label>
        <Input
          id="trust-reset-note"
          value={note}
          maxLength={TRUST_INPUT_LIMITS.rentNoteMax}
          disabled={pending}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </FormDialog>
  );
}
