import type { components, operations } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';
import type { TrustBankAccount } from './agent-trust-client';

/**
 * Self-Manage trust settings and audit (D135) on the agent facade: add a further trust bank
 * account, read the agency's own audit trail, and check a ledger's balance against its entries.
 * The audit routes always read the agency's own workspace; the app never names one.
 */

export type CreateTrustBankAccountInput = components['schemas']['CreateBankAccountDto'];
export type TrustAuditEvent = components['schemas']['TrustAuditEventDto'];
export type TrustAuditEventList = components['schemas']['TrustAuditEventListDto'];
export type TrustAuditActor = components['schemas']['TrustAuditActorDto'];
export type TrustAuditActors = components['schemas']['TrustAuditActorsDto'];
export type TrustLedgerBalanceCheck = components['schemas']['TrustLedgerBalanceCheckDto'];

export type TrustAuditEventsQuery = NonNullable<
  operations['AgentTrustAuditController_auditEvents']['parameters']['query']
>;

export async function createTrustBankAccount(
  agencyId: string,
  body: CreateTrustBankAccountInput,
): Promise<TrustBankAccount> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/trust/bank-accounts', {
    params: { path: { agencyId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't add the trust bank account");
}

export async function fetchTrustAuditEvents(
  agencyId: string,
  query: TrustAuditEventsQuery = {},
): Promise<TrustAuditEventList> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/audit-events', {
    params: { path: { agencyId }, query },
  });
  return unwrapCrossubResult(result, "Couldn't load the audit log");
}

export async function fetchTrustAuditActors(agencyId: string): Promise<TrustAuditActors> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/audit-actors', {
    params: { path: { agencyId } },
  });
  return unwrapCrossubResult(result, "Couldn't load who has made changes");
}

export async function fetchTrustLedgerBalanceCheck(
  agencyId: string,
  ledgerId: string,
): Promise<TrustLedgerBalanceCheck> {
  const result = await crossub.GET('/agent/agencies/{agencyId}/trust/ledgers/{ledgerId}/balance-check', {
    params: { path: { agencyId, ledgerId } },
  });
  return unwrapCrossubResult(result, "Couldn't check the ledger balance");
}
