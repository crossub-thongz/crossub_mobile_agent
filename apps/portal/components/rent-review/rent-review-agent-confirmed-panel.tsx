'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
  canEditAgentDecision,
  hasTenantNoticeSent,
} from '@/lib/rent-review/agent-workflow-model';
import {
  deriveNewLeaseStartDate,
  deriveRentIncreaseOnDate,
} from '@/lib/rent-review/agent-decision-scheduling';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toDateOnly } from '@/lib/rent-review/scheduling';

type PreferredLeaseType = 'fixed' | 'periodic';

function ChoiceButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted/60',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {children}
    </button>
  );
}

function formatDateOnly(value: string | null | undefined): string | null {
  const day = toDateOnly(value);
  return day ? formatDate(day) : null;
}

function AutoDateField({
  label,
  value,
  hint,
  muted = false,
}: {
  label: string;
  value: string | null;
  hint: string;
  muted?: boolean;
}) {
  return (
    <div className={cn('space-y-1', muted && 'opacity-50')}>
      <Label className={cn(muted && 'text-muted-foreground')}>{label}</Label>
      <div className="bg-muted/40 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
        <span className="font-medium tabular-nums">{formatDateOnly(value) ?? '—'}</span>
        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Auto
        </span>
      </div>
      <p className="text-muted-foreground text-[11px]">{hint}</p>
    </div>
  );
}

export function RentReviewAgentConfirmedPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [rentNegotiable, setRentNegotiable] = useState<boolean | null>(null);
  const [confirmedWeekly, setConfirmedWeekly] = useState('');
  const [preferredLeaseType, setPreferredLeaseType] = useState<PreferredLeaseType>('periodic');
  const [fixedTermEndDate, setFixedTermEndDate] = useState('');
  const hasCounter = detail.tenantCounterWeekly != null;
  const editable = canEditAgentDecision(detail);
  const noticeSent = hasTenantNoticeSent(detail);
  const currentLeaseIsFixed = detail.leaseType === 'fixed';
  const autoNewLeaseStart = useMemo(() => deriveNewLeaseStartDate(detail), [detail]);
  const autoRentIncreaseOn = useMemo(() => deriveRentIncreaseOnDate(detail), [detail]);

  // Initialise form once per review — avoid resetting toggles when parent re-renders.
  useEffect(() => {
    const defaultWeekly = String(
      detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent,
    );
    setConfirmedWeekly(defaultWeekly);
    setRentNegotiable(detail.rentNegotiable);
    setPreferredLeaseType(
      detail.preferredLeaseType ?? (detail.newAgreementEnd ? 'fixed' : 'periodic'),
    );
    setFixedTermEndDate(detail.newAgreementEnd ?? '');
  }, [detail.id]);

  const effectiveDate = editable
    ? autoRentIncreaseOn
    : (toDateOnly(detail.effectiveDate) ?? autoRentIncreaseOn);
  const newLeaseStart = editable
    ? currentLeaseIsFixed
      ? autoNewLeaseStart
      : null
    : (toDateOnly(detail.newAgreementStart) ?? (currentLeaseIsFixed ? autoNewLeaseStart : null));

  const run = async (action: () => Promise<RentReviewWorkflowDetail>, success: string) => {
    setBusy(true);
    try {
      const updated = await runMutation(detail.id, action());
      onUpdated?.(updated);
      toast.success(success);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveAgentDecision = () => {
    const weekly = Number(confirmedWeekly);
    if (!confirmedWeekly.trim() || Number.isNaN(weekly)) {
      toast.error('Enter a valid weekly rent');
      return;
    }
    if (rentNegotiable == null) {
      toast.error('Select whether rent is negotiable');
      return;
    }
    if (preferredLeaseType === 'fixed' && !fixedTermEndDate) {
      toast.error('Select the fixed term end date');
      return;
    }
    void run(
      () =>
        rentReviewApi.setProposedRent(
          detail.id,
          {
            weekly,
            effectiveDate,
            rentNegotiable,
            preferredLeaseType,
            preferredFixedTermEndDate:
              preferredLeaseType === 'fixed' ? fixedTermEndDate : undefined,
            newLeaseStartDate:
              currentLeaseIsFixed && newLeaseStart ? newLeaseStart : undefined,
          },
          detail.propertyId,
          detail.leaseEndDate,
        ),
      'Agent decision saved',
    );
  };

  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED);

  if (noticeSent) {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold">Tenant has been notified</p>
          <p className="text-muted-foreground mt-1 text-xs">
            The formal rent increase notice was sent. Agent decision fields are read-only.
            Continue on the Tenant notified step to track the response.
          </p>
        </section>
        <ReadOnlySummary
          detail={detail}
          rentNegotiable={detail.rentNegotiable}
          effectiveDate={effectiveDate}
          newLeaseStart={newLeaseStart}
          preferredLeaseType={detail.preferredLeaseType ?? preferredLeaseType}
          fixedTermEndDate={detail.newAgreementEnd}
        />
        {auditEntries.length > 0 ? <ActivityLog entries={auditEntries} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">
          {hasCounter ? 'Tenant counter-offer' : 'Agent decision'}
        </p>
        <p className="text-muted-foreground mb-3 text-xs">
          {hasCounter
            ? 'Tenant provided a counter-offer. Accept it or revise the proposed rent and re-notify.'
            : 'Confirm rent, negotiability, preferred lease term, and scheduling before notifying the tenant.'}
        </p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Current rent</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(detail.currentWeeklyRent)}/wk</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">CROSSUB suggested</dt>
            <dd className="text-primary font-medium tabular-nums">
              {formatCurrency(detail.ai.suggestedWeekly ?? detail.currentWeeklyRent)}/wk
            </dd>
          </div>
          {hasCounter ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Tenant counter</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(detail.tenantCounterWeekly!)}/wk
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {editable ? (
        hasCounter ? (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <Button
              className="w-full"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    rentReviewApi.resolveNegotiation(
                      detail.id,
                      { action: 'accept_counter' },
                      detail.leaseEndDate,
                    ),
                  'Tenant counter accepted',
                )
              }
            >
              Accept tenant counter {formatCurrency(detail.tenantCounterWeekly!)}/wk
            </Button>
            <div className="space-y-2">
              <Label htmlFor="revised-weekly">Revised proposed rent ($/week)</Label>
              <Input
                id="revised-weekly"
                type="number"
                value={confirmedWeekly}
                onChange={(e) => setConfirmedWeekly(e.target.value)}
              />
              <Label htmlFor="revised-effective">Rent increase on</Label>
              <div className="bg-muted/40 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span className="font-medium tabular-nums">
                  {formatDateOnly(effectiveDate) ?? '—'}
                </span>
                <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                  Auto
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={busy || !confirmedWeekly}
                onClick={() =>
                  void run(
                    () =>
                      rentReviewApi.resolveNegotiation(
                        detail.id,
                        {
                          action: 'repropose',
                          resolvedWeekly: Number(confirmedWeekly),
                          effectiveDate,
                        },
                        detail.leaseEndDate,
                      ),
                    'Revised proposal recorded — send tenant notice when ready',
                  )
                }
              >
                Decline counter & set revised rent
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="space-y-2">
              <Label>Rent negotiable?</Label>
              <div className="flex gap-2">
                <ChoiceButton
                  active={rentNegotiable === true}
                  disabled={busy}
                  onClick={() => setRentNegotiable(true)}
                >
                  Yes
                </ChoiceButton>
                <ChoiceButton
                  active={rentNegotiable === false}
                  disabled={busy}
                  onClick={() => setRentNegotiable(false)}
                >
                  No
                </ChoiceButton>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="confirmed-weekly">Rent confirmed by agent ($/week)</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  disabled={busy}
                  onClick={() =>
                    setConfirmedWeekly(
                      String(detail.ai.suggestedWeekly ?? detail.currentWeeklyRent),
                    )
                  }
                >
                  Use CROSSUB suggested
                </Button>
              </div>
              <Input
                id="confirmed-weekly"
                type="number"
                value={confirmedWeekly}
                onChange={(e) => setConfirmedWeekly(e.target.value)}
              />
              <p className="text-muted-foreground text-[11px]">
                Defaults to CROSSUB research. Override if the landlord or market warrants a
                different figure.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Preferred lease term</Label>
              <div className="flex gap-2">
                <ChoiceButton
                  active={preferredLeaseType === 'periodic'}
                  disabled={busy}
                  onClick={() => setPreferredLeaseType('periodic')}
                >
                  Periodic
                </ChoiceButton>
                <ChoiceButton
                  active={preferredLeaseType === 'fixed'}
                  disabled={busy}
                  onClick={() => setPreferredLeaseType('fixed')}
                >
                  Fixed term
                </ChoiceButton>
              </div>
              {preferredLeaseType === 'fixed' ? (
                <div className="space-y-1 pt-1">
                  <Label htmlFor="fixed-term-end">Fixed term end date</Label>
                  <Input
                    id="fixed-term-end"
                    type="date"
                    value={fixedTermEndDate}
                    min={newLeaseStart ?? undefined}
                    onChange={(e) => setFixedTermEndDate(e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AutoDateField
                label="Rent increase on"
                value={effectiveDate}
                hint="Same day the current lease ends — one day before the new lease start."
              />
              <AutoDateField
                label="New lease start date"
                value={newLeaseStart}
                hint={
                  currentLeaseIsFixed
                    ? 'Day after the current fixed lease ends.'
                    : 'Not applicable for periodic tenancies.'
                }
                muted={!currentLeaseIsFixed}
              />
            </div>

            <Button className="w-full" disabled={busy} onClick={() => saveAgentDecision()}>
              Confirm agent decision
            </Button>
          </div>
        )
      ) : (
        <ReadOnlySummary
          detail={detail}
          rentNegotiable={detail.rentNegotiable}
          effectiveDate={effectiveDate}
          newLeaseStart={newLeaseStart}
          preferredLeaseType={detail.preferredLeaseType ?? preferredLeaseType}
          fixedTermEndDate={detail.newAgreementEnd ?? (fixedTermEndDate || null)}
        />
      )}

      {auditEntries.length > 0 ? <ActivityLog entries={auditEntries} /> : null}
    </div>
  );
}

function ReadOnlySummary({
  detail,
  rentNegotiable,
  effectiveDate,
  newLeaseStart,
  preferredLeaseType,
  fixedTermEndDate,
}: {
  detail: RentReviewWorkflowDetail;
  rentNegotiable: boolean | null;
  effectiveDate: string;
  newLeaseStart: string | null;
  preferredLeaseType: PreferredLeaseType | null;
  fixedTermEndDate: string | null;
}) {
  return (
    <section className="rounded-xl border bg-muted/20 p-4 text-xs">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Rent negotiable</dt>
          <dd className="font-medium">
            {rentNegotiable === true ? 'Yes' : rentNegotiable === false ? 'No' : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rent confirmed</dt>
          <dd className="font-medium tabular-nums">
            {formatCurrency(detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent)}/wk
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Preferred lease term</dt>
          <dd className="font-medium capitalize">{preferredLeaseType ?? '—'}</dd>
        </div>
        {preferredLeaseType === 'fixed' && fixedTermEndDate ? (
          <div>
            <dt className="text-muted-foreground">Fixed term ends</dt>
            <dd className="font-medium tabular-nums">{formatDateOnly(fixedTermEndDate) ?? '—'}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">Rent increase on</dt>
          <dd className="font-medium tabular-nums">{formatDateOnly(effectiveDate) ?? '—'}</dd>
        </div>
        {newLeaseStart ? (
          <div>
            <dt className="text-muted-foreground">New lease start</dt>
            <dd className="font-medium tabular-nums">{formatDateOnly(newLeaseStart) ?? '—'}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function ActivityLog({ entries }: { entries: RentReviewWorkflowDetail['auditLog'] }) {
  return (
    <section className="rounded-xl border bg-muted/20 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide">Activity</p>
      <ul className="space-y-1 text-xs">
        {entries.map((e) => (
          <li key={e.id}>
            <span className="font-medium">{e.message}</span>
            {e.detail ? <span className="text-muted-foreground"> · {e.detail}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
