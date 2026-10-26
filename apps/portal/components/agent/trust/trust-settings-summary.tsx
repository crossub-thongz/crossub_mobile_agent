'use client';

import { ArrowRight, Landmark, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
} from '@/components/agent/trust/trust-ui';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  TRUST_ACCOUNT_CODE_DIALOG_COPY,
  TRUST_ACCOUNT_CODE_KIND_LABEL,
  TRUST_BANK_ACCOUNT_DIALOG_COPY,
  TRUST_BANK_ACCOUNT_STATUS,
  TRUST_PAGE_COPY,
  TRUST_SETTINGS_SUMMARY_COPY as COPY,
  TRUST_SETTINGS_TAB_COPY,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustWorkspace,
  type AgentTrustWorkspace,
  type TrustAccountCode,
  type TrustBankAccount,
} from '@/lib/crossub-api/agent-trust-client';
import { selfManagedTrustAgencies } from '@/lib/portal-service-level';
import { isTrustNotSetUpError } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import type { Agency } from '@/lib/types';

/** What the Trust page Settings tab can change; without it the tables are read-only. */
export type TrustSettingsEditActions = {
  onEditBankAccount: (account: TrustBankAccount) => void;
  onAddCode: () => void;
  onEditCode: (code: TrustAccountCode) => void;
};

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClick}>
      <Pencil className="size-3.5" />
      {label}
    </Button>
  );
}

/** A trust workspace's bank accounts and account codes; editable when `edit` is given. */
export function TrustWorkspaceSettingsTables({
  workspace,
  edit,
}: {
  workspace: AgentTrustWorkspace;
  edit?: TrustSettingsEditActions;
}) {
  const codes = [...workspace.accountCodes].sort((a, b) => a.code.localeCompare(b.code));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="mb-1 text-sm font-semibold">{COPY.bankAccounts}</p>
        {workspace.bankAccounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">{COPY.noBankAccounts}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b">
                <tr>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{TRUST_PAGE_COPY.bankAccountLabel}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.bsb}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.account}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{TRUST_SETTINGS_TAB_COPY.aba}</th>
                  {edit ? <th className={TRUST_TABLE_HEAD_CLASS} /> : null}
                </tr>
              </thead>
              <tbody>
                {workspace.bankAccounts.map((account) => (
                  <tr key={account.id} className="border-b last:border-b-0">
                    <td className={TRUST_TABLE_CELL_CLASS}>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {[account.bankName, account.accountName].filter(Boolean).join(' · ')}
                        {account.status === TRUST_BANK_ACCOUNT_STATUS.ARCHIVED
                          ? ` (${TRUST_PAGE_COPY.archived})`
                          : ''}
                      </p>
                    </td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'tabular-nums')}>{account.bsb ?? '—'}</td>
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'tabular-nums')}>
                      {account.accountNumberLast4 ? `…${account.accountNumberLast4}` : '—'}
                    </td>
                    <td
                      className={cn(
                        TRUST_TABLE_CELL_CLASS,
                        'whitespace-nowrap text-xs',
                        account.abaReady ? 'text-emerald-600' : 'text-amber-600',
                      )}
                    >
                      {account.abaReady ? TRUST_SETTINGS_TAB_COPY.abaReady : TRUST_SETTINGS_TAB_COPY.abaMissing}
                    </td>
                    {edit ? (
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                        <EditButton
                          label={TRUST_BANK_ACCOUNT_DIALOG_COPY.edit}
                          onClick={() => edit.onEditBankAccount(account)}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{COPY.accountCodes}</p>
          {edit ? (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={edit.onAddCode}>
              <Plus className="size-3.5" />
              {TRUST_ACCOUNT_CODE_DIALOG_COPY.add}
            </Button>
          ) : null}
        </div>
        {codes.length === 0 ? (
          <p className="text-muted-foreground text-sm">{COPY.noAccountCodes}</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-card sticky top-0 border-b">
                <tr>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.code}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.name}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.kind}</th>
                  <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.gst}</th>
                  {edit ? <th className={TRUST_TABLE_HEAD_CLASS} /> : null}
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr
                    key={code.id}
                    className={cn('border-b last:border-b-0', !code.isActive && 'text-muted-foreground')}
                  >
                    <td className={cn(TRUST_TABLE_CELL_CLASS, 'font-mono text-xs')}>{code.code}</td>
                    <td className={TRUST_TABLE_CELL_CLASS}>
                      {code.name}
                      {code.isActive ? '' : ` (${COPY.inactive})`}
                    </td>
                    <td className={TRUST_TABLE_CELL_CLASS}>{TRUST_ACCOUNT_CODE_KIND_LABEL[code.kind]}</td>
                    <td className={TRUST_TABLE_CELL_CLASS}>
                      {code.gstApplies ? COPY.gstApplies : COPY.gstNone}
                    </td>
                    {edit ? (
                      <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                        <EditButton label={TRUST_ACCOUNT_CODE_DIALOG_COPY.edit} onClick={() => edit.onEditCode(code)} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AgencyWorkspace({ agency, showName }: { agency: Agency; showName: boolean }) {
  const { data, error, reload } = useTrustResource(agency.id, () => fetchTrustWorkspace(agency.id));
  return (
    <TrustPanel title={showName ? agency.name : undefined}>
      {data ? (
        <TrustWorkspaceSettingsTables workspace={data} />
      ) : isTrustNotSetUpError(error) ? (
        <p className="text-muted-foreground text-sm">{TRUST_PAGE_COPY.notSetUpTitle}</p>
      ) : error ? (
        <TrustLoadError error={error} onRetry={reload} />
      ) : (
        <TrustLoading />
      )}
    </TrustPanel>
  );
}

/**
 * Trust settings summary for a Self-Manage principal or accountant (Accounting, Settings): the
 * workspace's bank accounts and account codes, read-only here. They are changed from Trust,
 * Settings (D132 as amended 26 Oct 2026).
 */
export function TrustSettingsSummary() {
  const { agencies } = useAgentData();
  const trustAgencies = useMemo(() => selfManagedTrustAgencies(agencies), [agencies]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Landmark className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{COPY.title}</p>
            <p className="text-muted-foreground text-sm">{COPY.description}</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={ROUTES.TRUST}>
            {COPY.openTrust}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      {trustAgencies.map((agency) => (
        <AgencyWorkspace key={agency.id} agency={agency} showName={trustAgencies.length > 1} />
      ))}
    </div>
  );
}
