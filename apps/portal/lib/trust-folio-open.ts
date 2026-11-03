import { TRUST_BANK_ACCOUNT_STATUS, TRUST_LEDGER_KIND, TRUST_PAGE_SIZE_MAX } from '@/constants/trust';
import {
  addTrustSupplier,
  fetchTrustLedgers,
  fetchTrustWorkspace,
  runTrustFolioSync,
  type TrustBankAccount,
} from '@/lib/crossub-api/agent-trust-client';
import { isTrustNotSetUpError } from '@/lib/trust-accounting';

const catchUpInflight = new Map<string, Promise<number>>();
const announcedCatchUp = new Map<string, number>();

/** One announcement per account in a short window, so a remount does not toast twice. */
export function reportOpenedFolios(key: string, opened: number): number {
  if (opened <= 0) return 0;
  const now = Date.now();
  const last = announcedCatchUp.get(key) ?? 0;
  if (now - last < 4000) return 0;
  announcedCatchUp.set(key, now);
  return opened;
}

/**
 * Opens owner and tenant ledgers that already exist as parties but have no folio yet.
 * One run per account at a time. A new tenancy already opens its own ledger on the server.
 */
export function catchUpTrustFolios(agencyId: string, bankAccountId: string): Promise<number> {
  const key = `${agencyId}:${bankAccountId}`;
  const existing = catchUpInflight.get(key);
  if (existing) return existing;
  const run = runTrustFolioSync(agencyId, bankAccountId)
    .then((result) => result.opened?.length ?? 0)
    .finally(() => {
      catchUpInflight.delete(key);
    });
  catchUpInflight.set(key, run);
  return run;
}

function activeAccounts(accounts: readonly TrustBankAccount[] | undefined): TrustBankAccount[] {
  return (accounts ?? []).filter((account) => account.status === TRUST_BANK_ACCOUNT_STATUS.ACTIVE);
}

/**
 * The one active trust account, when the agency has exactly one. Several accounts, or none,
 * are left alone: a ledger has to sit on one account.
 */
export async function singleActiveTrustAccount(agencyId: string): Promise<TrustBankAccount | null> {
  try {
    const workspace = await fetchTrustWorkspace(agencyId);
    const active = activeAccounts(workspace.bankAccounts);
    return active.length === 1 ? active[0] : null;
  } catch (err) {
    if (isTrustNotSetUpError(err)) return null;
    throw err;
  }
}

/**
 * Opens a supplier ledger with the same name when People adds a supplier and the agency has
 * one active trust account. The agent supplier route records the name only.
 */
export async function openSupplierLedgerForName(
  agencyId: string,
  name: string,
): Promise<'opened' | 'exists' | 'skipped'> {
  const account = await singleActiveTrustAccount(agencyId);
  if (!account) return 'skipped';
  const trimmed = name.trim();
  const existing = await fetchTrustLedgers(agencyId, account.id, {
    pageSize: TRUST_PAGE_SIZE_MAX,
    kind: TRUST_LEDGER_KIND.SUPPLIER,
    search: trimmed,
  });
  const found = (existing.items ?? []).some(
    (ledger) => ledger.name?.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (found) return 'exists';
  await addTrustSupplier(agencyId, account.id, { name: trimmed });
  return 'opened';
}
