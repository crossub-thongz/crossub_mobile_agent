import { PROPERTY_TIME_ZONE } from '@/constants/time-zone';
import {
  TRUST_ACCOUNT_CODE_KIND,
  TRUST_NOT_SET_UP_MARKER,
  TRUST_PERIOD_REPORT_KINDS,
  TRUST_TRANSACTION_DISPLAY_STATUS,
  type TrustLedgerFileFormat,
  type TrustReportKind,
} from '@/constants/trust';
import { ApiError } from '@/lib/api';
import type {
  TrustAccountCode,
  TrustBankFileLine,
  TrustBankLineInput,
  TrustReportQuery,
  TrustTransaction,
} from '@/lib/crossub-api/agent-trust-client';
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

/** Integer cents as a plain dollars value for an input ("1250.00"); empty for null. */
export function centsToDollarsInput(cents: number | null | undefined): string {
  return cents == null ? '' : (cents / 100).toFixed(2);
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

function activeCodesOfKind(
  codes: readonly TrustAccountCode[],
  kind: TrustAccountCode['kind'],
): TrustAccountCode[] {
  return codes
    .filter((code) => code.isActive && code.kind === kind)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** The active EXPENSE codes a bill can be filed under, by code. */
export function billCategoryCodes(codes: readonly TrustAccountCode[]): TrustAccountCode[] {
  return activeCodesOfKind(codes, TRUST_ACCOUNT_CODE_KIND.EXPENSE);
}

/** The active INCOME codes a one-off fee can be charged under, by code. */
export function feeCategoryCodes(codes: readonly TrustAccountCode[]): TrustAccountCode[] {
  return activeCodesOfKind(codes, TRUST_ACCOUNT_CODE_KIND.INCOME);
}

/** Download name for a folio ledger file ("trust-ledger-own00001-2026-10-19.pdf"). */
export function trustLedgerFilename(ledgerCode: string, format: TrustLedgerFileFormat): string {
  return `trust-ledger-${ledgerCode.toLowerCase()}-${trustTodayKey()}.${format}`;
}

/** Download name for a report CSV, named for the report and its dates. */
export function trustReportFilename(kind: TrustReportKind, query: TrustReportQuery): string {
  const dates = isTrustPeriodReport(kind)
    ? [query.from, query.to]
    : [query.asOf ?? trustTodayKey()];
  return `trust-${kind}-${dates.filter(Boolean).join('-')}.csv`;
}

/** True for the reports that cover a period (from and to) rather than one as-at date. */
export function isTrustPeriodReport(kind: TrustReportKind): boolean {
  return TRUST_PERIOD_REPORT_KINDS.includes(kind);
}

/** A YYYY-MM-DD key moved by `days` (negative goes back). */
export function shiftTrustDateKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The first day of the month `key` (YYYY-MM-DD) falls in. */
export function trustMonthStartKey(key: string): string {
  return `${key.slice(0, 8)}01`;
}

/** A bank line exactly as the read returned it, to send back with a reconcile call (D98). */
export function trustBankLineInput(line: TrustBankFileLine): TrustBankLineInput {
  return {
    lineDate: line.lineDate,
    memo: line.memo,
    amountCents: line.amountCents,
    reference: line.reference ?? null,
    ordinal: line.ordinal,
  };
}

/** A posted original (not a reversal): what may be reversed or matched to a bank line. */
export function isPostedOriginalTrustTransaction(transaction: TrustTransaction): boolean {
  return (
    transaction.displayStatus === TRUST_TRANSACTION_DISPLAY_STATUS.POSTED && !transaction.isReversal
  );
}
