'use client';

import { useState } from 'react';

import { TrustAccountCodeDialog } from '@/components/agent/trust/trust-account-code-dialog';
import { TrustBankAccountDialog } from '@/components/agent/trust/trust-bank-account-dialog';
import { TrustWorkspaceSettingsTables } from '@/components/agent/trust/trust-settings-summary';
import { TrustTakeOnPanel } from '@/components/agent/trust/trust-take-on-panel';
import { TrustPanel } from '@/components/agent/trust/trust-ui';
import { TRUST_SETTINGS_TAB_COPY as COPY } from '@/constants/trust';
import type {
  AgentTrustWorkspace,
  TrustAccountCode,
  TrustBankAccount,
} from '@/lib/crossub-api/agent-trust-client';

/** The code dialog: closed, adding, or editing one code. */
type CodeDialog = { open: false } | { open: true; code: TrustAccountCode | null };

/**
 * Trust, Settings (D132 as amended 26 Oct 2026): the agency keeps its own trust bank account
 * (ABA details included) and account codes, and posts its opening balances.
 */
export function TrustSettingsTab({
  agencyId,
  bankAccountId,
  workspace,
  onChanged,
}: {
  agencyId: string;
  bankAccountId: string;
  workspace: AgentTrustWorkspace;
  onChanged: () => void;
}) {
  const [editingAccount, setEditingAccount] = useState<TrustBankAccount | null>(null);
  const [codeDialog, setCodeDialog] = useState<CodeDialog>({ open: false });

  return (
    <div className="space-y-4">
      <TrustPanel title={COPY.title}>
        <p className="text-muted-foreground mb-4 text-sm">{COPY.description}</p>
        <TrustWorkspaceSettingsTables
          workspace={workspace}
          edit={{
            onEditBankAccount: setEditingAccount,
            onAddCode: () => setCodeDialog({ open: true, code: null }),
            onEditCode: (code) => setCodeDialog({ open: true, code }),
          }}
        />
      </TrustPanel>
      <TrustTakeOnPanel agencyId={agencyId} bankAccountId={bankAccountId} />

      {editingAccount ? (
        <TrustBankAccountDialog
          key={editingAccount.id}
          agencyId={agencyId}
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={onChanged}
        />
      ) : null}
      {codeDialog.open ? (
        <TrustAccountCodeDialog
          key={codeDialog.code?.id ?? 'new'}
          agencyId={agencyId}
          code={codeDialog.code}
          onClose={() => setCodeDialog({ open: false })}
          onSaved={onChanged}
        />
      ) : null}
    </div>
  );
}
