'use client';

import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustBankFilesTab } from '@/components/agent/trust/trust-bank-files-tab';
import { TrustBankStatementTab } from '@/components/agent/trust/trust-bank-statement-tab';
import { TrustBillsTab } from '@/components/agent/trust/trust-bills-tab';
import { TrustDisburseTab } from '@/components/agent/trust/trust-disburse-tab';
import { TrustLedgersTab } from '@/components/agent/trust/trust-ledgers-tab';
import { TrustOverviewTab } from '@/components/agent/trust/trust-overview-tab';
import { TrustReconciliationTab } from '@/components/agent/trust/trust-reconciliation-tab';
import { TrustRentTab } from '@/components/agent/trust/trust-rent-tab';
import { TrustReportsTab } from '@/components/agent/trust/trust-reports-tab';
import { TrustSettingsTab } from '@/components/agent/trust/trust-settings-tab';
import { TrustSetupForm } from '@/components/agent/trust/trust-setup-form';
import { TrustTransactionsTab } from '@/components/agent/trust/trust-transactions-tab';
import { TrustLoadError, TrustLoading } from '@/components/agent/trust/trust-ui';
import { Label } from '@/components/ui/label';
import {
  TRUST_BANK_ACCOUNT_STATUS,
  TRUST_PAGE_COPY as COPY,
  TRUST_TAB,
  TRUST_TABS,
  type TrustTab,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustWorkspace,
  type AgentTrustWorkspace,
  type TrustBankAccount,
} from '@/lib/crossub-api/agent-trust-client';
import { isTrustNotSetUpError } from '@/lib/trust-accounting';
import type { Agency } from '@/lib/types';

function defaultBankAccountId(accounts: readonly TrustBankAccount[]): string | null {
  const active = accounts.find((a) => a.status === TRUST_BANK_ACCOUNT_STATUS.ACTIVE);
  return (active ?? accounts[0])?.id ?? null;
}

function bankAccountLabel(account: TrustBankAccount): string {
  const parts = [account.name, account.accountNumberLast4 ? `…${account.accountNumberLast4}` : null];
  const label = parts.filter(Boolean).join(' ');
  return account.status === TRUST_BANK_ACCOUNT_STATUS.ARCHIVED ? `${label} (${COPY.archived})` : label;
}

function TrustTabContent({
  tab,
  agencyId,
  bankAccountId,
  workspace,
  onOpenTab,
  onWorkspaceChanged,
}: {
  tab: TrustTab;
  agencyId: string;
  bankAccountId: string;
  workspace: AgentTrustWorkspace;
  onOpenTab: (tab: TrustTab) => void;
  onWorkspaceChanged: () => void;
}) {
  const props = { agencyId, bankAccountId };
  const { accountCodes } = workspace;
  switch (tab) {
    case TRUST_TAB.OVERVIEW:
      return <TrustOverviewTab {...props} onOpenTab={onOpenTab} />;
    case TRUST_TAB.LEDGERS:
      return <TrustLedgersTab {...props} accountCodes={accountCodes} />;
    case TRUST_TAB.TRANSACTIONS:
      return <TrustTransactionsTab {...props} />;
    case TRUST_TAB.RENT:
      return <TrustRentTab {...props} />;
    case TRUST_TAB.BILLS:
      return <TrustBillsTab {...props} accountCodes={accountCodes} />;
    case TRUST_TAB.DISBURSE:
      return <TrustDisburseTab {...props} />;
    case TRUST_TAB.BANK_FILES:
      return <TrustBankFilesTab {...props} />;
    case TRUST_TAB.BANK_STATEMENT:
      return <TrustBankStatementTab {...props} />;
    case TRUST_TAB.RECONCILIATION:
      return <TrustReconciliationTab {...props} />;
    case TRUST_TAB.REPORTS:
      return <TrustReportsTab {...props} />;
    case TRUST_TAB.SETTINGS:
      return <TrustSettingsTab {...props} workspace={workspace} onChanged={onWorkspaceChanged} />;
  }
}

/**
 * Self-Manage trust accounting: pick the agency (when the agent runs several trust accounts) and
 * the trust bank account, then work one tab at a time. An agency without a trust workspace or
 * bank account yet gets the set-up form (D132 as amended 26 Oct 2026) instead of an error.
 */
export function TrustWorkspace({ agencies }: { agencies: readonly Agency[] }) {
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? '');
  const [pickedBankAccountId, setPickedBankAccountId] = useState<string | null>(null);
  const [tab, setTab] = useState<TrustTab>(TRUST_TAB.OVERVIEW);

  const workspace = useTrustResource(agencyId || null, () => fetchTrustWorkspace(agencyId));
  const accounts = workspace.data?.bankAccounts ?? [];
  const bankAccountId =
    pickedBankAccountId && accounts.some((a) => a.id === pickedBankAccountId)
      ? pickedBankAccountId
      : defaultBankAccountId(accounts);

  const needsWorkspace = isTrustNotSetUpError(workspace.error);
  const notSetUp = needsWorkspace || (workspace.data != null && accounts.length === 0);
  const agencyName = agencies.find((agency) => agency.id === agencyId)?.name ?? '';

  return (
    <div className="space-y-4 lg:px-6 lg:py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {agencies.length > 1 ? (
          <div className="space-y-1.5 lg:w-64">
            <Label htmlFor="trust-agency">{COPY.agencyLabel}</Label>
            <select
              id="trust-agency"
              className={SELECT_CLASS}
              value={agencyId}
              onChange={(e) => {
                setAgencyId(e.target.value);
                setPickedBankAccountId(null);
              }}
            >
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {accounts.length > 1 ? (
          <div className="space-y-1.5 lg:w-64">
            <Label htmlFor="trust-bank-account">{COPY.bankAccountLabel}</Label>
            <select
              id="trust-bank-account"
              className={SELECT_CLASS}
              value={bankAccountId ?? ''}
              onChange={(e) => setPickedBankAccountId(e.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {bankAccountLabel(account)}
                </option>
              ))}
            </select>
          </div>
        ) : accounts.length === 1 ? (
          <p className="text-muted-foreground text-sm">{bankAccountLabel(accounts[0])}</p>
        ) : null}
      </div>

      {notSetUp ? (
        <TrustSetupForm
          key={agencyId}
          agencyId={agencyId}
          agencyName={agencyName}
          needsWorkspace={needsWorkspace}
          onDone={() => {
            setTab(TRUST_TAB.SETTINGS);
            workspace.reload();
          }}
        />
      ) : workspace.error ? (
        <TrustLoadError error={workspace.error} onRetry={workspace.reload} />
      ) : !workspace.data || !bankAccountId || workspace.loading ? (
        <TrustLoading />
      ) : (
        <>
          <FilterChips options={TRUST_TABS} value={tab} onChange={setTab} />
          <TrustTabContent
            key={`${agencyId}:${bankAccountId}`}
            tab={tab}
            agencyId={agencyId}
            bankAccountId={bankAccountId}
            workspace={workspace.data}
            onOpenTab={setTab}
            onWorkspaceChanged={workspace.reload}
          />
        </>
      )}
    </div>
  );
}
