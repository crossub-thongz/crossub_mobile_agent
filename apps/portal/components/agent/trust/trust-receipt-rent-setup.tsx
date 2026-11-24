'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_RECEIPT_RENT_SETUP_COPY as COPY,
  TRUST_RENT_PERIOD,
  TRUST_RENT_PERIOD_NAME,
  TRUST_RENT_PERIODS,
  TRUST_RENT_PROFILE_COPY as RENT_COPY,
  type TrustRentPeriod,
} from '@/constants/trust';
import { setTrustRentProfile } from '@/lib/crossub-api/agent-trust-client';
import { centsToDollarsInput, parseDollarsToCents } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** The tenancy's rent, when the property has one, as the starting values of the set-up. */
export type ReceiptRentSetupDefaults = {
  cents: number;
  period: string;
  paidTo: string | null;
};

function isTrustRentPeriod(period: string): period is TrustRentPeriod {
  return (TRUST_RENT_PERIODS as readonly string[]).includes(period);
}

/**
 * Shown on the tenant receipt when the chosen tenant ledger has no rent yet. A receipt cannot put
 * money to rent until the ledger knows the rent and the date it is paid to, so the agent confirms
 * both here and the receipt carries on. The paid-to date is never guessed. Mount it per ledger.
 */
export function TrustReceiptRentSetup({
  agencyId,
  ledgerId,
  defaults,
  disabled,
  onSaved,
}: {
  agencyId: string;
  ledgerId: string;
  defaults: ReceiptRentSetupDefaults | null;
  disabled: boolean;
  onSaved: () => void;
}) {
  // A tenancy period the ledger cannot hold (yearly) is left for the agent to restate.
  const usable = defaults && isTrustRentPeriod(defaults.period) ? defaults : null;
  const [amount, setAmount] = useState(centsToDollarsInput(usable?.cents));
  const [period, setPeriod] = useState<TrustRentPeriod>(
    defaults && isTrustRentPeriod(defaults.period) ? defaults.period : TRUST_RENT_PERIOD.WEEKLY,
  );
  const [paidTo, setPaidTo] = useState(defaults?.paidTo ?? '');
  const [pending, setPending] = useState(false);
  const locked = disabled || pending;

  async function onSave() {
    const rentAmountCents = parseDollarsToCents(amount);
    if (rentAmountCents == null || rentAmountCents <= 0) {
      toast.error(RENT_COPY.amountInvalid);
      return;
    }
    if (!paidTo) {
      toast.error(RENT_COPY.paidToRequired);
      return;
    }
    setPending(true);
    try {
      await setTrustRentProfile(agencyId, ledgerId, { rentAmountCents, rentPeriod: period, paidToDate: paidTo });
      toast.success(RENT_COPY.saved);
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm">
      <div>
        <p className="font-medium">{COPY.title}</p>
        <p className="text-muted-foreground">{COPY.description}</p>
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="trust-receipt-rent-amount">{RENT_COPY.amount}</Label>
          <Input
            id="trust-receipt-rent-amount"
            inputMode="decimal"
            value={amount}
            disabled={locked}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className="bg-background h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trust-receipt-rent-period">{RENT_COPY.period}</Label>
          <select
            id="trust-receipt-rent-period"
            value={period}
            disabled={locked}
            onChange={(event) => setPeriod(event.target.value as TrustRentPeriod)}
            className={SELECT_CLASS}
          >
            {TRUST_RENT_PERIODS.map((item) => (
              <option key={item} value={item}>
                {TRUST_RENT_PERIOD_NAME[item]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trust-receipt-rent-paid-to">{RENT_COPY.paidTo}</Label>
          <Input
            id="trust-receipt-rent-paid-to"
            type="date"
            value={paidTo}
            disabled={locked}
            onChange={(event) => setPaidTo(event.target.value)}
            className="bg-background h-9"
          />
        </div>
        <Button type="button" disabled={locked} onClick={() => void onSave()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {RENT_COPY.submit}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{RENT_COPY.paidToHint}</p>
    </div>
  );
}
