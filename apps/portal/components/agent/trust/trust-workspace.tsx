'use client';

import { useState, type ReactNode } from 'react';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustAuditLogPanel } from '@/components/agent/trust/trust-audit-log-panel';
import { TrustBankFilesTab } from '@/components/agent/trust/trust-bank-files-tab';
import { TrustBankStatementTab } from '@/components/agent/trust/trust-bank-statement-tab';
import { TrustBillsInvoicesTab } from '@/components/agent/trust/trust-bills-invoices-tab';
import { TrustDisburseTab } from '@/components/agent/trust/trust-disburse-tab';
import { TrustLedgersTab } from '@/components/agent/trust/trust-ledgers-tab';
import { TrustOverviewTab } from '@/components/agent/trust/trust-overview-tab';
import { TrustReconciliationTab } from '@/components/agent/trust/trust-reconciliation-tab';
import { TrustRentTab } from '@/components/agent/trust/trust-rent-tab';
import { TrustReportsTab } from '@/components/agent/trust/trust-reports-tab';
import { TrustSettingsTab } from '@/components/agent/trust/trust-settings-tab';
import { TrustSetupForm } from '@/components/agent/trust/trust-setup-form';
import {
  TrustAccountingMenuButton,
  TrustAccountingSidebar,
  TrustScreenHeading,
} from '@/components/agent/trust/trust-sidebar';
import { TrustTransactionsTab } from '@/components/agent/trust/trust-transactions-tab';
import { TrustLoadError, TrustLoading } from '@/components/agent/trust/trust-ui';
import { Label } from '@/components/ui/label';
import {
  TRUST_BANK_ACCOUNT_STATUS,
  TRUST_PAGE_COPY as COPY,
  TRUST_TAB,
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
import { cn } from '@/lib/utils';

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
      return <TrustTransactionsTab {...props} accountCodes={accountCodes} />;
    case TRUST_TAB.RENT:
      return <TrustRentTab {...props} />;
    case TRUST_TAB.BILLS:
      return <TrustBillsInvoicesTab {...props} accountCodes={accountCodes} />;
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
    case TRUST_TAB.AUDIT_LOG:
      return <TrustAuditLogPanel agencyId={agencyId} />;
    case TRUST_TAB.SETTINGS:
      return <TrustSettingsTab {...props} workspace={workspace} onChanged={onWorkspaceChanged} />;
  }
}

function TrustContextBar({
  agencies,
  agencyId,
  accounts,
  bankAccountId,
  onAgency,
  onBankAccount,
}: {
  agencies: readonly Agency[];
  agencyId: string;
  accounts: readonly TrustBankAccount[];
  bankAccountId: string | null;
  onAgency: (agencyId: string) => void;
  onBankAccount: (bankAccountId: string) => void;
}) {
  if (agencies.length === 0 && accounts.length === 0) return null;

  return (
    <div className="border-border bg-card flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border px-3 py-2">
      {agencies.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor="trust-agency" className="text-muted-foreground text-xs">
            {COPY.agencyLabel}
          </Label>
          <select
            id="trust-agency"
            className={cn(SELECT_CLASS, 'h-8 w-64 max-w-full')}
            value={agencyId}
            onChange={(event) => onAgency(event.target.value)}
          >
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {accounts.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor="trust-bank-account" className="text-muted-foreground text-xs">
            {COPY.bankAccountLabel}
          </Label>
          <select
            id="trust-bank-account"
            className={cn(SELECT_CLASS, 'h-8 w-56 max-w-full')}
            value={bankAccountId ?? ''}
            onChange={(event) => onBankAccount(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {bankAccountLabel(account)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Self-Manage trust accounting. The side menu matches admin Trust Accounting. An agency without a
 * trust workspace or bank account yet gets the set-up form instead of an error.
 */
export function TrustWorkspace({ agencies }: { agencies: readonly Agency[] }) {
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? '');
  const [pickedBankAccountId, setPickedBankAccountId] = useState<string | null>(null);
  const [tab, setTab] = useState<TrustTab>(TRUST_TAB.OVERVIEW);

  const workspace = useTrustResource(agencyId || null, () => fetchTrustWorkspace(agencyId));
  const accounts = workspace.data?.bankAccounts ?? [];
  const bankAccountId =
    pickedBankAccountId && accounts.some((account: TrustBankAccount) => account.id === pickedBankAccountId)
      ? pickedBankAccountId
      : defaultBankAccountId(accounts);

  const needsWorkspace = isTrustNotSetUpError(workspace.error);
  const notSetUp = needsWorkspace || (workspace.data != null && accounts.length === 0);
  const agencyName = agencies.find((agency) => agency.id === agencyId)?.name ?? '';
  const ready = Boolean(workspace.data && bankAccountId && !workspace.loading && !workspace.error && !notSetUp);

  let body: ReactNode;
  if (notSetUp) {
    body = (
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
    );
  } else if (workspace.error) {
    body = <TrustLoadError error={workspace.error} onRetry={workspace.reload} />;
  } else if (!workspace.data || !bankAccountId || workspace.loading) {
    body = <TrustLoading />;
  } else {
    body = (
      <TrustTabContent
        key={`${agencyId}:${bankAccountId}`}
        tab={tab}
        agencyId={agencyId}
        bankAccountId={bankAccountId}
        workspace={workspace.data}
        onOpenTab={setTab}
        onWorkspaceChanged={workspace.reload}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      {ready ? <TrustAccountingSidebar tab={tab} onChange={setTab} /> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="space-y-4 px-4 pt-4 pb-5 lg:px-8 lg:pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {ready ? (
              <TrustScreenHeading tab={tab} />
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight">{COPY.title}</h1>
            )}
            {ready ? <TrustAccountingMenuButton tab={tab} onChange={setTab} /> : null}
          </div>
          <TrustContextBar
            agencies={agencies}
            agencyId={agencyId}
            accounts={accounts}
            bankAccountId={bankAccountId}
            onAgency={(next) => {
              setAgencyId(next);
              setPickedBankAccountId(null);
            }}
            onBankAccount={setPickedBankAccountId}
          />
        </header>
        <div className="px-4 pb-8 lg:px-8">{body}</div>
      </div>
    </div>
  );
}
