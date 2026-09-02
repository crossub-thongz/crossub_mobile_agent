'use client';

import { Check, Loader2, Mail, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RentEquivalentsHint } from '@/components/rent-equivalents-hint';
import { rentReviewLeaseTypeLabel } from '@/lib/rent-review/agent-workflow-model';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency } from '@/lib/utils';

function formatLeaseEndShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * The recommended rent, and the agent's ability to disagree with it.
 *
 * Blank-and-save is a real action here, not an empty form: it restores the researched figure,
 * which the API recomputes from the stored platform data. So the input starts empty rather
 * than pre-filled with the current number — pre-filling would make "clear it" look like a way
 * to submit nothing, and would put the agent one keystroke from wiping their own figure when
 * they only meant to retype it.
 */
function RecommendedRentEditor({
  detail,
  onSave,
  onCancel,
}: {
  detail: RentReviewWorkflowDetail;
  onSave: (weekly: number | null) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue('');
  }, [detail.id]);

  const save = async () => {
    const trimmed = value.trim();
    let weekly: number | null = null;
    if (trimmed) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 1) {
        toast.error('Enter a weekly rent, or leave it blank to use the researched figure');
        return;
      }
      weekly = Math.round(parsed * 100) / 100;
    }
    setSaving(true);
    try {
      await onSave(weekly);
      toast.success(
        weekly == null
          ? 'Recommendation reset to the researched figure'
          : `Recommended rent saved as ${formatCurrency(weekly)}/wk`,
      );
      onCancel();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          inputMode="decimal"
          className="h-8 max-w-[7.5rem] tabular-nums"
          placeholder={
            detail.ai.suggestedWeekly != null ? String(detail.ai.suggestedWeekly) : 'Weekly rent'
          }
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
            if (e.key === 'Escape') onCancel();
          }}
          aria-label="Recommended weekly rent"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 px-2"
          disabled={saving}
          onClick={() => void save()}
          aria-label="Save recommended rent"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          disabled={saving}
          onClick={onCancel}
          aria-label="Cancel"
        >
          <X className="size-4" />
        </Button>
      </div>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Leave blank to use the researched recommendation. The landlord pack, report and notice
        all quote this rate.
      </p>
    </div>
  );
}

export function RentReviewResearchResultSection({
  detail,
  researchComplete,
  landlordEmailed,
  landlordSkipped,
  emailBusy,
  skipBusy,
  onEmail,
  onSkip,
  helperText,
  canAdjustRecommendation,
  onAdjustRecommendation,
  emailLabel,
  emailDisabled,
}: {
  detail: RentReviewWorkflowDetail;
  researchComplete: boolean;
  landlordEmailed: boolean;
  landlordSkipped?: boolean;
  emailBusy?: boolean;
  skipBusy?: boolean;
  onEmail: () => void;
  onSkip?: () => void;
  helperText?: string;
  /** False past agent review, where the API refuses the write — the control is hidden, not disabled. */
  canAdjustRecommendation?: boolean;
  onAdjustRecommendation?: (weekly: number | null) => Promise<unknown>;
  emailLabel?: string;
  emailDisabled?: boolean;
}) {
  const suggested = detail.ai.suggestedWeekly;
  const [editing, setEditing] = useState(false);
  const canEdit = Boolean(canAdjustRecommendation && onAdjustRecommendation);

  useEffect(() => {
    setEditing(false);
  }, [detail.id]);

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">Research result</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground flex items-center gap-1 text-xs">
              Current rent
              <RentEquivalentsHint weekly={detail.currentWeeklyRent} />
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatCurrency(detail.currentWeeklyRent)}/wk
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Lease type</dt>
            <dd className="mt-0.5 font-medium">{rentReviewLeaseTypeLabel(detail)}</dd>
          </div>
        </dl>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Lease end</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {formatLeaseEndShort(detail.leaseEndDate)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Recommended rent value</dt>
            {editing && onAdjustRecommendation ? (
              <RecommendedRentEditor
                detail={detail}
                onSave={onAdjustRecommendation}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <dd className="mt-0.5 flex items-center gap-1.5">
                <span className="text-primary font-semibold tabular-nums">
                  {suggested != null ? formatCurrency(suggested) : '—'}
                  {detail.ai.increasePercent != null ? (
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      ({detail.ai.increasePercent >= 0 ? '+' : ''}
                      {detail.ai.increasePercent}%)
                    </span>
                  ) : null}
                </span>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="size-6 shrink-0 p-0"
                    onClick={() => setEditing(true)}
                    aria-label="Edit recommended rent"
                    title="Edit recommended rent"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                ) : null}
              </dd>
            )}
          </div>
        </dl>
      </div>

      {detail.ai.rationale ? (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{detail.ai.rationale}</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {landlordSkipped ? (
          <p className="text-muted-foreground text-xs sm:mr-auto">
            Proceeded without sending landlord email.
          </p>
        ) : landlordEmailed ? (
          <p className="text-muted-foreground text-xs sm:mr-auto">
            Research results sent to the landlord.
          </p>
        ) : null}
        {onSkip && !landlordEmailed && !landlordSkipped ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2 sm:min-w-[8rem]"
            disabled={!researchComplete || emailBusy || skipBusy}
            onClick={onSkip}
          >
            {skipBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            Proceed without sending email
          </Button>
        ) : null}
        <Button
          type="button"
          className="gap-2 sm:min-w-[8rem]"
          disabled={!researchComplete || emailBusy || emailDisabled}
          onClick={onEmail}
        >
          <Mail className="size-4" />
          {emailLabel ?? (landlordEmailed ? 'Sent to landlord' : 'Email landlord')}
        </Button>
      </div>
      {!researchComplete || helperText ? (
        <p className="text-muted-foreground mt-2 text-[11px]">
          {helperText ??
            'Market research is completed in the admin portal. Send the pack to the landlord once results are shown above.'}
        </p>
      ) : null}
    </section>
  );
}
