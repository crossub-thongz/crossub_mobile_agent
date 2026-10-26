import {
  TRUST_BPAY_BILLER_PATTERN,
  TRUST_BPAY_REFERENCE_PATTERN,
  TRUST_BSB_PATTERN,
  TRUST_PAYEE_ACCOUNT_NUMBER_PATTERN,
  TRUST_SPLIT_FULL_BASIS_POINTS,
} from '@/constants/trust';
import {
  TRUST_FOLIO_WITHDRAWAL_COPY as WITHDRAWAL_COPY,
  TRUST_NEW_TRANSACTION_COPY as COPY,
  TRUST_REFUSED_STATUS,
  TRUST_TRANSACTION_LIMITS as LIMITS,
  TRUST_WITHDRAWAL_METHOD,
  type TrustWithdrawalMethod,
} from '@/constants/trust-transactions';
import { ApiError } from '@/lib/api';
import type { TrustLedger, TrustPayoutMethod, TrustPayoutMethods } from '@/lib/crossub-api/agent-trust-client';
import type { TrustManualWithdrawalInput } from '@/lib/crossub-api/agent-trust-transactions-client';
import { newTrustIdempotencyKey, parseDollarsToCents, trustTodayKey } from '@/lib/trust-accounting';
import type { TrustFormResult } from '@/lib/trust-setup';

const fail = <T>(error: string): TrustFormResult<T> => ({ ok: false, error });
const pass = <T>(value: T): TrustFormResult<T> => ({ ok: true, value });

/**
 * The idempotency key for the next try after a failed post: a fresh one only when the API refused
 * it with a 4xx (nothing was posted, so a corrected form must not replay the refused one); the
 * same one after a 5xx, the BFF's 502 or a network failure, where the post may have committed and
 * only its answer was lost (a retry must replay it, not post twice).
 */
export function trustIdempotencyKeyAfterError(err: unknown, current: string): string {
  const refused =
    err instanceof ApiError &&
    err.status >= TRUST_REFUSED_STATUS.min &&
    err.status < TRUST_REFUSED_STATUS.maxExclusive;
  return refused ? newTrustIdempotencyKey() : current;
}

/** A ledger as one picker option: "OWN00001 · Jo Owner · 1 Main St". */
export function trustLedgerOptionLabel(ledger: TrustLedger): string {
  return [ledger.code, ledger.name, ledger.propertyReferenceAddress].filter(Boolean).join(' · ');
}

/** The typed amount and optional GST as cents: the amount above $0, the GST no more than it. */
export function trustAmountWithGst(
  amount: string,
  gst: string,
): TrustFormResult<{ amountCents: number; gstCents: number | undefined }> {
  const amountCents = parseDollarsToCents(amount);
  if (amountCents == null || amountCents <= 0) return fail(COPY.amountInvalid);
  if (!gst.trim()) return pass({ amountCents, gstCents: undefined });
  const gstCents = parseDollarsToCents(gst);
  if (gstCents == null || gstCents > amountCents) return fail(COPY.gstInvalid);
  return pass({ amountCents, gstCents: gstCents > 0 ? gstCents : undefined });
}

/** A posting date: set, and not after today in Sydney (the API refuses a future date). */
export function trustPostingDate(date: string): TrustFormResult<string> {
  if (!date) return fail(COPY.dateRequired);
  if (date > trustTodayKey()) return fail(COPY.dateFuture);
  return pass(date);
}

/** A required text field, trimmed and within the API's length. */
export function trustRequiredText(value: string, field: string, max: number, missing: string): TrustFormResult<string> {
  const text = value.trim();
  if (!text) return fail(missing);
  if (text.length > max) return fail(COPY.tooLong(field, max));
  return pass(text);
}

/** An optional text field, trimmed (undefined when empty) and within the API's length. */
export function trustOptionalText(value: string, field: string, max: number): TrustFormResult<string | undefined> {
  const text = value.trim();
  if (text.length > max) return fail(COPY.tooLong(field, max));
  return pass(text || undefined);
}

/**
 * The ledger's one saved payout method that takes 100%, which a withdrawal can pay to without
 * retyping the details (the API keeps the account number); null when it has none or a split.
 */
export function trustSoleSavedPayoutMethod(methods: TrustPayoutMethods | null): TrustPayoutMethod | null {
  const active = methods?.rows.filter((row) => row.isActive) ?? [];
  const only = active.length === 1 ? active[0] : null;
  return only && only.splitBasisPoints === TRUST_SPLIT_FULL_BASIS_POINTS ? only : null;
}

/** The saved method's identifying detail for the "pay to saved details" line. */
export function trustPayoutMethodDetail(method: TrustPayoutMethod): string | null {
  if (method.method === TRUST_WITHDRAWAL_METHOD.EFT) {
    return [method.bsb, method.accountNumberMasked].filter(Boolean).join(' ') || null;
  }
  if (method.method === TRUST_WITHDRAWAL_METHOD.BPAY) {
    return [method.bpayBillerCode, method.bpayReference].filter(Boolean).join(' / ') || null;
  }
  return null;
}

/** What the withdrawal form holds, every field as typed. */
export type TrustWithdrawalDraft = {
  idempotencyKey: string;
  ledger: TrustLedger | null;
  accountCodeId: string;
  date: string;
  /** Pay to this saved payout method; its own method and details are used. */
  savedMethod: TrustPayoutMethod | null;
  payeeName: string;
  method: TrustWithdrawalMethod;
  bsb: string;
  accountNumber: string;
  bpayBillerCode: string;
  bpayReference: string;
  chequeNumber: string;
  amount: string;
  gst: string;
  note: string;
};

/** The manual withdrawal body, or the first message to show. */
export function trustManualWithdrawalInput(draft: TrustWithdrawalDraft): TrustFormResult<TrustManualWithdrawalInput> {
  if (!draft.ledger) return fail(COPY.ledgerRequired);
  const date = trustPostingDate(draft.date);
  if (!date.ok) return date;
  const money = trustAmountWithGst(draft.amount, draft.gst);
  if (!money.ok) return money;
  const note = trustOptionalText(draft.note, COPY.field.note, LIMITS.detailsMax);
  if (!note.ok) return note;

  const base: TrustManualWithdrawalInput = {
    idempotencyKey: draft.idempotencyKey,
    ledgerId: draft.ledger.id,
    accountCodeId: draft.accountCodeId || undefined,
    effectiveDate: date.value,
    amountCents: money.value.amountCents,
    gstCents: money.value.gstCents,
    note: note.value,
  };
  const method = draft.savedMethod?.method ?? draft.method;
  const cheque = (): TrustFormResult<string> =>
    trustRequiredText(draft.chequeNumber, COPY.field.chequeNumber, LIMITS.chequeNumberMax, WITHDRAWAL_COPY.chequeRequired);

  if (draft.savedMethod) {
    // The saved method's payee, method and details are used; a cheque still needs its number.
    if (method !== TRUST_WITHDRAWAL_METHOD.CHEQUE) return pass({ ...base, payoutMethodId: draft.savedMethod.id });
    const number = cheque();
    if (!number.ok) return number;
    return pass({ ...base, payoutMethodId: draft.savedMethod.id, chequeNumber: number.value });
  }

  const payee = trustRequiredText(draft.payeeName, COPY.field.payee, LIMITS.payeeNameMax, WITHDRAWAL_COPY.payeeRequired);
  if (!payee.ok) return payee;
  const typed = { ...base, payeeName: payee.value, method };
  if (method === TRUST_WITHDRAWAL_METHOD.EFT) {
    const bsb = draft.bsb.trim();
    if (!TRUST_BSB_PATTERN.test(bsb)) return fail(WITHDRAWAL_COPY.bsbInvalid);
    const accountNumber = draft.accountNumber.replace(/\s/g, '');
    if (!TRUST_PAYEE_ACCOUNT_NUMBER_PATTERN.test(accountNumber)) return fail(WITHDRAWAL_COPY.accountNumberInvalid);
    return pass({ ...typed, bsb, accountNumber });
  }
  if (method === TRUST_WITHDRAWAL_METHOD.BPAY) {
    const bpayBillerCode = draft.bpayBillerCode.trim();
    const bpayReference = draft.bpayReference.trim();
    if (!TRUST_BPAY_BILLER_PATTERN.test(bpayBillerCode)) return fail(WITHDRAWAL_COPY.billerInvalid);
    if (!TRUST_BPAY_REFERENCE_PATTERN.test(bpayReference)) return fail(WITHDRAWAL_COPY.referenceInvalid);
    return pass({ ...typed, bpayBillerCode, bpayReference });
  }
  const number = cheque();
  if (!number.ok) return number;
  return pass({ ...typed, chequeNumber: number.value });
}
