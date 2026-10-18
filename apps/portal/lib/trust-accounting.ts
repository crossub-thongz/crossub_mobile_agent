import { PROPERTY_TIME_ZONE } from '@/constants/time-zone';
import { TRUST_NOT_SET_UP_MARKER } from '@/constants/trust';
import { ApiError } from '@/lib/api';
import type { TrustAccountCodeRef, TrustBill } from '@/lib/crossub-api/agent-trust-client';
import { formatAgreementDate } from '@/lib/format-datetime';
import { formatCurrency } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

const DOLLARS_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/** Integer cents as dollars ("$1,250.00", "-$38.50"); "—" for null. */
export function formatCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return formatCurrency(null);
  if (cents < 0) return `-${formatCurrency(-cents / 100)}`;
  return formatCurrency(cents / 100);
}

/**
 * A typed dollars value ("1,250.5", "$38") as integer cents, or null when it is not a valid
 * amount. Negatives only when `allowNegative` (a bank balance may be overdrawn).
 */
export function parseDollarsToCents(input: string, allowNegative = false): number | null {
  const cleaned = input.replace(/[\s$,]/g, '');
  if (!DOLLARS_PATTERN.test(cleaned)) return null;
  const negative = cleaned.startsWith('-');
  if (negative && !allowNegative) return null;
  const [whole, frac = ''] = cleaned.replace('-', '').split('.');
  const cents = Number(whole) * 100 + Number(`${frac}00`.slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/** Today in Sydney as YYYY-MM-DD — the API refuses trust postings dated after it. */
export function trustTodayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PROPERTY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** A YYYY-MM-DD trust date for display ("30 Sep 2026"); "—" when absent. */
export function formatTrustDate(value: string | null | undefined): string {
  return value ? formatAgreementDate(value) : '—';
}

/** A fresh idempotency key for a trust posting (one per open dialog). */
export function newTrustIdempotencyKey(): string {
  return crypto.randomUUID();
}

/** True when the API says CROSSUB has not created this agency's trust workspace yet. */
export function isTrustNotSetUpError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 404 &&
    apiErrorMessage(err).toLowerCase().includes(TRUST_NOT_SET_UP_MARKER)
  );
}

/** Download name for an owner statement PDF. */
export function trustStatementFilename(ledgerCode: string, statementNumber: number): string {
  return `statement-${ledgerCode.toLowerCase()}-${statementNumber}.pdf`;
}

/**
 * The expense categories (account codes) seen on earlier bills, by code. The agent facade has no
 * account-code list, so the New bill picker offers the categories the agency already bills to.
 */
export function billAccountCodes(bills: readonly TrustBill[]): TrustAccountCodeRef[] {
  const byId = new Map<string, TrustAccountCodeRef>();
  for (const bill of bills) byId.set(bill.accountCode.id, bill.accountCode);
  return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code));
}
