'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { RentReviewActivityLog } from '@/components/rent-review/rent-review-activity-log';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
  canEditAgentDecision,
  canResolveNegotiation,
  hasTenantNoticeSent,
} from '@/lib/rent-review/agent-workflow-model';
import {
  buildNegotiationComparison,
  formatNegotiationDelta,
} from '@/lib/rent-review/negotiation-display';
import {
  deriveNewLeaseStartDate,
  deriveRentIncreaseOnDate,
  isCurrentTenancyFixed,
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
}: {
  label: string;
  value: string | null;
  hint: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
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
  const hasCounter = canResolveNegotiation(detail);
  const editable = canEditAgentDecision(detail);
  const noticeSent = hasTenantNoticeSent(detail);
  const negotiation = useMemo(() => buildNegotiationComparison(detail), [detail]);
  const counterDelta = formatNegotiationDelta(negotiation.deltaWeekly);
  const currentLeaseIsFixed = isCurrentTenancyFixed(detail);
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

  if (noticeSent && !hasCounter) {
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
          currentLeaseIsFixed={currentLeaseIsFixed}
          preferredLeaseType={detail.preferredLeaseType ?? preferredLeaseType}
          fixedTermEndDate={detail.newAgreementEnd}
        />
        <RentReviewActivityLog entries={auditEntries} />
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
            ? 'The tenant proposed a counter-offer. Accept it, submit your own counter-offer, or mark the rent as non-negotiable so the tenant can only accept or decline.'
            : 'Confirm rent, negotiability, preferred lease term, and scheduling before notifying the tenant.'}
        </p>
        {hasCounter ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                Agent proposed
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {negotiation.agentWeekly != null
                  ? `${formatCurrency(negotiation.agentWeekly)}/wk`
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Tenant counter
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                {negotiation.tenantCounterWeekly != null
                  ? `${formatCurrency(negotiation.tenantCounterWeekly)}/wk`
                  : '—'}
              </p>
              {counterDelta ? (
                <p className="text-muted-foreground mt-1 text-[11px]">{counterDelta}</p>
              ) : null}
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                Current rent
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatCurrency(detail.currentWeeklyRent)}/wk
              </p>
            </div>
          </div>
        ) : (
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
          </dl>
        )}
      </section>

      {editable ? (
        hasCounter ? (
          <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
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

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-semibold">Submit agent counter-offer</p>
              <p className="text-muted-foreground text-xs">
                Propose a revised weekly rent. Re-send the formal notice on the Tenant notified
                step once recorded.
              </p>
              <Label htmlFor="revised-weekly">Agent counter ($/week)</Label>
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
                          rentNegotiable: true,
                        },
                        detail.leaseEndDate,
                      ),
                    'Agent counter-offer recorded — re-send tenant notice when ready',
                  )
                }
              >
                Send counter-offer to tenant
              </Button>
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-semibold">Mark non-negotiable</p>
              <p className="text-muted-foreground text-xs">
                Lock the rent at your confirmed proposal of{' '}
                <span className="font-medium tabular-nums">
                  {formatCurrency(
                    detail.proposedWeeklyRent ??
                      detail.ai.suggestedWeekly ??
                      detail.currentWeeklyRent,
                  )}
                  /wk
                </span>
                . The tenant may accept or decline only — no further counter-offers.
              </p>
              <Button
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      rentReviewApi.resolveNegotiation(
                        detail.id,
                        { action: 'mark_non_negotiable' },
                        detail.leaseEndDate,
                      ),
                    'Marked non-negotiable — re-send tenant notice when ready',
                  )
                }
              >
                Mark non-negotiable
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
                  <Label htmlFor="fixed-term-end">Fixed Term (Date)</Label>
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

            <div className={cn('grid gap-3', currentLeaseIsFixed ? 'sm:grid-cols-2' : '')}>
              <AutoDateField
                label="Rent increase on"
                value={effectiveDate}
                hint={
                  currentLeaseIsFixed
                    ? 'Same day the current fixed lease ends — one day before the new lease start.'
                    : 'NSW statutory minimum — 60 days from today for periodic tenancies.'
                }
              />
              {currentLeaseIsFixed ? (
                <AutoDateField
                  label="New lease start date"
                  value={newLeaseStart}
                  hint="Day after the current fixed lease ends — auto-continues into the new term."
                />
              ) : null}
            </div>
            {!currentLeaseIsFixed ? (
              <p className="text-muted-foreground text-[11px]">
                New lease start does not apply — the tenant remains on the existing periodic
                agreement.
              </p>
            ) : null}

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
          currentLeaseIsFixed={currentLeaseIsFixed}
          preferredLeaseType={detail.preferredLeaseType ?? preferredLeaseType}
          fixedTermEndDate={detail.newAgreementEnd ?? (fixedTermEndDate || null)}
        />
      )}

      <RentReviewActivityLog entries={auditEntries} />
    </div>
  );
}

function ReadOnlySummary({
  detail,
  rentNegotiable,
  effectiveDate,
  newLeaseStart,
  currentLeaseIsFixed,
  preferredLeaseType,
  fixedTermEndDate,
}: {
  detail: RentReviewWorkflowDetail;
  rentNegotiable: boolean | null;
  effectiveDate: string;
  newLeaseStart: string | null;
  currentLeaseIsFixed: boolean;
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
        {currentLeaseIsFixed && newLeaseStart ? (
          <div>
            <dt className="text-muted-foreground">New lease start</dt>
            <dd className="font-medium tabular-nums">{formatDateOnly(newLeaseStart) ?? '—'}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

