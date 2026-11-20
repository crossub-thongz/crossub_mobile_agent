'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { TrustPanel } from '@/components/agent/trust/trust-ui';
import { TRUST_RENT_REMINDERS_COPY as COPY } from '@/constants/trust-corrections';
import { updateTrustBankAccount, type TrustBankAccount } from '@/lib/crossub-api/agent-trust-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * PRD phase 4 (D158): rent reminders (−1, −3 days to the tenant) and the 7-day alert are queued in
 * Pending mail every day; per trust bank account, they can also be emailed straight away. Off by default.
 */
export function TrustRentRemindersPanel({
  agencyId,
  bankAccounts,
  onChanged,
}: {
  agencyId: string;
  bankAccounts: readonly TrustBankAccount[];
  onChanged: () => void;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);

  async function toggle(account: TrustBankAccount, next: boolean) {
    setSavingId(account.id);
    try {
      await updateTrustBankAccount(agencyId, account.id, { rentRemindersAutoSend: next });
      toast.success(COPY.saved(next));
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  if (bankAccounts.length === 0) return null;
  return (
    <TrustPanel title={COPY.title}>
      <p className="text-muted-foreground mb-3 text-sm">{COPY.description}</p>
      <ul className="space-y-2">
        {bankAccounts.map((account) => (
          <li key={account.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={account.rentRemindersAutoSend}
                disabled={savingId === account.id}
                onChange={(event) => void toggle(account, event.target.checked)}
              />
              {bankAccounts.length > 1 ? `${COPY.toggle} (${account.name})` : COPY.toggle}
            </label>
          </li>
        ))}
      </ul>
    </TrustPanel>
  );
}
