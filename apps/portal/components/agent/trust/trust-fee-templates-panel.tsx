'use client';

import { Archive, ArchiveRestore, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustLoadError, TrustLoading, TrustPanel, TrustPill } from '@/components/agent/trust/trust-ui';
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
  TRUST_FEE_RECURRING_FREQUENCY,
  TRUST_FEE_RECURRING_FREQUENCY_LABEL,
  TRUST_FEE_SCOPE,
  TRUST_FEE_SCOPE_LABEL,
  TRUST_FEE_TAX_CODE,
  TRUST_FEE_TAX_CODE_LABEL,
  TRUST_FEE_TEMPLATE_STATUS,
  TRUST_FEE_TEMPLATE_TRIGGERS,
  TRUST_FEE_TEMPLATES_COPY as COPY,
  TRUST_FEE_TRIGGER,
  TRUST_FEE_TRIGGER_LABEL,
  TRUST_INPUT_LIMITS,
  TRUST_NEW_FEE_COPY,
  type TrustFeeCalc,
  type TrustFeeRecurringFrequency,
  type TrustFeeScope,
  type TrustFeeTaxCode,
  type TrustFeeTrigger,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  createTrustFeeTemplate,
  deleteTrustFeeTemplate,
  fetchTrustFeeTemplates,
  setTrustFeeTemplateArchived,
  updateTrustFeeTemplate,
  type TrustAccountCode,
  type TrustFeeTemplate,
} from '@/lib/crossub-api/agent-trust-client';
import { feeCategoryCodes } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  allowedFeeCalcs,
  allowedFeeScopes,
  fitTemplateDraft,
  trustFeeTemplateDraft,
  trustFeeTemplateInput,
  trustFeeTemplateUpdate,
  type TrustFeeTemplateDraft,
} from '@/lib/utils/trust-fee-templates';

/** Closed, adding, or editing one template. */
type TemplateDialog = { open: false } | { open: true; template: TrustFeeTemplate | null };

/**
 * The agency's fee templates (PRD Step 4, D148): rules with no amount. A template in use is locked
 * to its name and income category, and is archived rather than deleted.
 */
export function TrustFeeTemplatesPanel({
  agencyId,
  accountCodes,
}: {
  agencyId: string;
  accountCodes: readonly TrustAccountCode[];
}) {
  const [showArchived, setShowArchived] = useState(false);
  const templates = useTrustResource(`${agencyId}:fee-templates:${showArchived}`, () =>
    fetchTrustFeeTemplates(agencyId, showArchived),
  );
  const [dialog, setDialog] = useState<TemplateDialog>({ open: false });
  const [busy, setBusy] = useState<string | null>(null);

  async function act(template: TrustFeeTemplate, run: () => Promise<unknown>, done: string) {
    setBusy(template.id);
    try {
      await run();
      toast.success(done);
      templates.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <TrustPanel
      title={COPY.title}
      actions={
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              className="size-3.5"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            {COPY.showArchived}
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDialog({ open: true, template: null })}
          >
            <Plus className="size-3.5" />
            {COPY.add}
          </Button>
        </div>
      }
    >
      <p className="text-muted-foreground mb-3 text-sm">{COPY.description}</p>
      {!templates.data ? (
        templates.error ? (
          <TrustLoadError error={templates.error} onRetry={templates.reload} />
        ) : (
          <TrustLoading />
        )
      ) : templates.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.empty}</p>
      ) : (
        <ul className="divide-y text-sm">
          {templates.data.map((template) => {
            const archived = template.status === TRUST_FEE_TEMPLATE_STATUS.ARCHIVED;
            return (
              <li
                key={template.id}
                className={cn('flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0', archived && 'text-muted-foreground')}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    {template.name}
                    <TrustPill className="bg-muted text-muted-foreground">{TRUST_FEE_SCOPE_LABEL[template.scope]}</TrustPill>
                    {archived ? <TrustPill className="bg-muted text-muted-foreground">{COPY.archived}</TrustPill> : null}
                    {template.locked && !archived ? (
                      <TrustPill className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{COPY.locked}</TrustPill>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {[
                      TRUST_FEE_TRIGGER_LABEL[template.trigger],
                      template.calc === TRUST_FEE_CALC.PERCENT && template.percentBase
                        ? COPY.percentOf(template.percentBase)
                        : TRUST_FEE_CALC_LABEL[template.calc],
                      template.recurringFrequency ? TRUST_FEE_RECURRING_FREQUENCY_LABEL[template.recurringFrequency] : null,
                      TRUST_FEE_TAX_CODE_LABEL[template.taxCode],
                      template.accountCode.name,
                      template.assignmentCount > 0 ? COPY.inUse(template.assignmentCount) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={busy !== null}
                    onClick={() => setDialog({ open: true, template })}
                  >
                    <Pencil className="size-3.5" />
                    {COPY.edit}
                  </Button>
                  {template.locked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={busy !== null}
                      onClick={() =>
                        void act(
                          template,
                          () => setTrustFeeTemplateArchived(agencyId, template.id, !archived),
                          archived ? COPY.restoredDone : COPY.archivedDone,
                        )
                      }
                    >
                      {busy === template.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : archived ? (
                        <ArchiveRestore className="size-3.5" />
                      ) : (
                        <Archive className="size-3.5" />
                      )}
                      {archived ? COPY.restore : COPY.archive}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={busy !== null}
                      onClick={() => {
                        if (!window.confirm(COPY.confirmRemove(template.name))) return;
                        void act(template, () => deleteTrustFeeTemplate(agencyId, template.id), COPY.removedDone);
                      }}
                    >
                      {busy === template.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      {COPY.remove}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog.open ? (
        <TemplateDialogForm
          key={dialog.template?.id ?? 'new'}
          agencyId={agencyId}
          accountCodes={accountCodes}
          template={dialog.template}
          onClose={() => setDialog({ open: false })}
          onSaved={templates.reload}
        />
      ) : null}
    </TrustPanel>
  );
}

function TemplateDialogForm({
  agencyId,
  accountCodes,
  template,
  onClose,
  onSaved,
}: {
  agencyId: string;
  accountCodes: readonly TrustAccountCode[];
  template: TrustFeeTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // A template may post under a non-income code (the built-in management fee code), so keep it listed.
  const incomeCodes = feeCategoryCodes(accountCodes);
  const currentCode = template ? accountCodes.find((code) => code.id === template.accountCode.id) : undefined;
  const categories = currentCode && !incomeCodes.includes(currentCode) ? [currentCode, ...incomeCodes] : incomeCodes;
  const locked = template?.locked ?? false;
  const [draft, setDraft] = useState<TrustFeeTemplateDraft>(() =>
    trustFeeTemplateDraft(template, {
      name: COPY.namePlaceholder,
      accountCodeId: categories[0]?.id ?? '',
      scope: TRUST_FEE_SCOPE.PROPERTY,
      taxCode: TRUST_FEE_TAX_CODE.GST,
    }),
  );
  const [pending, setPending] = useState(false);
  const set = <K extends keyof TrustFeeTemplateDraft>(key: K, value: TrustFeeTemplateDraft[K]) =>
    setDraft((prev) => fitTemplateDraft({ ...prev, [key]: value }));

  async function save() {
    setPending(true);
    try {
      if (template) {
        const checked = trustFeeTemplateUpdate(draft, locked);
        if (!checked.ok) {
          toast.error(checked.error);
          return;
        }
        await updateTrustFeeTemplate(agencyId, template.id, checked.value);
      } else {
        const checked = trustFeeTemplateInput(draft);
        if (!checked.ok) {
          toast.error(checked.error);
          return;
        }
        await createTrustFeeTemplate(agencyId, checked.value);
      }
      toast.success(COPY.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const ruleDisabled = pending || locked;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{template ? COPY.dialogEditTitle(template.name) : COPY.dialogAddTitle}</DialogTitle>
          <DialogDescription>{locked ? COPY.lockedNote : COPY.dialogDescription}</DialogDescription>
        </DialogHeader>
        {categories.length === 0 ? <p className="text-sm text-amber-600">{TRUST_NEW_FEE_COPY.noCategories}</p> : null}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-fee-template-name">{COPY.name}</Label>
            <Input
              id="trust-fee-template-name"
              value={draft.name}
              maxLength={TRUST_INPUT_LIMITS.feeNameMax}
              disabled={pending}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-fee-template-trigger">{COPY.trigger}</Label>
            <select
              id="trust-fee-template-trigger"
              className={SELECT_CLASS}
              value={draft.trigger}
              disabled={ruleDisabled}
              onChange={(e) => set('trigger', e.target.value as TrustFeeTrigger)}
            >
              {TRUST_FEE_TEMPLATE_TRIGGERS.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {TRUST_FEE_TRIGGER_LABEL[trigger]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-fee-template-scope">{COPY.scope}</Label>
              <select
                id="trust-fee-template-scope"
                className={SELECT_CLASS}
                value={draft.scope}
                disabled={ruleDisabled}
                onChange={(e) => set('scope', e.target.value as TrustFeeScope)}
              >
                {allowedFeeScopes(draft.trigger).map((scope) => (
                  <option key={scope} value={scope}>
                    {TRUST_FEE_SCOPE_LABEL[scope]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-fee-template-calc">{COPY.calc}</Label>
              <select
                id="trust-fee-template-calc"
                className={SELECT_CLASS}
                value={draft.calc}
                disabled={ruleDisabled}
                onChange={(e) => set('calc', e.target.value as TrustFeeCalc)}
              >
                {allowedFeeCalcs(draft.trigger).map((calc) => (
                  <option key={calc} value={calc}>
                    {TRUST_FEE_CALC_LABEL[calc]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-fee-template-tax">{COPY.taxCode}</Label>
              <select
                id="trust-fee-template-tax"
                className={SELECT_CLASS}
                value={draft.taxCode}
                disabled={ruleDisabled}
                onChange={(e) => set('taxCode', e.target.value as TrustFeeTaxCode)}
              >
                {Object.values(TRUST_FEE_TAX_CODE).map((code) => (
                  <option key={code} value={code}>
                    {TRUST_FEE_TAX_CODE_LABEL[code]}
                  </option>
                ))}
              </select>
            </div>
            {draft.trigger === TRUST_FEE_TRIGGER.RECURRING ? (
              <div className="space-y-1.5">
                <Label htmlFor="trust-fee-template-frequency">{COPY.frequency}</Label>
                <select
                  id="trust-fee-template-frequency"
                  className={SELECT_CLASS}
                  value={draft.recurringFrequency}
                  disabled={ruleDisabled}
                  onChange={(e) => set('recurringFrequency', e.target.value as TrustFeeRecurringFrequency)}
                >
                  {Object.values(TRUST_FEE_RECURRING_FREQUENCY).map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {TRUST_FEE_RECURRING_FREQUENCY_LABEL[frequency]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-fee-template-category">{COPY.category}</Label>
            <select
              id="trust-fee-template-category"
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
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void save()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
