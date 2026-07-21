'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  canEditAgentDecision,
  canResolveNegotiation,
  hasTenantNoticeSent,
} from '@/lib/rent-review/agent-workflow-model';
import {
  deriveNewLeaseStartDate,
  deriveRentIncreaseOnDate,
  isCurrentTenancyFixed,
} from '@/lib/rent-review/agent-decision-scheduling';
import {
  formatRentReviewTermLabel,
  leaseEndFromFixedTermWeeks,
  type FixedTermWeeks,
} from '@/lib/rent-review-lease-helpers';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { toDateOnly, resolveNoticePayableFromDate } from '@/lib/rent-review/scheduling';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

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

function resolveFixedTermWeeks(detail: RentReviewWorkflowDetail): FixedTermWeeks {
  if (detail.fixedTermWeeks === 26 || detail.fixedTermWeeks === 52) {
    return detail.fixedTermWeeks;
  }
  return 52;
}

export function RentReviewAgentConfirmedPanel({
  detail,
  onUpdated,
  readOnly,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
  readOnly?: boolean;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [rentNegotiable, setRentNegotiable] = useState<boolean | null>(null);
  const [preferredRent, setPreferredRent] = useState('');
  const [preferredLeaseType, setPreferredLeaseType] = useState<PreferredLeaseType>('periodic');
  const [fixedTermWeeks, setFixedTermWeeks] = useState<FixedTermWeeks>(52);
  const [fixedTermEndDate, setFixedTermEndDate] = useState('');
  const [manualRentIncreaseOn, setManualRentIncreaseOn] = useState('');

  const hasLeaseEnd = Boolean(toDateOnly(detail.leaseEndDate));

  const hasCounter = canResolveNegotiation(detail);
  const editable = canEditAgentDecision(detail) && !readOnly;
  const noticeSent = hasTenantNoticeSent(detail);
  const currentLeaseIsFixed = isCurrentTenancyFixed(detail);
  const autoNewLeaseStart = useMemo(() => deriveNewLeaseStartDate(detail), [detail]);

  useEffect(() => {
    setPreferredRent(
      String(detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent),
    );
    setRentNegotiable(detail.rentNegotiable);
    setPreferredLeaseType(
      detail.preferredLeaseType ?? (detail.newAgreementEnd ? 'fixed' : 'periodic'),
    );
    setFixedTermWeeks(resolveFixedTermWeeks(detail));
    setFixedTermEndDate(detail.newAgreementEnd ?? '');
    setManualRentIncreaseOn(
      toDateOnly(detail.effectiveDate) ??
        resolveNoticePayableFromDate({
          leaseEndDate: detail.leaseEndDate,
          storedEffectiveDate: detail.effectiveDate,
        }),
    );
  }, [detail.id]);

  const autoRentIncreaseOnResolved = useMemo(
    () =>
      resolveNoticePayableFromDate({
        leaseEndDate: detail.leaseEndDate,
        storedEffectiveDate: detail.effectiveDate,
      }) || deriveRentIncreaseOnDate(detail),
    [detail],
  );

  const effectiveDate = editable
    ? hasLeaseEnd
      ? autoRentIncreaseOnResolved
      : manualRentIncreaseOn
    : (toDateOnly(detail.effectiveDate) ?? autoRentIncreaseOnResolved);
  const newLeaseStart = editable
    ? currentLeaseIsFixed
      ? autoNewLeaseStart
      : null
    : (toDateOnly(detail.newAgreementStart) ?? (currentLeaseIsFixed ? autoNewLeaseStart : null));

  const computedFixedEnd =
    preferredLeaseType === 'fixed' && newLeaseStart
      ? leaseEndFromFixedTermWeeks(newLeaseStart, fixedTermWeeks)
      : fixedTermEndDate;

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
    const weekly = Number(preferredRent);
    if (!preferredRent.trim() || Number.isNaN(weekly)) {
      toast.error('Enter a valid preferred rent value');
      return;
    }
    if (rentNegotiable == null) {
      toast.error('Select whether the rent is negotiable');
      return;
    }
    if (preferredLeaseType === 'fixed' && !computedFixedEnd) {
      toast.error('Select a preferred lease term for the fixed agreement');
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
              preferredLeaseType === 'fixed' ? computedFixedEnd : undefined,
            newLeaseStartDate:
              currentLeaseIsFixed && newLeaseStart ? newLeaseStart : undefined,
          },
          detail.propertyId,
          detail.leaseEndDate,
        ),
      'Agent decision saved — formal notice sent to tenant',
    );
  };

  if (hasCounter) {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold">Tenant counter-offer received</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Review the tenant&apos;s offer and submit your feedback on the Negotiation step.
          </p>
        </section>
        <ReadOnlyAgentDecision
          detail={detail}
          rentNegotiable={detail.rentNegotiable}
          preferredLeaseType={detail.preferredLeaseType ?? preferredLeaseType}
          fixedTermWeeks={detail.fixedTermWeeks ?? fixedTermWeeks}
          fixedTermEndDate={detail.newAgreementEnd}
        />
      </div>
    );
  }

  if (noticeSent) {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold">Tenant has been notified</p>
          <p className="text-muted-foreground mt-1 text-xs">
            The formal rent increase notice was sent. Agent decision fields are read-only — continue
            on Negotiation.
          </p>
        </section>
        <ReadOnlyAgentDecision
          detail={detail}
          rentNegotiable={detail.rentNegotiable}
          preferredLeaseType={detail.preferredLeaseType ?? preferredLeaseType}
          fixedTermWeeks={detail.fixedTermWeeks ?? fixedTermWeeks}
          fixedTermEndDate={detail.newAgreementEnd}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {editable ? (
        <section className="rounded-xl border bg-card p-4">
          <p className="mb-4 text-sm font-semibold">Agent decision</p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="preferred-rent">Preferred rent value</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-xs"
                    disabled={busy}
                    onClick={() =>
                      setPreferredRent(
                        String(detail.ai.suggestedWeekly ?? detail.currentWeeklyRent),
                      )
                    }
                  >
                    Use recommended
                  </Button>
                </div>
                <div className="relative">
                  <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                    $
                  </span>
                  <Input
                    id="preferred-rent"
                    type="number"
                    className="pl-7 tabular-nums"
                    value={preferredRent}
                    onChange={(e) => setPreferredRent(e.target.value)}
                  />
                </div>
                <p className="text-muted-foreground text-[11px]">Per week</p>
              </div>

              <div className="space-y-2">
                <Label>Preferred lease term</Label>
                {preferredLeaseType === 'fixed' ? (
                  newLeaseStart ? (
                    <>
                      <select
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        value={fixedTermWeeks}
                        disabled={busy}
                        onChange={(e) =>
                          setFixedTermWeeks(Number(e.target.value) as FixedTermWeeks)
                        }
                      >
                        <option value={26}>26 weeks (6 months)</option>
                        <option value={52}>52 weeks (12 months)</option>
                      </select>
                      <p className="text-muted-foreground text-[11px]">
                        New agreement ends{' '}
                        <span className="font-medium tabular-nums">
                          {formatDateOnly(computedFixedEnd) ?? '—'}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <Input
                        type="date"
                        value={fixedTermEndDate}
                        onChange={(e) => setFixedTermEndDate(e.target.value)}
                      />
                      <p className="text-muted-foreground text-[11px]">
                        End date for the new fixed-term agreement.
                      </p>
                    </>
                  )
                ) : (
                  <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-sm">
                    Not applicable — periodic tenancy
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred lease type</Label>
                <div className="flex gap-2">
                  <ChoiceButton
                    active={preferredLeaseType === 'fixed'}
                    disabled={busy}
                    onClick={() => setPreferredLeaseType('fixed')}
                  >
                    Fixed
                  </ChoiceButton>
                  <ChoiceButton
                    active={preferredLeaseType === 'periodic'}
                    disabled={busy}
                    onClick={() => setPreferredLeaseType('periodic')}
                  >
                    Periodic
                  </ChoiceButton>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Negotiable</Label>
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
            </div>
          </div>

          <div className="text-muted-foreground mt-4 grid gap-2 rounded-lg border border-dashed bg-muted/20 p-3 text-[11px] sm:grid-cols-2">
            {editable && !hasLeaseEnd ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`rent-increase-on-${detail.id}`} className="text-foreground text-xs">
                  Rent increase on
                </Label>
                <Input
                  id={`rent-increase-on-${detail.id}`}
                  type="date"
                  value={manualRentIncreaseOn}
                  disabled={busy}
                  onChange={(e) => setManualRentIncreaseOn(e.target.value)}
                />
                <p className="text-[10px] leading-relaxed">
                  Periodic tenancy — set the NSW notice payable-from date manually (at least 60 days
                  after delivery).
                </p>
              </div>
            ) : (
              <p>
                <span className="font-medium text-foreground">Rent increase on:</span>{' '}
                {formatDateOnly(effectiveDate) ?? '—'}
                {hasLeaseEnd ? <span className="ml-1">(auto)</span> : null}
              </p>
            )}
            {currentLeaseIsFixed && newLeaseStart ? (
              <p>
                <span className="font-medium text-foreground">New lease start:</span>{' '}
                {formatDateOnly(newLeaseStart) ?? '—'}
                <span className="ml-1">(auto)</span>
              </p>
            ) : null}
          </div>

          <Button className="mt-4 w-full" disabled={busy} onClick={() => saveAgentDecision()}>
            Save agent decision
          </Button>
        </section>
      ) : (
        <ReadOnlyAgentDecision
          detail={detail}
          rentNegotiable={detail.rentNegotiable}
          preferredLeaseType={detail.preferredLeaseType ?? preferredLeaseType}
          fixedTermWeeks={detail.fixedTermWeeks ?? fixedTermWeeks}
          fixedTermEndDate={detail.newAgreementEnd ?? computedFixedEnd}
        />
      )}
    </div>
  );
}

function ReadOnlyAgentDecision({
  detail,
  rentNegotiable,
  preferredLeaseType,
  fixedTermWeeks,
  fixedTermEndDate,
}: {
  detail: RentReviewWorkflowDetail;
  rentNegotiable: boolean | null;
  preferredLeaseType: PreferredLeaseType | null;
  fixedTermWeeks: number | null;
  fixedTermEndDate: string | null;
}) {
  const preferredRent =
    detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent;

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-4 text-sm font-semibold">Agent decision</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Preferred rent value</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatCurrency(preferredRent)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Preferred lease term</dt>
            <dd className="mt-0.5 font-medium">
              {formatRentReviewTermLabel(preferredLeaseType, fixedTermWeeks)}
              {preferredLeaseType === 'fixed' && fixedTermEndDate
                ? ` · ends ${formatDateOnly(fixedTermEndDate) ?? '—'}`
                : ''}
            </dd>
          </div>
        </dl>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Preferred lease type</dt>
            <dd className="mt-0.5 font-medium capitalize">{preferredLeaseType ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Negotiable</dt>
            <dd className="mt-0.5 font-medium">
              {rentNegotiable === true ? 'Yes' : rentNegotiable === false ? 'No' : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
