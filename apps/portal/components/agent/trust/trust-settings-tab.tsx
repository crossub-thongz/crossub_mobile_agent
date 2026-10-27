'use client';

import { useState } from 'react';

import { TrustAccountCodeDialog } from '@/components/agent/trust/trust-account-code-dialog';
import { TrustAddBankAccountDialog } from '@/components/agent/trust/trust-add-bank-account-dialog';
import { TrustAuditLogPanel } from '@/components/agent/trust/trust-audit-log-panel';
import { TrustBankAccountDialog } from '@/components/agent/trust/trust-bank-account-dialog';
import { TrustWorkspaceSettingsTables } from '@/components/agent/trust/trust-settings-summary';
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
 * Accounting, Settings (D132 as amended 26 Oct 2026): the agency keeps its own trust bank accounts
 * (ABA details included, D135 adds further ones) and account codes, and reads its audit log
 * (D135). The opening balance is the starting point and is not split across ledgers (D136).
 */
export function TrustSettingsTab({
  agencyId,
  workspace,
  onChanged,
}: {
  agencyId: string;
  /** Passed with every tab's props; Settings covers the whole workspace. */
  bankAccountId: string;
  workspace: AgentTrustWorkspace;
  onChanged: () => void;
}) {
  const [editingAccount, setEditingAccount] = useState<TrustBankAccount | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [codeDialog, setCodeDialog] = useState<CodeDialog>({ open: false });

  return (
    <div className="space-y-4">
      <TrustPanel title={COPY.title}>
        <p className="text-muted-foreground mb-4 text-sm">{COPY.description}</p>
        <TrustWorkspaceSettingsTables
          workspace={workspace}
          edit={{
            onAddBankAccount: () => setAddingAccount(true),
            onEditBankAccount: setEditingAccount,
            onAddCode: () => setCodeDialog({ open: true, code: null }),
            onEditCode: (code) => setCodeDialog({ open: true, code }),
          }}
        />
      </TrustPanel>
      <TrustAuditLogPanel agencyId={agencyId} />

      {editingAccount ? (
        <TrustBankAccountDialog
          key={editingAccount.id}
          agencyId={agencyId}
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={onChanged}
        />
      ) : null}
      {addingAccount ? (
        <TrustAddBankAccountDialog agencyId={agencyId} onClose={() => setAddingAccount(false)} onSaved={onChanged} />
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
