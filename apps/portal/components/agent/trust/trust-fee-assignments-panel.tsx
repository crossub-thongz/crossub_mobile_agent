'use client';

import { Loader2, Pencil, Plus } from 'lucide-react';
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
  TRUST_FEE_ASSIGNMENTS_COPY as COPY,
  TRUST_FEE_CALC,
  TRUST_FEE_MISSED_PERIOD_ACTION,
  TRUST_FEE_SCOPE,
  TRUST_FEE_SCOPE_LABEL,
  type TrustFeeMissedPeriodAction,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  addTrustFeeAssignmentVersion,
  createTrustFeeAssignment,
  fetchTrustFeeAssignments,
  resolveTrustMissedFeePeriod,
  type TrustFeeAssignment,
  type TrustFeeAssignments,
  type TrustFeeMissedPeriod,
  type TrustFeeTemplate,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate, trustTodayKey } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import {
  describeFeeAssignment,
  describeFeeVersion,
  trustFeeAmountDraft,
  trustFeeAmountInput,
  type TrustFeeAmountDraft,
} from '@/lib/utils/trust-fee-templates';

/** Closed, adding a template, or changing one fee. */
type FeeDialog = { kind: 'closed' } | { kind: 'add' } | { kind: 'change'; assignment: TrustFeeAssignment };

/**
 * The fees on an owner folio (PRD Step 4, D149): the agency's templates set on this folio or on its
 * property, each with the amount or rate in force today and its dated history. A change applies
 * from a date; fees already charged keep their amount. Missed recurring periods wait for the agent
 * to raise or skip them (no automatic backfill).
 */
export function TrustFeeAssignmentsPanel({
  agencyId,
  ledgerId,
  onChanged,
}: {
  agencyId: string;
  ledgerId: string;
  onChanged: () => void;
}) {
  const resource = useTrustResource(`${agencyId}:${ledgerId}:fee-assignments`, () =>
    fetchTrustFeeAssignments(agencyId, ledgerId),
  );
  const [dialog, setDialog] = useState<FeeDialog>({ kind: 'closed' });
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [resolving, setResolving] = useState<string | null>(null);
  const data = resource.data;

  function toggleHistory(id: string) {
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function resolve(assignment: TrustFeeAssignment, period: TrustFeeMissedPeriod, action: TrustFeeMissedPeriodAction) {
    setResolving(`${assignment.id}:${period.periodKey}`);
    try {
      await resolveTrustMissedFeePeriod(agencyId, ledgerId, assignment.id, { periodKey: period.periodKey, action });
      toast.success(action === TRUST_FEE_MISSED_PERIOD_ACTION.RAISE ? COPY.raised : COPY.skipped);
      resource.reload();
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setResolving(null);
    }
  }

  return (
    <TrustPanel
      title={COPY.title}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={!data || data.availableTemplates.length === 0}
          onClick={() => setDialog({ kind: 'add' })}
        >
          <Plus className="size-3.5" />
          {COPY.add}
        </Button>
      }
    >
      {!data ? (
        resource.error ? (
          <TrustLoadError error={resource.error} onRetry={resource.reload} />
        ) : (
          <TrustLoading />
        )
      ) : data.assignments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {data.availableTemplates.length === 0 ? COPY.noTemplates : COPY.empty}
        </p>
      ) : (
        <ul className="divide-y text-sm">
          {data.assignments.map((assignment) => {
            const on = assignment.current?.enabled === true;
            return (
              <li key={assignment.id} className="space-y-1.5 py-2 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className={cn('min-w-0', !on && 'text-muted-foreground')}>
                    <p className="flex flex-wrap items-center gap-1.5 font-medium">
                      {assignment.template.name}
                      {on ? '' : ` (${COPY.off})`}
                      <TrustPill className="bg-muted text-muted-foreground">
                        {TRUST_FEE_SCOPE_LABEL[assignment.target]}
                      </TrustPill>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {[
                        describeFeeAssignment(assignment),
                        assignment.current ? COPY.from(formatTrustDate(assignment.current.effectiveFrom)) : null,
                        assignment.lastChargeDate ? COPY.lastCharged(formatTrustDate(assignment.lastChargeDate)) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {assignment.target === TRUST_FEE_SCOPE.PROPERTY ? (
                      <p className="text-muted-foreground text-xs">{COPY.propertyNote}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleHistory(assignment.id)}
                    >
                      {shown.has(assignment.id) ? COPY.hideHistory : COPY.history}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDialog({ kind: 'change', assignment })}
                    >
                      <Pencil className="size-3.5" />
                      {COPY.change}
                    </Button>
                  </div>
                </div>
                {shown.has(assignment.id) ? (
                  <ul className="text-muted-foreground space-y-0.5 pl-3 text-xs">
                    {assignment.versions.map((version) => (
                      <li key={version.id}>{describeFeeVersion(assignment.template.calc, version)}</li>
                    ))}
                  </ul>
                ) : null}
                {assignment.missedPeriods.length > 0 ? (
                  <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                    <p className="font-medium text-amber-800 dark:text-amber-300">{COPY.missedTitle}</p>
                    <p className="text-muted-foreground">{COPY.missedNote}</p>
                    {assignment.missedPeriods.map((period) => {
                      const busy = resolving === `${assignment.id}:${period.periodKey}`;
                      return (
                        <div key={period.periodKey} className="flex items-center justify-between gap-2">
                          <span>
                            {COPY.missedRow(
                              formatTrustDate(period.startDate),
                              formatTrustDate(period.endDate),
                              formatCents(period.amountCents),
                            )}
                          </span>
                          <span className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              disabled={resolving !== null}
                              onClick={() => void resolve(assignment, period, TRUST_FEE_MISSED_PERIOD_ACTION.RAISE)}
                            >
                              {busy ? <Loader2 className="size-3 animate-spin" /> : null}
                              {COPY.raise}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              disabled={resolving !== null}
                              onClick={() => void resolve(assignment, period, TRUST_FEE_MISSED_PERIOD_ACTION.SKIP)}
                            >
                              {COPY.skip}
                            </Button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {dialog.kind !== 'closed' && data ? (
        <FeeAmountDialog
          agencyId={agencyId}
          ledgerId={ledgerId}
          data={data}
          assignment={dialog.kind === 'change' ? dialog.assignment : null}
          onClose={() => setDialog({ kind: 'closed' })}
          onSaved={() => {
            resource.reload();
            onChanged();
          }}
        />
      ) : null}
    </TrustPanel>
  );
}

function FeeAmountDialog({
  agencyId,
  ledgerId,
  data,
  assignment,
  onClose,
  onSaved,
}: {
  agencyId: string;
  ledgerId: string;
  data: TrustFeeAssignments;
  /** Null: adding a template; otherwise a new step for this fee. */
  assignment: TrustFeeAssignment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [templateId, setTemplateId] = useState(data.availableTemplates[0]?.id ?? '');
  const template: TrustFeeTemplate | null = assignment
    ? assignment.template
    : (data.availableTemplates.find((row) => row.id === templateId) ?? null);
  const [draft, setDraft] = useState<TrustFeeAmountDraft>(() =>
    trustFeeAmountDraft(assignment?.template.calc ?? TRUST_FEE_CALC.FIXED, assignment?.current ?? null, trustTodayKey()),
  );
  const [enabled, setEnabled] = useState(assignment?.current?.enabled ?? true);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof TrustFeeAmountDraft>(key: K, value: TrustFeeAmountDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function save() {
    if (!template) {
      toast.error(COPY.incomplete);
      return;
    }
    const checked = trustFeeAmountInput(template.calc, draft);
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    setPending(true);
    try {
      if (assignment) {
        await addTrustFeeAssignmentVersion(agencyId, ledgerId, assignment.id, { ...checked.value, enabled });
      } else {
        await createTrustFeeAssignment(agencyId, ledgerId, { ...checked.value, templateId: template.id });
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

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{assignment ? COPY.changeTitle(assignment.template.name) : COPY.addTitle}</DialogTitle>
          <DialogDescription>{assignment ? COPY.changeDescription : COPY.addDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {assignment ? null : (
            <div className="space-y-1.5">
              <Label htmlFor="trust-fee-assign-template">{COPY.template}</Label>
              <select
                id="trust-fee-assign-template"
                className={SELECT_CLASS}
                value={templateId}
                disabled={pending}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">{COPY.chooseTemplate}</option>
                {data.availableTemplates.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {TRUST_FEE_SCOPE_LABEL[row.scope]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {template?.scope === TRUST_FEE_SCOPE.PROPERTY ? (
            <p className="text-muted-foreground text-xs">{COPY.propertyNote}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {template?.calc === TRUST_FEE_CALC.PERCENT ? (
              <div className="space-y-1.5">
                <Label htmlFor="trust-fee-assign-rate">{COPY.rate}</Label>
                <Input
                  id="trust-fee-assign-rate"
                  inputMode="decimal"
                  placeholder="5.5"
                  value={draft.ratePercent}
                  disabled={pending}
                  onChange={(e) => set('ratePercent', e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="trust-fee-assign-amount">{COPY.amount}</Label>
                <Input
                  id="trust-fee-assign-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={draft.amount}
                  disabled={pending}
                  onChange={(e) => set('amount', e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="trust-fee-assign-from">{COPY.effectiveFrom}</Label>
              <Input
                id="trust-fee-assign-from"
                type="date"
                value={draft.effectiveFrom}
                disabled={pending}
                onChange={(e) => set('effectiveFrom', e.target.value)}
              />
            </div>
          </div>
          {assignment ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={enabled}
                disabled={pending}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              {COPY.enabled}
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || !template} onClick={() => void save()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
