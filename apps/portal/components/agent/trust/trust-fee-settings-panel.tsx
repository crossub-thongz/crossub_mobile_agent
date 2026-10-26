'use client';

import { Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustLoadError, TrustLoading, TrustPanel } from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_FEE_CALC,
  TRUST_FEE_CALC_LABEL,
  TRUST_FEE_SETTINGS_COPY as COPY,
  TRUST_FEE_TRIGGER,
  TRUST_FEE_TRIGGER_LABEL,
  TRUST_FEE_TRIGGERS,
  TRUST_INPUT_LIMITS,
  TRUST_NEW_FEE_COPY,
  type TrustFeeCalc,
  type TrustFeeTrigger,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustFeeSettings,
  putTrustFeeSettings,
  type TrustAccountCode,
  type TrustFeeSetting,
} from '@/lib/crossub-api/agent-trust-client';
import { feeCategoryCodes, formatCents } from '@/lib/trust-accounting';
import {
  basisPointsToPercentInput,
  trustFeeSettingDraft,
  trustFeeSettingInput,
  trustFeeSettingInputOf,
  type TrustFeeSettingDraft,
} from '@/lib/trust-setup';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** The fee dialog: closed, adding, or editing one saved setting. */
type FeeDialog = { open: false } | { open: true; setting: TrustFeeSetting | null };

function describe(setting: TrustFeeSetting): string {
  const trigger = TRUST_FEE_TRIGGER_LABEL[setting.trigger];
  return setting.calc === TRUST_FEE_CALC.FIXED
    ? COPY.describeFixed(formatCents(setting.amountCents), trigger)
    : COPY.describePercent(basisPointsToPercentInput(setting.rateBasisPoints ?? 0), trigger);
}

/**
 * An owner ledger's recurring fees (the management fee and the like). The API replaces the whole
 * list, so every save sends the saved settings back with the one changed.
 */
export function TrustFeeSettingsPanel({
  agencyId,
  ledgerId,
  accountCodes,
}: {
  agencyId: string;
  ledgerId: string;
  accountCodes: readonly TrustAccountCode[];
}) {
  const settings = useTrustResource(`${agencyId}:${ledgerId}:fee-settings`, () =>
    fetchTrustFeeSettings(agencyId, ledgerId),
  );
  const [dialog, setDialog] = useState<FeeDialog>({ open: false });

  return (
    <TrustPanel
      title={COPY.title}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={!settings.data}
          onClick={() => setDialog({ open: true, setting: null })}
        >
          <Plus className="size-3.5" />
          {COPY.add}
        </Button>
      }
    >
      {!settings.data ? (
        settings.error ? (
          <TrustLoadError error={settings.error} onRetry={settings.reload} />
        ) : (
          <TrustLoading />
        )
      ) : settings.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.empty}</p>
      ) : (
        <ul className="divide-y text-sm">
          {settings.data.map((setting) => (
            <li
              key={setting.id}
              className={cn(
                'flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0',
                !setting.isActive && 'text-muted-foreground',
              )}
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {setting.name}
                  {setting.isActive ? '' : ` (${COPY.off})`}
                </p>
                <p className="text-muted-foreground text-xs">{describe(setting)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDialog({ open: true, setting })}
              >
                <Pencil className="size-3.5" />
                {COPY.edit}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {dialog.open && settings.data ? (
        <FeeSettingDialog
          key={dialog.setting?.id ?? 'new'}
          agencyId={agencyId}
          ledgerId={ledgerId}
          accountCodes={accountCodes}
          saved={settings.data}
          setting={dialog.setting}
          onClose={() => setDialog({ open: false })}
          onSaved={settings.reload}
        />
      ) : null}
    </TrustPanel>
  );
}

function FeeSettingDialog({
  agencyId,
  ledgerId,
  accountCodes,
  saved,
  setting,
  onClose,
  onSaved,
}: {
  agencyId: string;
  ledgerId: string;
  accountCodes: readonly TrustAccountCode[];
  saved: readonly TrustFeeSetting[];
  setting: TrustFeeSetting | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const categories = feeCategoryCodes(accountCodes);
  const [draft, setDraft] = useState<TrustFeeSettingDraft>(() =>
    trustFeeSettingDraft(setting, {
      trigger: TRUST_FEE_TRIGGER.EVERY_RENT_RECEIPT,
      name: COPY.namePlaceholder,
      accountCodeId: categories[0]?.id ?? '',
    }),
  );
  const [pending, setPending] = useState(false);
  const set = <K extends keyof TrustFeeSettingDraft>(key: K, value: TrustFeeSettingDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function save(next: TrustFeeSettingDraft) {
    const checked = trustFeeSettingInput(next);
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    const others = saved.filter((s) => s.id !== setting?.id).map(trustFeeSettingInputOf);
    setPending(true);
    try {
      await putTrustFeeSettings(agencyId, ledgerId, { settings: [...others, checked.value] });
      toast.success(COPY.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{setting ? COPY.dialogEditTitle(setting.name) : COPY.dialogAddTitle}</DialogTitle>
          <DialogDescription>{COPY.dialogDescription}</DialogDescription>
        </DialogHeader>
        {categories.length === 0 ? (
          <p className="text-sm text-amber-600">{TRUST_NEW_FEE_COPY.noCategories}</p>
        ) : null}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-fee-setting-name">{COPY.name}</Label>
            <Input
              id="trust-fee-setting-name"
              value={draft.name}
              maxLength={TRUST_INPUT_LIMITS.feeNameMax}
              disabled={pending}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-fee-setting-trigger">{COPY.trigger}</Label>
            <select
              id="trust-fee-setting-trigger"
              className={SELECT_CLASS}
              value={draft.trigger}
              disabled={pending}
              onChange={(e) => set('trigger', e.target.value as TrustFeeTrigger)}
            >
              {TRUST_FEE_TRIGGERS.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {TRUST_FEE_TRIGGER_LABEL[trigger]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-fee-setting-calc">{COPY.calc}</Label>
              <select
                id="trust-fee-setting-calc"
                className={SELECT_CLASS}
                value={draft.calc}
                disabled={pending}
                onChange={(e) => set('calc', e.target.value as TrustFeeCalc)}
              >
                {Object.values(TRUST_FEE_CALC).map((calc) => (
                  <option key={calc} value={calc}>
                    {TRUST_FEE_CALC_LABEL[calc]}
                  </option>
                ))}
              </select>
            </div>
            {draft.calc === TRUST_FEE_CALC.FIXED ? (
              <div className="space-y-1.5">
                <Label htmlFor="trust-fee-setting-amount">{COPY.amount}</Label>
                <Input
                  id="trust-fee-setting-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={draft.amount}
                  disabled={pending}
                  onChange={(e) => set('amount', e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="trust-fee-setting-rate">{COPY.rate}</Label>
                <Input
                  id="trust-fee-setting-rate"
                  inputMode="decimal"
                  placeholder="7.7"
                  value={draft.ratePercent}
                  disabled={pending}
                  onChange={(e) => set('ratePercent', e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-fee-setting-category">{COPY.category}</Label>
            <select
              id="trust-fee-setting-category"
              className={SELECT_CLASS}
              value={draft.accountCodeId}
              disabled={pending}
              onChange={(e) => set('accountCodeId', e.target.value)}
            >
              <option value="">{COPY.chooseCategory}</option>
              {categories.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.code} · {code.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={draft.gstInclusive}
                disabled={pending}
                onChange={(e) => set('gstInclusive', e.target.checked)}
              />
              {COPY.gstInclusive}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={draft.isActive}
                disabled={pending}
                onChange={(e) => set('isActive', e.target.checked)}
              />
              {COPY.active}
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void save(draft)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
