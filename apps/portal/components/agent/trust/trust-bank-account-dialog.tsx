'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { TrustBankAccountFields } from '@/components/agent/trust/trust-bank-account-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  TRUST_BANK_ACCOUNT_DIALOG_COPY as COPY,
  TRUST_BANK_ACCOUNT_FORM_COPY,
} from '@/constants/trust';
import { updateTrustBankAccount, type TrustBankAccount } from '@/lib/crossub-api/agent-trust-client';
import { trustBankAccountDraft, trustBankAccountUpdateInput } from '@/lib/trust-setup';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Edit the trust bank account, its ABA details included. Mount per open, keyed by the account. */
export function TrustBankAccountDialog({
  agencyId,
  account,
  onClose,
  onSaved,
}: {
  agencyId: string;
  account: TrustBankAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => trustBankAccountDraft(account));
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const checked = trustBankAccountUpdateInput(draft, account);
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    setPending(true);
    try {
      await updateTrustBankAccount(agencyId, account.id, checked.value);
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
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{COPY.title(account.name)}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <TrustBankAccountFields
          draft={draft}
          onChange={setDraft}
          disabled={pending}
          storedLast4={account.accountNumberLast4}
          hasTransactions={account.transactionCount > 0}
          idPrefix="trust-bank-account"
        />
        <div className="flex items-center gap-2">
          <input
            id="trust-bank-account-archived"
            type="checkbox"
            className="size-4"
            checked={draft.archived}
            disabled={pending}
            onChange={(e) => setDraft({ ...draft, archived: e.target.checked })}
          />
          <Label htmlFor="trust-bank-account-archived">{TRUST_BANK_ACCOUNT_FORM_COPY.archived}</Label>
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
