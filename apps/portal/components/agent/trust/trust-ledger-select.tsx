'use client';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TRUST_LEDGER_STATUS, TRUST_PAGE_SIZE_MAX, type TrustLedgerKind } from '@/constants/trust';
import { TRUST_NEW_TRANSACTION_COPY as COPY } from '@/constants/trust-transactions';
import { useTrustResource, type TrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustLedgers, type TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import { trustLedgerOptionLabel } from '@/utils/trust-transactions';

/**
 * The open ledgers of the given kinds, by code. One read per kind, so a long tenant list never
 * crowds owners out of the page size.
 */
export function useTrustOpenLedgers(
  agencyId: string,
  bankAccountId: string,
  kinds: readonly TrustLedgerKind[],
): TrustResource<TrustLedger[]> {
  return useTrustResource(`${agencyId}:${bankAccountId}:open-ledgers:${kinds.join(',')}`, async () => {
    const pages = await Promise.all(
      kinds.map((kind) =>
        fetchTrustLedgers(agencyId, bankAccountId, {
          kind,
          status: TRUST_LEDGER_STATUS.OPEN,
          pageSize: TRUST_PAGE_SIZE_MAX,
        }),
      ),
    );
    return pages.flatMap((page) => page.items).sort((a, b) => a.code.localeCompare(b.code));
  });
}

/** A native select of ledgers; `exclude` hides one (a journal's other side). */
export function TrustLedgerSelect({
  id,
  ledgers,
  value,
  placeholder,
  exclude,
  disabled,
  onChange,
}: {
  id: string;
  ledgers: readonly TrustLedger[];
  value: TrustLedger | null;
  placeholder?: string;
  exclude?: string | null;
  disabled?: boolean;
  onChange: (ledger: TrustLedger | null) => void;
}) {
  return (
    <select
      id={id}
      className={SELECT_CLASS}
      value={value?.id ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(ledgers.find((ledger) => ledger.id === e.target.value) ?? null)}
    >
      <option value="">{placeholder ?? COPY.chooseLedger}</option>
      {ledgers
        .filter((ledger) => ledger.id !== exclude)
        .map((ledger) => (
          <option key={ledger.id} value={ledger.id}>
            {trustLedgerOptionLabel(ledger)}
          </option>
        ))}
    </select>
  );
}
