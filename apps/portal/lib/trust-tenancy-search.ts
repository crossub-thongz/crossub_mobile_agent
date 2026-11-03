import { TRUST_LEDGER_KIND, TRUST_PAGE_SIZE_MAX } from '@/constants/trust';
import {
  fetchTrustLedgers,
  fetchTrustRentList,
  type TrustLedger,
  type TrustRentRow,
} from '@/lib/crossub-api/agent-trust-client';

/** A tenant ledger the receipt dialog can search and then receipt against. */
export type ReceiptTenancy = {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  propertyAddress: string | null;
  propertyReferenceAddress: string | null;
  paymentReference: string | null;
  hasRentProfile: boolean;
  rentAmountCents: number | null;
  rentPeriod: string | null;
  paidToDate: string | null;
  effectivePaidToDate: string | null;
  arrearsDays: number | null;
};

const PAGE_CAP = 10;

async function eachPage<T>(load: (page: number) => Promise<{ items: T[]; total: number }>): Promise<T[]> {
  const items: T[] = [];
  let total = Number.POSITIVE_INFINITY;
  for (let page = 1; page <= PAGE_CAP && items.length < total; page += 1) {
    const result = await load(page);
    const batch = result.items ?? [];
    items.push(...batch);
    total = typeof result.total === 'number' ? result.total : items.length;
    if (batch.length === 0) break;
  }
  return items;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Rent rows joined with each ledger's payment reference, so the receipt search can match it. */
export async function loadReceiptTenancies(agencyId: string, bankAccountId: string): Promise<ReceiptTenancy[]> {
  const [rows, ledgers] = await Promise.all([
    eachPage((page) =>
      fetchTrustRentList(agencyId, bankAccountId, { page, pageSize: TRUST_PAGE_SIZE_MAX }),
    ),
    eachPage((page) =>
      fetchTrustLedgers(agencyId, bankAccountId, {
        page,
        pageSize: TRUST_PAGE_SIZE_MAX,
        kind: TRUST_LEDGER_KIND.TENANT,
      }),
    ),
  ]);
  const paymentByLedger = new Map<string, string | null>();
  for (const ledger of ledgers as TrustLedger[]) {
    paymentByLedger.set(ledger.id, text(ledger.paymentReference));
  }
  return (rows as TrustRentRow[]).map((row) => ({
    ledgerId: row.ledgerId,
    ledgerCode: row.ledgerCode ?? '',
    ledgerName: row.ledgerName ?? '',
    propertyAddress: text(row.propertyAddress),
    propertyReferenceAddress: text(row.propertyReferenceAddress),
    paymentReference: paymentByLedger.get(row.ledgerId) ?? null,
    hasRentProfile: Boolean(row.hasRentProfile),
    rentAmountCents: typeof row.rentAmountCents === 'number' ? row.rentAmountCents : null,
    rentPeriod: text(row.rentPeriod),
    paidToDate: text(row.paidToDate),
    effectivePaidToDate: text(row.effectivePaidToDate),
    arrearsDays: typeof row.arrearsDays === 'number' ? row.arrearsDays : null,
  }));
}

/** A rent row or a bank-line suggestion, shaped into the tenancy the receipt dialog stores. */
export function toReceiptTenancy(
  row: {
    ledgerId?: string | null;
    ledgerCode?: string | null;
    ledgerName?: string | null;
    propertyAddress?: string | null;
    propertyReferenceAddress?: string | null;
    paymentReference?: string | null;
    hasRentProfile?: boolean | null;
    rentAmountCents?: number | null;
    rentPeriod?: string | null;
    paidToDate?: string | null;
    effectivePaidToDate?: string | null;
    arrearsDays?: number | null;
  } | null,
): ReceiptTenancy | null {
  if (!row?.ledgerId) return null;
  return {
    ledgerId: row.ledgerId,
    ledgerCode: row.ledgerCode ?? '',
    ledgerName: row.ledgerName ?? '',
    propertyAddress: text(row.propertyAddress),
    propertyReferenceAddress: text(row.propertyReferenceAddress),
    paymentReference: text(row.paymentReference),
    hasRentProfile: Boolean(row.hasRentProfile),
    rentAmountCents: typeof row.rentAmountCents === 'number' ? row.rentAmountCents : null,
    rentPeriod: text(row.rentPeriod),
    paidToDate: text(row.paidToDate),
    effectivePaidToDate: text(row.effectivePaidToDate),
    arrearsDays: typeof row.arrearsDays === 'number' ? row.arrearsDays : null,
  };
}

/** Address, tenant name, folio code, or the payment reference the tenant quotes. */
export function filterReceiptTenancies(tenancies: readonly ReceiptTenancy[], query: string): ReceiptTenancy[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return tenancies.filter((tenancy) =>
    [
      tenancy.ledgerName,
      tenancy.ledgerCode,
      tenancy.propertyAddress,
      tenancy.propertyReferenceAddress,
      tenancy.paymentReference,
    ].some((value) => value?.toLowerCase().includes(needle)),
  );
}
