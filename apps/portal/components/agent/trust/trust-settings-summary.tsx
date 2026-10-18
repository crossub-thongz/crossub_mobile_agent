'use client';

import { ArrowRight, Landmark } from 'lucide-react';
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
  TRUST_ACCOUNT_CODE_KIND_LABEL,
  TRUST_BANK_ACCOUNT_STATUS,
  TRUST_PAGE_COPY,
  TRUST_SETTINGS_SUMMARY_COPY as COPY,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustWorkspace, type AgentTrustWorkspace } from '@/lib/crossub-api/agent-trust-client';
import { selfManagedTrustAgencies } from '@/lib/portal-service-level';
import { isTrustNotSetUpError } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import type { Agency } from '@/lib/types';

/** A trust workspace's bank accounts and account codes, read-only. */
export function TrustWorkspaceSettingsTables({ workspace }: { workspace: AgentTrustWorkspace }) {
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">{COPY.accountCodes}</p>
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
 * Read-only trust settings for a Self-Manage principal or accountant: the workspace's bank
 * accounts and account codes. CROSSUB keeps managing them (D132: the agency never holds
 * MANAGE_TRUST_SETTINGS).
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
