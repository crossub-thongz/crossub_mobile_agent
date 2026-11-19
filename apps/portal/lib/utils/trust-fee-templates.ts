import {
  TRUST_FEE_ASSIGNMENTS_COPY as ASSIGN_COPY,
  TRUST_FEE_CALC,
  TRUST_FEE_RECURRING_FREQUENCY,
  TRUST_FEE_TEMPLATE_RULES,
  TRUST_FEE_TEMPLATES_COPY as TEMPLATE_COPY,
  TRUST_FEE_TRIGGER,
  TRUST_FEE_TRIGGER_LABEL,
  type TrustFeeCalc,
  type TrustFeeRecurringFrequency,
  type TrustFeeScope,
  type TrustFeeTaxCode,
  type TrustFeeTrigger,
} from '@/constants/trust';
import { ApiError } from '@/lib/api';
import type {
  TrustFeeAssignment,
  TrustFeeAssignmentVersion,
  TrustFeeTemplate,
  TrustFeeTemplateRuleInput,
  UpdateTrustFeeTemplateInput,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, parseDollarsToCents } from '@/lib/trust-accounting';
import { basisPointsToPercentInput, percentInputToBasisPoints, type TrustFormResult } from '@/lib/trust-setup';

/**
 * Fee templates and their assignments on an owner folio (PRD Step 4, D148–D152). Pure helpers, no
 * React: the form drafts, what the API accepts, and how a fee reads in a list.
 */

const fail = <T>(error: string): TrustFormResult<T> => ({ ok: false, error });
const pass = <T>(value: T): TrustFormResult<T> => ({ ok: true, value });

// --------------------------------------------------------------------------- Templates

export type TrustFeeTemplateDraft = {
  name: string;
  scope: TrustFeeScope;
  trigger: TrustFeeTrigger;
  calc: TrustFeeCalc;
  taxCode: TrustFeeTaxCode;
  recurringFrequency: TrustFeeRecurringFrequency;
  accountCodeId: string;
};

export function allowedFeeCalcs(trigger: TrustFeeTrigger): readonly TrustFeeCalc[] {
  return TRUST_FEE_TEMPLATE_RULES[trigger]?.calcs ?? [];
}

export function allowedFeeScopes(trigger: TrustFeeTrigger): readonly TrustFeeScope[] {
  return TRUST_FEE_TEMPLATE_RULES[trigger]?.scopes ?? [];
}

/** After a trigger change, keep the calculation and scope only when the trigger still takes them. */
export function fitTemplateDraft(draft: TrustFeeTemplateDraft): TrustFeeTemplateDraft {
  const calcs = allowedFeeCalcs(draft.trigger);
  const scopes = allowedFeeScopes(draft.trigger);
  return {
    ...draft,
    calc: calcs.includes(draft.calc) ? draft.calc : (calcs[0] ?? draft.calc),
    scope: scopes.includes(draft.scope) ? draft.scope : (scopes[0] ?? draft.scope),
  };
}

export function trustFeeTemplateDraft(
  template: TrustFeeTemplate | null,
  defaults: { name: string; accountCodeId: string; scope: TrustFeeScope; taxCode: TrustFeeTaxCode },
): TrustFeeTemplateDraft {
  if (template) {
    return {
      name: template.name,
      scope: template.scope,
      trigger: template.trigger,
      calc: template.calc,
      taxCode: template.taxCode,
      recurringFrequency: template.recurringFrequency ?? TRUST_FEE_RECURRING_FREQUENCY.MONTHLY,
      accountCodeId: template.accountCode.id,
    };
  }
  return fitTemplateDraft({
    name: defaults.name,
    scope: defaults.scope,
    trigger: TRUST_FEE_TRIGGER.EVERY_RENT_RECEIPT,
    calc: TRUST_FEE_CALC.PERCENT,
    taxCode: defaults.taxCode,
    recurringFrequency: TRUST_FEE_RECURRING_FREQUENCY.MONTHLY,
    accountCodeId: defaults.accountCodeId,
  });
}

/** A new template's body. */
export function trustFeeTemplateInput(draft: TrustFeeTemplateDraft): TrustFormResult<TrustFeeTemplateRuleInput> {
  const name = draft.name.trim();
  if (!name || !draft.accountCodeId) return fail(TEMPLATE_COPY.incomplete);
  if (!allowedFeeCalcs(draft.trigger).includes(draft.calc) || !allowedFeeScopes(draft.trigger).includes(draft.scope)) {
    return fail(TEMPLATE_COPY.incomplete);
  }
  return pass({
    name,
    scope: draft.scope,
    trigger: draft.trigger,
    calc: draft.calc,
    taxCode: draft.taxCode,
    recurringFrequency: draft.trigger === TRUST_FEE_TRIGGER.RECURRING ? draft.recurringFrequency : null,
    accountCodeId: draft.accountCodeId,
  });
}

/** An edit's body: a locked template sends only its name and category. */
export function trustFeeTemplateUpdate(
  draft: TrustFeeTemplateDraft,
  locked: boolean,
): TrustFormResult<UpdateTrustFeeTemplateInput> {
  const checked = trustFeeTemplateInput(draft);
  if (!checked.ok) return checked;
  return locked ? pass({ name: checked.value.name, accountCodeId: checked.value.accountCodeId }) : checked;
}

// --------------------------------------------------------------------------- Assignments

/** "$110.00" for a fixed fee, "5.5%" for a rate. */
export function feeVersionValue(calc: TrustFeeCalc, version: Pick<TrustFeeAssignmentVersion, 'amountCents' | 'rateBasisPoints'>): string {
  return calc === TRUST_FEE_CALC.FIXED
    ? formatCents(version.amountCents ?? 0)
    : `${basisPointsToPercentInput(version.rateBasisPoints ?? 0)}%`;
}

/** The fee's line under its name: what it is now and when it is charged. */
export function describeFeeAssignment(assignment: TrustFeeAssignment): string {
  const { template, current } = assignment;
  const trigger = TRUST_FEE_TRIGGER_LABEL[template.trigger];
  if (!current) return `${ASSIGN_COPY.notInForce} · ${trigger}`;
  return template.calc === TRUST_FEE_CALC.FIXED
    ? ASSIGN_COPY.describeFixed(formatCents(current.amountCents ?? 0), trigger)
    : ASSIGN_COPY.describePercent(basisPointsToPercentInput(current.rateBasisPoints ?? 0), template.percentBase ?? null, trigger);
}

/** One history line. */
export function describeFeeVersion(calc: TrustFeeCalc, version: TrustFeeAssignmentVersion): string {
  return ASSIGN_COPY.version(formatTrustDate(version.effectiveFrom), feeVersionValue(calc, version), version.enabled);
}

export type TrustFeeAmountDraft = { amount: string; ratePercent: string; effectiveFrom: string };

export function trustFeeAmountDraft(calc: TrustFeeCalc, version: TrustFeeAssignmentVersion | null, todayKey: string): TrustFeeAmountDraft {
  return {
    amount: calc === TRUST_FEE_CALC.FIXED && version?.amountCents ? (version.amountCents / 100).toFixed(2) : '',
    ratePercent: calc === TRUST_FEE_CALC.PERCENT && version?.rateBasisPoints ? basisPointsToPercentInput(version.rateBasisPoints) : '',
    effectiveFrom: todayKey,
  };
}

/** The amount or rate fields the API wants for the template's calculation. */
export function trustFeeAmountInput(
  calc: TrustFeeCalc,
  draft: TrustFeeAmountDraft,
): TrustFormResult<{ effectiveFrom: string; amountCents: number | null; rateBasisPoints: number | null }> {
  if (!draft.effectiveFrom) return fail(ASSIGN_COPY.incomplete);
  if (calc === TRUST_FEE_CALC.FIXED) {
    const amountCents = parseDollarsToCents(draft.amount);
    if (amountCents == null || amountCents <= 0) return fail(ASSIGN_COPY.incomplete);
    return pass({ effectiveFrom: draft.effectiveFrom, amountCents, rateBasisPoints: null });
  }
  const rateBasisPoints = percentInputToBasisPoints(draft.ratePercent);
  if (rateBasisPoints == null) return fail(ASSIGN_COPY.rateInvalid);
  return pass({ effectiveFrom: draft.effectiveFrom, amountCents: null, rateBasisPoints });
}

/** The MANUAL fees switched on today, for the "Charge a fee" picker. */
export function manualFeeOptions(assignments: readonly TrustFeeAssignment[]): TrustFeeAssignment[] {
  return assignments.filter(
    (assignment) => assignment.template.trigger === TRUST_FEE_TRIGGER.MANUAL && assignment.current?.enabled === true,
  );
}

/** True when a manual fee was refused as charged already this month (409 with `duplicateChargeIds`). */
export function isDuplicateFeeError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 409) return false;
  const body = err.body;
  if (!body || typeof body !== 'object' || !('duplicateChargeIds' in body)) return false;
  const ids = (body as { duplicateChargeIds?: unknown }).duplicateChargeIds;
  return Array.isArray(ids) && ids.length > 0;
}
