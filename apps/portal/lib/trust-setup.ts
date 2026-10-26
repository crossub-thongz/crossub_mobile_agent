import {
  TRUST_ABA_BANK_CODE_PATTERN,
  TRUST_ABA_USER_ID_PATTERN,
  TRUST_BANK_ACCOUNT_FORM_COPY as BANK_COPY,
  TRUST_BANK_ACCOUNT_NUMBER_PATTERN,
  TRUST_BANK_ACCOUNT_STATUS,
  TRUST_BASIS_POINTS_PER_PERCENT,
  TRUST_BPAY_BILLER_PATTERN,
  TRUST_BPAY_REFERENCE_PATTERN,
  TRUST_BSB_PATTERN,
  TRUST_FEE_CALC,
  TRUST_FEE_SETTINGS_COPY as FEE_COPY,
  TRUST_PAYEE_ACCOUNT_NUMBER_PATTERN,
  TRUST_PAYOUT_COPY as PAYOUT_COPY,
  TRUST_PAYOUT_METHOD,
  TRUST_SPLIT_FULL_BASIS_POINTS,
  type TrustFeeCalc,
  type TrustFeeTrigger,
  type TrustPayoutRowMethod,
} from '@/constants/trust';
import type {
  TrustAccountSetupInput,
  TrustBankAccount,
  TrustFeeSetting,
  TrustFeeSettingInput,
  TrustPayoutMethod,
  TrustPayoutMethodRowInput,
  UpdateTrustBankAccountInput,
} from '@/lib/crossub-api/agent-trust-client';
import type { CreateTrustBankAccountInput } from '@/lib/crossub-api/agent-trust-settings-client';
import { centsToDollarsInput, parseDollarsToCents } from '@/lib/trust-accounting';

/** A form's checked output, or the first message to show. */
export type TrustFormResult<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = <T>(error: string): TrustFormResult<T> => ({ ok: false, error });
const pass = <T>(value: T): TrustFormResult<T> => ({ ok: true, value });

// --------------------------------------------------------------------------- Trust bank account

/** What the bank account form holds: every field as typed. */
export type TrustBankAccountDraft = {
  name: string;
  bankName: string;
  accountName: string;
  bsb: string;
  /** Blank keeps the stored number on an edit. */
  accountNumber: string;
  openingBalance: string;
  openingDate: string;
  abaBankCode: string;
  abaUserId: string;
  abaRemitterName: string;
  archived: boolean;
};

export function trustBankAccountDraft(account?: TrustBankAccount | null): TrustBankAccountDraft {
  return {
    name: account?.name ?? '',
    bankName: account?.bankName ?? '',
    accountName: account?.accountName ?? '',
    bsb: account?.bsb ?? '',
    accountNumber: '',
    openingBalance: centsToDollarsInput(account?.openingBalanceCents ?? 0),
    openingDate: account?.openingDate ?? '',
    abaBankCode: account?.abaBankCode ?? '',
    abaUserId: account?.abaUserId ?? '',
    abaRemitterName: account?.abaRemitterName ?? '',
    archived: account?.status === TRUST_BANK_ACCOUNT_STATUS.ARCHIVED,
  };
}

type CheckedBankAccount = {
  name: string;
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
  openingBalanceCents: number;
  openingDate: string;
  abaBankCode: string;
  abaUserId: string;
  abaRemitterName: string;
};

function checkBankAccountDraft(draft: TrustBankAccountDraft): TrustFormResult<CheckedBankAccount> {
  const name = draft.name.trim();
  if (!name) return fail(BANK_COPY.nameRequired);
  const bsb = draft.bsb.trim();
  if (bsb && !TRUST_BSB_PATTERN.test(bsb)) return fail(BANK_COPY.bsbInvalid);
  const accountNumber = draft.accountNumber.replace(/\s/g, '');
  if (accountNumber && !TRUST_BANK_ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
    return fail(BANK_COPY.accountNumberInvalid);
  }
  const openingBalanceCents = draft.openingBalance.trim() ? parseDollarsToCents(draft.openingBalance) : 0;
  if (openingBalanceCents == null) return fail(BANK_COPY.openingBalanceInvalid);
  const abaBankCode = draft.abaBankCode.trim().toUpperCase();
  if (abaBankCode && !TRUST_ABA_BANK_CODE_PATTERN.test(abaBankCode)) return fail(BANK_COPY.abaBankCodeInvalid);
  const abaUserId = draft.abaUserId.trim();
  if (abaUserId && !TRUST_ABA_USER_ID_PATTERN.test(abaUserId)) return fail(BANK_COPY.abaUserIdInvalid);
  return pass({
    name,
    bankName: draft.bankName.trim(),
    accountName: draft.accountName.trim(),
    bsb,
    accountNumber,
    openingBalanceCents,
    openingDate: draft.openingDate,
    abaBankCode,
    abaUserId,
    abaRemitterName: draft.abaRemitterName.trim(),
  });
}

/** A new trust bank account's body: the checked fields, blanks left out. */
export function trustBankAccountCreateInput(
  draft: TrustBankAccountDraft,
): TrustFormResult<CreateTrustBankAccountInput> {
  const checked = checkBankAccountDraft(draft);
  if (!checked.ok) return checked;
  const v = checked.value;
  return pass({
    name: v.name,
    bankName: v.bankName || undefined,
    accountName: v.accountName || undefined,
    bsb: v.bsb || undefined,
    accountNumber: v.accountNumber || undefined,
    openingBalanceCents: v.openingBalanceCents,
    openingDate: v.openingDate || undefined,
    abaBankCode: v.abaBankCode || undefined,
    abaUserId: v.abaUserId || undefined,
    abaRemitterName: v.abaRemitterName || undefined,
  });
}

/** The set-up body: the workspace name (when the workspace is created) and the first bank account. */
export function trustSetupInput(
  draft: TrustBankAccountDraft,
  workspaceName: string | null,
): TrustFormResult<TrustAccountSetupInput> {
  const checked = trustBankAccountCreateInput(draft);
  if (!checked.ok) return checked;
  return pass({ workspaceName: workspaceName?.trim() || undefined, ...checked.value });
}

/**
 * Only what changed: the opening pair locks once money has moved, so sending it unchanged
 * would be refused. An emptied ABA field clears it; a blank account number keeps the stored one.
 */
export function trustBankAccountUpdateInput(
  draft: TrustBankAccountDraft,
  account: TrustBankAccount,
): TrustFormResult<UpdateTrustBankAccountInput> {
  const checked = checkBankAccountDraft(draft);
  if (!checked.ok) return checked;
  const v = checked.value;
  const input: UpdateTrustBankAccountInput = {};
  if (v.name !== account.name) input.name = v.name;
  if (v.bankName !== (account.bankName ?? '')) input.bankName = v.bankName;
  if (v.accountName !== (account.accountName ?? '')) input.accountName = v.accountName;
  if (v.bsb && v.bsb.replace('-', '') !== (account.bsb ?? '')) input.bsb = v.bsb;
  if (v.accountNumber) input.accountNumber = v.accountNumber;
  if (v.openingBalanceCents !== account.openingBalanceCents) input.openingBalanceCents = v.openingBalanceCents;
  if (v.openingDate && v.openingDate !== (account.openingDate ?? '')) input.openingDate = v.openingDate;
  if (v.abaBankCode !== (account.abaBankCode ?? '')) input.abaBankCode = v.abaBankCode || null;
  if (v.abaUserId !== (account.abaUserId ?? '')) input.abaUserId = v.abaUserId || null;
  if (v.abaRemitterName !== (account.abaRemitterName ?? '')) input.abaRemitterName = v.abaRemitterName || null;
  const status = draft.archived ? TRUST_BANK_ACCOUNT_STATUS.ARCHIVED : TRUST_BANK_ACCOUNT_STATUS.ACTIVE;
  if (status !== account.status) input.status = status;
  return pass(input);
}

// --------------------------------------------------------------------------- Payout methods

/** One payout method row as typed; `id` keeps an existing row (and its stored account number). */
export type TrustPayoutRowDraft = {
  key: string;
  id: string | null;
  method: TrustPayoutRowMethod;
  payeeName: string;
  bsb: string;
  accountNumber: string;
  accountNumberMasked: string | null;
  bpayBillerCode: string;
  bpayReference: string;
  sharePercent: string;
};

export function trustPayoutRowDraft(row: TrustPayoutMethod | null, payeeName: string, sharePercent: string): TrustPayoutRowDraft {
  return {
    key: row?.id ?? crypto.randomUUID(),
    id: row?.id ?? null,
    method: row?.method ?? TRUST_PAYOUT_METHOD.EFT,
    payeeName: row?.payeeName ?? payeeName,
    bsb: row?.bsb ?? '',
    accountNumber: '',
    accountNumberMasked: row?.accountNumberMasked ?? null,
    bpayBillerCode: row?.bpayBillerCode ?? '',
    bpayReference: row?.bpayReference ?? '',
    sharePercent: row ? basisPointsToPercentInput(row.splitBasisPoints) : sharePercent,
  };
}

/** "60" for 6000 basis points, "33.33" for 3333. */
export function basisPointsToPercentInput(basisPoints: number): string {
  const percent = basisPoints / TRUST_BASIS_POINTS_PER_PERCENT;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(2);
}

/** A typed percent ("7.7", "60") as basis points, or null when it is not a number above 0. */
export function percentInputToBasisPoints(input: string): number | null {
  const value = Number(input.replace(/[\s%]/g, ''));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * TRUST_BASIS_POINTS_PER_PERCENT);
}

/** The replace-all PUT body; every row sent is active, rows left out are switched off by the API. */
export function trustPayoutRowsInput(rows: readonly TrustPayoutRowDraft[]): TrustFormResult<TrustPayoutMethodRowInput[]> {
  const out: TrustPayoutMethodRowInput[] = [];
  let total = 0;
  for (const row of rows) {
    const payeeName = row.payeeName.trim();
    if (!payeeName) return fail(PAYOUT_COPY.payeeRequired);
    const splitBasisPoints = percentInputToBasisPoints(row.sharePercent);
    if (splitBasisPoints == null) return fail(PAYOUT_COPY.shareInvalid);
    total += splitBasisPoints;
    const base: TrustPayoutMethodRowInput = {
      id: row.id ?? undefined,
      method: row.method,
      payeeName,
      splitBasisPoints,
      isActive: true,
    };
    if (row.method === TRUST_PAYOUT_METHOD.EFT) {
      const bsb = row.bsb.trim();
      if (!TRUST_BSB_PATTERN.test(bsb)) return fail(PAYOUT_COPY.bsbInvalid);
      const accountNumber = row.accountNumber.replace(/\s/g, '');
      if (accountNumber && !TRUST_PAYEE_ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
        return fail(PAYOUT_COPY.accountNumberInvalid);
      }
      if (!accountNumber && !row.accountNumberMasked) return fail(PAYOUT_COPY.accountNumberInvalid);
      out.push({ ...base, bsb, accountNumber: accountNumber || undefined });
    } else if (row.method === TRUST_PAYOUT_METHOD.BPAY) {
      const bpayBillerCode = row.bpayBillerCode.trim();
      const bpayReference = row.bpayReference.trim();
      if (!TRUST_BPAY_BILLER_PATTERN.test(bpayBillerCode)) return fail(PAYOUT_COPY.billerInvalid);
      if (!TRUST_BPAY_REFERENCE_PATTERN.test(bpayReference)) return fail(PAYOUT_COPY.referenceInvalid);
      out.push({ ...base, bpayBillerCode, bpayReference });
    } else {
      out.push(base);
    }
  }
  if (out.length > 0 && total !== TRUST_SPLIT_FULL_BASIS_POINTS) return fail(PAYOUT_COPY.shareInvalid);
  return pass(out);
}

// --------------------------------------------------------------------------- Recurring fees

/** A fee setting as typed; `id` keeps an existing setting. */
export type TrustFeeSettingDraft = {
  id: string | null;
  name: string;
  trigger: TrustFeeTrigger;
  calc: TrustFeeCalc;
  amount: string;
  ratePercent: string;
  gstInclusive: boolean;
  accountCodeId: string;
  isActive: boolean;
};

export function trustFeeSettingDraft(
  setting: TrustFeeSetting | null,
  defaults: { trigger: TrustFeeTrigger; name: string; accountCodeId: string },
): TrustFeeSettingDraft {
  return {
    id: setting?.id ?? null,
    name: setting?.name ?? defaults.name,
    trigger: setting?.trigger ?? defaults.trigger,
    calc: setting?.calc ?? TRUST_FEE_CALC.PERCENT,
    amount: centsToDollarsInput(setting?.amountCents),
    ratePercent: setting?.rateBasisPoints != null ? basisPointsToPercentInput(setting.rateBasisPoints) : '',
    gstInclusive: setting?.gstInclusive ?? true,
    accountCodeId: setting?.accountCode.id ?? defaults.accountCodeId,
    isActive: setting?.isActive ?? true,
  };
}

/** A saved setting as the replace-all PUT sends it back unchanged. */
export function trustFeeSettingInputOf(setting: TrustFeeSetting): TrustFeeSettingInput {
  return {
    id: setting.id,
    trigger: setting.trigger,
    name: setting.name,
    calc: setting.calc,
    amountCents: setting.amountCents ?? null,
    rateBasisPoints: setting.rateBasisPoints ?? null,
    gstInclusive: setting.gstInclusive,
    accountCodeId: setting.accountCode.id,
    isActive: setting.isActive,
  };
}

export function trustFeeSettingInput(draft: TrustFeeSettingDraft): TrustFormResult<TrustFeeSettingInput> {
  const name = draft.name.trim();
  if (!name || !draft.accountCodeId) return fail(FEE_COPY.incomplete);
  const base = {
    id: draft.id ?? undefined,
    trigger: draft.trigger,
    name,
    calc: draft.calc,
    gstInclusive: draft.gstInclusive,
    accountCodeId: draft.accountCodeId,
    isActive: draft.isActive,
  };
  if (draft.calc === TRUST_FEE_CALC.FIXED) {
    const amountCents = parseDollarsToCents(draft.amount);
    if (amountCents == null || amountCents <= 0) return fail(FEE_COPY.incomplete);
    return pass({ ...base, amountCents, rateBasisPoints: null });
  }
  const rateBasisPoints = percentInputToBasisPoints(draft.ratePercent);
  if (rateBasisPoints == null) return fail(FEE_COPY.rateInvalid);
  return pass({ ...base, amountCents: null, rateBasisPoints });
}
