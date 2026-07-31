'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { fetchAgentBillingSummary } from '@/lib/crossub-api/agent-billing-client';
import { hasFullManagementAccess } from '@/lib/portal-service-level';
import { formatCurrency } from '@/lib/utils';

/** Standard management rate agents record on Full Service properties. */
export const CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT = 4;

type Props = {
  managementRatePercent?: number | null;
  weeklyRentAud?: number | null;
  serviceFeePercent?: number;
  /** Property intake / Fees tab — show even before agencies list has loaded. */
  forceShow?: boolean;
  compact?: boolean;
};

function parseRate(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * CROSSUB Full Service platform charge disclosure — standard 4% management rate;
 * CROSSUB invoices 30% of agent management income monthly.
 */
export function CrossubServiceFeeNotice({
  managementRatePercent,
  weeklyRentAud,
  serviceFeePercent: serviceFeePercentProp,
  forceShow = false,
  compact = false,
}: Props) {
  const { agencies } = useAgentData();
  const [serviceFeePercent, setServiceFeePercent] = useState(
    serviceFeePercentProp ?? 30,
  );

  useEffect(() => {
    if (serviceFeePercentProp != null) return;
    let cancelled = false;
    void fetchAgentBillingSummary()
      .then((summary) => {
        if (!cancelled && summary.serviceFeePercent != null) {
          setServiceFeePercent(summary.serviceFeePercent);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [serviceFeePercentProp]);

  const show =
    forceShow || agencies.length === 0 || hasFullManagementAccess(agencies);

  const rate = parseRate(managementRatePercent);
  const rent = weeklyRentAud != null && weeklyRentAud > 0 ? weeklyRentAud : 500;

  const worked = useMemo(() => {
    const effectiveRate = rate ?? CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT;
    const agentIncome = Math.round(rent * (effectiveRate / 100) * 100) / 100;
    const crossubFee = Math.round(agentIncome * (serviceFeePercent / 100) * 100) / 100;
    return { effectiveRate, rent, agentIncome, crossubFee };
  }, [rate, rent, serviceFeePercent]);

  if (!show) return null;

  if (compact) {
    return (
      <p className="text-muted-foreground text-xs leading-relaxed">
        <strong className="text-foreground">CROSSUB Full Service:</strong> record a{' '}
        <strong>{CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT}%</strong> management fee below.
        CROSSUB platform charge is <strong>{serviceFeePercent}%</strong> of your management
        income (invoiced monthly).
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/8 p-4 text-sm">
      <p className="font-semibold text-foreground">CROSSUB Full Service platform charge</p>
      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        Enter a{' '}
        <strong className="text-foreground">
          {CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT}% management fee
        </strong>{' '}
        in the Management Fee row (what you charge the landlord on weekly rent). CROSSUB invoices{' '}
        <strong className="text-foreground">{serviceFeePercent}%</strong> of that management
        income each month on Full Service accounts.
      </p>
      <div className="mt-3 space-y-1.5 rounded-md border border-border/60 bg-background/80 px-3 py-2.5 font-mono text-xs">
        <p>
          Weekly rent {formatCurrency(worked.rent)} × {worked.effectiveRate}% management ={' '}
          <strong>{formatCurrency(worked.agentIncome)}</strong> / week (your income)
        </p>
        <p>
          CROSSUB charge {formatCurrency(worked.agentIncome)} × {serviceFeePercent}% ={' '}
          <strong>{formatCurrency(worked.crossubFee)}</strong> / week (invoiced monthly)
        </p>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Included per property each year: 3 routine, 1 ingoing, and 1 outgoing inspection. Open
        inspections and tribunal are charged separately.{' '}
        <a href="/pricing" className="text-primary underline-offset-2 hover:underline">
          View pricing
        </a>
      </p>
    </div>
  );
}

/** Read-only summary row shown below landlord fee lines. */
export function CrossubPlatformFeeSummaryRow({
  managementRatePercent,
  weeklyRentAud,
  serviceFeePercent = 30,
}: {
  managementRatePercent?: number | null;
  weeklyRentAud?: number | null;
  serviceFeePercent?: number;
}) {
  const rate = parseRate(managementRatePercent) ?? CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT;
  const rent = weeklyRentAud != null && weeklyRentAud > 0 ? weeklyRentAud : 500;
  const agentIncome = Math.round(rent * (rate / 100) * 100) / 100;
  const crossubFee = Math.round(agentIncome * (serviceFeePercent / 100) * 100) / 100;

  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">CROSSUB charge</p>
        <p className="text-sm font-medium text-foreground">Full Service platform fee</p>
        <p className="text-muted-foreground text-xs">
          {serviceFeePercent}% of management income · standard {CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT}%
          mgmt rate
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">At this property</p>
        <p className="text-sm font-semibold tabular-nums">{formatCurrency(crossubFee)} / week</p>
        <p className="text-muted-foreground text-xs">
          on {formatCurrency(rent)} rent @ {rate}%
        </p>
      </div>
      <div className="space-y-1 sm:col-span-2 lg:col-span-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Collection</p>
        <p className="text-sm text-foreground">Monthly invoice</p>
      </div>
      <div className="hidden lg:block" aria-hidden />
    </div>
  );
}
