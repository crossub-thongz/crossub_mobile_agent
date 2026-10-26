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
import { TRUST_ADD_BANK_ACCOUNT_COPY as COPY } from '@/constants/trust-settings';
import { createTrustBankAccount } from '@/lib/crossub-api/agent-trust-settings-client';
import { trustBankAccountCreateInput, trustBankAccountDraft } from '@/lib/trust-setup';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Add a further trust bank account to the agency's own workspace (D135), with the same fields
 * and checks as the set-up's first account. Mount per open.
 */
export function TrustAddBankAccountDialog({
  agencyId,
  onClose,
  onSaved,
}: {
  agencyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => trustBankAccountDraft());
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const checked = trustBankAccountCreateInput(draft);
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    setPending(true);
    try {
      await createTrustBankAccount(agencyId, checked.value);
      toast.success(COPY.added);
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
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <TrustBankAccountFields draft={draft} onChange={setDraft} disabled={pending} idPrefix="trust-add-bank-account" />
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
