'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RENT_REVIEW_AGENT_STEP,
  auditEntriesForStep,
  canResolveNegotiation,
} from '@/lib/rent-review/agent-workflow-model';
import { deriveRentIncreaseOnDate } from '@/lib/rent-review/agent-decision-scheduling';
import { formatRentReviewAuditDetail } from '@/lib/rent-review/audit-detail-display';
import {
  agentProposedWeekly,
  buildNegotiationComparison,
  formatNegotiationDelta,
} from '@/lib/rent-review/negotiation-display';
import { formatRentReviewTermLabel } from '@/lib/rent-review-lease-helpers';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import { toDateOnly } from '@/lib/rent-review/scheduling';
import {
  hasTenantCounterHistory,
  tenantCounterAuditEntries,
} from '@/lib/rent-review/tenant-decision-display';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

function formatNegotiationLeaseType(value: 'fixed' | 'periodic' | null | undefined): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatNegotiationLeaseTerm(detail: RentReviewWorkflowDetail): string {
  if (detail.preferredLeaseType === 'periodic') return 'Not applicable';
  if (detail.preferredLeaseType === 'fixed') {
    const weeks =
      detail.fixedTermWeeks === 26 || detail.fixedTermWeeks === 52
        ? `${detail.fixedTermWeeks} wks`
        : formatRentReviewTermLabel('fixed', detail.fixedTermWeeks);
    if (detail.newAgreementEnd) {
      return `${weeks} · ends ${formatDate(detail.newAgreementEnd.slice(0, 10))}`;
    }
    return weeks;
  }
  return '—';
}

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

export function RentReviewNegotiationPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [agentCounterRent, setAgentCounterRent] = useState('');

  const pending = canResolveNegotiation(detail);
  const hasHistory = hasTenantCounterHistory(detail);
  const negotiation = useMemo(() => buildNegotiationComparison(detail), [detail]);
  const counterDelta = formatNegotiationDelta(negotiation.deltaWeekly);
  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.NEGOTIATION);
  const counterAudit = tenantCounterAuditEntries(detail);
  const agentWeekly = agentProposedWeekly(detail);
  const effectiveDate =
    toDateOnly(detail.effectiveDate) ?? deriveRentIncreaseOnDate(detail) ?? undefined;

  const tenantOfferWeekly = detail.tenantCounterWeekly;
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

  const acceptOffer = () => {
    void run(
      () => rentReviewApi.resolveNegotiation(detail.id, { action: 'accept_counter' }, detail.leaseEndDate),
      'Tenant offer accepted',
    );
  };

  const sendAgentCounter = () => {
    const weekly = Number(agentCounterRent);
    if (!agentCounterRent.trim() || Number.isNaN(weekly)) {
      toast.error('Enter a valid counter-offer rent');
      return;
    }
    void run(
      () =>
        rentReviewApi.resolveNegotiation(
          detail.id,
          {
            action: 'repropose',
            resolvedWeekly: weekly,
            effectiveDate,
            rentNegotiable: true,
          },
          detail.leaseEndDate,
        ),
      'Agent counter-offer recorded',
    );
  };

  const markNonNegotiable = () => {
    void run(
      () =>
        rentReviewApi.resolveNegotiation(
          detail.id,
          { action: 'mark_non_negotiable' },
          detail.leaseEndDate,
        ),
      'Marked non-negotiable',
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-4 text-sm font-semibold">Negotiation</p>

        {!pending && !hasHistory ? (
          <p className="text-muted-foreground text-xs">
            Awaiting a tenant counter-offer after the formal notice is sent. If the tenant accepts or
            declines outright, continue on Tenant decision.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Tenant&apos;s offer</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {tenantOfferWeekly != null
                    ? `${formatCurrency(tenantOfferWeekly)}/wk`
                    : hasHistory
                      ? 'See audit below'
                      : '—'}
                </dd>
                {pending && agentWeekly != null && counterDelta ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    vs agent proposed {formatCurrency(agentWeekly)}/wk ({counterDelta})
                  </p>
                ) : null}
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Lease term</dt>
                <dd className="mt-0.5 font-medium">{formatNegotiationLeaseTerm(detail)}</dd>
              </div>
            </dl>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Lease type</dt>
                <dd className="mt-0.5 font-medium">
                  {formatNegotiationLeaseType(detail.preferredLeaseType)}
                </dd>
              </div>
              {agentWeekly != null ? (
                <div>
                  <dt className="text-muted-foreground text-xs">Agent proposed rent</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {formatCurrency(agentWeekly)}/wk
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        )}

        {pending ? (
          <div className="mt-4 space-y-3 border-t pt-4">
            <Label>Agent&apos;s feedback</Label>
            <div className="flex gap-2">
              <ChoiceButton active={!declineOpen} disabled={busy} onClick={() => setDeclineOpen(false)}>
                Accept
              </ChoiceButton>
              <ChoiceButton active={declineOpen} disabled={busy} onClick={() => setDeclineOpen(true)}>
                Decline
              </ChoiceButton>
            </div>

            {!declineOpen ? (
              <Button className="w-full" disabled={busy} onClick={acceptOffer}>
                Accept tenant offer
                {detail.tenantCounterWeekly != null
                  ? ` (${formatCurrency(detail.tenantCounterWeekly)}/wk)`
                  : ''}
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 p-3">
                <p className="text-muted-foreground text-xs">
                  Decline the tenant&apos;s offer and submit revised terms, or mark the rent
                  non-negotiable.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="agent-counter-rent">Agent counter-offer ($/week)</Label>
                  <Input
                    id="agent-counter-rent"
                    type="number"
                    className="tabular-nums"
                    value={agentCounterRent}
                    placeholder={agentWeekly != null ? String(agentWeekly) : undefined}
                    onChange={(e) => setAgentCounterRent(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy || !agentCounterRent}
                    onClick={sendAgentCounter}
                  >
                    Send counter-offer to tenant
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={markNonNegotiable}
                >
                  Mark non-negotiable
                </Button>
              </div>
            )}
          </div>
        ) : hasHistory ? (
          <p className="text-muted-foreground mt-4 border-t pt-4 text-xs">
            {detail.rentNegotiable === false
              ? 'Rent is non-negotiable — re-send the notice on Tenant notified.'
              : canResolveNegotiation(detail)
                ? 'Review the tenant offer above.'
                : 'Negotiation round complete — continue on Tenant notified or Tenant decision.'}
          </p>
        ) : null}
      </section>

      {counterAudit.length > 0 || detail.pricingMilestones.length > 0 ? (
        <section className="rounded-xl border bg-muted/20 p-4">
          <p className="mb-3 text-sm font-semibold">Audit information</p>
          <p className="text-muted-foreground mb-3 text-xs">
            Rent and offer amounts update as tenant and agent negotiate — each change is recorded
            below.
          </p>
          <ul className="space-y-2 text-xs">
            {detail.pricingMilestones.map((milestone) => (
              <li
                key={milestone.id}
                className="rounded-lg border border-border/60 bg-background px-3 py-2.5"
              >
                <p className="text-muted-foreground tabular-nums">
                  {formatDateTime(milestone.recordedAt)}
                </p>
                <p className="mt-0.5 font-medium">
                  {milestone.headline} — {formatCurrency(milestone.weeklyRent)}/wk
                </p>
                {milestone.note ? (
                  <p className="text-muted-foreground mt-0.5">{milestone.note}</p>
                ) : null}
              </li>
            ))}
            {counterAudit.map((e) => {
              const auditDetail = formatRentReviewAuditDetail(e);
              return (
                <li
                  key={e.id}
                  className="rounded-lg border border-border/60 bg-background px-3 py-2.5"
                >
                  <p className="text-muted-foreground tabular-nums">{formatDateTime(e.at)}</p>
                  <p className="mt-0.5 font-medium">{e.message}</p>
                  {auditDetail ? (
                    <p className="text-muted-foreground mt-0.5">{auditDetail}</p>
                  ) : e.detail ? (
                    <p className="text-muted-foreground mt-0.5">{e.detail}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {auditEntries.length > counterAudit.length ? (
            <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
              {auditEntries
                .filter((e) => !counterAudit.some((c) => c.id === e.id))
                .map((e) => (
                  <li key={e.id} className="text-muted-foreground">
                    {formatDateTime(e.at)} · {e.message}
                  </li>
                ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
