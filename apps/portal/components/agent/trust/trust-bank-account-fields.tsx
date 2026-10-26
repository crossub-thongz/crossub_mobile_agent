'use client';

import type { ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_BANK_ACCOUNT_FORM_COPY as COPY,
  TRUST_INPUT_LIMITS,
  TRUST_SETUP_COPY,
} from '@/constants/trust';
import type { TrustBankAccountDraft } from '@/lib/trust-setup';

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="pt-1">
      <p className="text-sm font-semibold">{title}</p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

/**
 * The trust bank account fields, shared by the set-up form and the edit dialog. Once money has
 * moved (`hasTransactions`) the opening pair carries the lock hint; the API decides, since a
 * reversed take-on leaves it editable. A stored account number shows its last four digits and
 * stays when the field is left blank.
 */
export function TrustBankAccountFields({
  draft,
  onChange,
  disabled,
  storedLast4,
  hasTransactions,
  idPrefix,
}: {
  draft: TrustBankAccountDraft;
  onChange: (next: TrustBankAccountDraft) => void;
  disabled: boolean;
  storedLast4?: string | null;
  hasTransactions?: boolean;
  idPrefix: string;
}) {
  const set = <K extends keyof TrustBankAccountDraft>(key: K, value: TrustBankAccountDraft[K]) =>
    onChange({ ...draft, [key]: value });
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-3">
      <SectionLabel title={TRUST_SETUP_COPY.bankSection} />
      <Field id={id('name')} label={COPY.name}>
        <Input
          id={id('name')}
          value={draft.name}
          placeholder={COPY.namePlaceholder}
          maxLength={TRUST_INPUT_LIMITS.bankAccountNameMax}
          disabled={disabled}
          onChange={(e) => set('name', e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={id('bank')} label={COPY.bankName}>
          <Input
            id={id('bank')}
            value={draft.bankName}
            maxLength={TRUST_INPUT_LIMITS.bankNameMax}
            disabled={disabled}
            onChange={(e) => set('bankName', e.target.value)}
          />
        </Field>
        <Field id={id('account-name')} label={COPY.accountName}>
          <Input
            id={id('account-name')}
            value={draft.accountName}
            maxLength={TRUST_INPUT_LIMITS.accountNameMax}
            disabled={disabled}
            onChange={(e) => set('accountName', e.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={id('bsb')} label={COPY.bsb}>
          <Input
            id={id('bsb')}
            inputMode="numeric"
            value={draft.bsb}
            placeholder="062-000"
            disabled={disabled}
            onChange={(e) => set('bsb', e.target.value)}
          />
        </Field>
        <Field
          id={id('account-number')}
          label={COPY.accountNumber}
          hint={storedLast4 ? COPY.accountNumberKeep(storedLast4) : undefined}
        >
          <Input
            id={id('account-number')}
            inputMode="numeric"
            autoComplete="off"
            value={draft.accountNumber}
            placeholder={storedLast4 ? `…${storedLast4}` : undefined}
            disabled={disabled}
            onChange={(e) => set('accountNumber', e.target.value)}
          />
        </Field>
      </div>

      <SectionLabel
        title={TRUST_SETUP_COPY.openingSection}
        hint={hasTransactions ? COPY.openingLocked : TRUST_SETUP_COPY.openingHint}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={id('opening-balance')} label={COPY.openingBalance}>
          <Input
            id={id('opening-balance')}
            inputMode="decimal"
            value={draft.openingBalance}
            placeholder="0.00"
            disabled={disabled}
            onChange={(e) => set('openingBalance', e.target.value)}
          />
        </Field>
        <Field id={id('opening-date')} label={COPY.openingDate}>
          <Input
            id={id('opening-date')}
            type="date"
            value={draft.openingDate}
            disabled={disabled}
            onChange={(e) => set('openingDate', e.target.value)}
          />
        </Field>
      </div>

      <SectionLabel title={TRUST_SETUP_COPY.abaSection} hint={TRUST_SETUP_COPY.abaHint} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={id('aba-bank-code')} label={COPY.abaBankCode} hint={COPY.abaBankCodeHint}>
          <Input
            id={id('aba-bank-code')}
            value={draft.abaBankCode}
            maxLength={TRUST_INPUT_LIMITS.abaBankCodeLength}
            disabled={disabled}
            onChange={(e) => set('abaBankCode', e.target.value.toUpperCase())}
          />
        </Field>
        <Field id={id('aba-user-id')} label={COPY.abaUserId} hint={COPY.abaUserIdHint}>
          <Input
            id={id('aba-user-id')}
            inputMode="numeric"
            value={draft.abaUserId}
            maxLength={TRUST_INPUT_LIMITS.abaUserIdLength}
            disabled={disabled}
            onChange={(e) => set('abaUserId', e.target.value)}
          />
        </Field>
        <Field id={id('aba-remitter')} label={COPY.abaRemitter} hint={COPY.abaRemitterHint}>
          <Input
            id={id('aba-remitter')}
            value={draft.abaRemitterName}
            maxLength={TRUST_INPUT_LIMITS.abaRemitterNameMax}
            disabled={disabled}
            onChange={(e) => set('abaRemitterName', e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}
