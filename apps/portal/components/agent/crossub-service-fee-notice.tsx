'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { fetchAgentBillingSummary } from '@/lib/crossub-api/agent-billing-client';
import { hasFullManagementAccess } from '@/lib/portal-service-level';
import { formatCurrency } from '@/lib/utils';
import {
  crossubMonthlyServiceFeeIncGst,
  effectiveManagementRatePercent,
  STANDARD_MANAGEMENT_RATE_PERCENT,
  type ManagementRateGstMode,
} from '@/lib/crossub-service-fee-math';

/** Standard management rate agents record on Full Service properties. */
export const CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT = STANDARD_MANAGEMENT_RATE_PERCENT;

type Props = {
  managementRatePercent?: number | null;
  managementRateGst?: ManagementRateGstMode;
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
  managementRateGst,
  weeklyRentAud,
  serviceFeePercent: serviceFeePercentProp,
  forceShow = false,
  compact = false,
}: Props) {
  const { agencies, platformBillingDisabled } = useAgentData();
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
    const effectiveRate = effectiveManagementRatePercent(rate);
    const {
      weeklyGross,
      feePerActiveDayAud,
      monthlyIncGst,
      pmFeePerDay,
    } = crossubMonthlyServiceFeeIncGst({
      weeklyRentAud: rent,
      managementRatePercent: effectiveRate,
      serviceFeePercent,
      managementRateGst,
    });
    return {
      effectiveRate,
      rent,
      weeklyGross,
      pmFeePerDay,
      feePerActiveDayAud,
      monthlyIncGst,
    };
  }, [rate, rent, serviceFeePercent, managementRateGst]);

  if (platformBillingDisabled) return null;
  if (!show) return null;

  if (compact) {
    return (
      <p className="text-muted-foreground text-xs leading-relaxed">
        <strong className="text-foreground">CROSSUB Full Service:</strong> record a{' '}
        <strong>{CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT}%</strong> management fee below.
        CROSSUB platform charge is <strong>{serviceFeePercent}%</strong> of your management
        income, using a {CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT}% minimum rate, billed by
        active days.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/8 p-4 text-sm">
      <p className="font-semibold text-foreground">CROSSUB Full Service platform charge</p>
      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        CROSSUB invoices{' '}
        <strong className="text-foreground">{serviceFeePercent}%</strong> of your management
        income, using your actual management rate with a{' '}
        <strong className="text-foreground">
          {CROSSUB_STANDARD_MANAGEMENT_RATE_PERCENT}% minimum incl. GST
        </strong>
        , billed by active days each month.
      </p>
      <div className="mt-3 space-y-1.5 rounded-md border border-border/60 bg-background/80 px-3 py-2.5 font-mono text-xs">
        <p>
          {formatCurrency(worked.rent)} × {worked.effectiveRate}% ÷ 7 × {serviceFeePercent}% ={' '}
          <strong>{formatCurrency(worked.feePerActiveDayAud)}</strong> per active day
        </p>
        <p>
          30 active days × {formatCurrency(worked.feePerActiveDayAud)} ={' '}
          <strong>{formatCurrency(worked.monthlyIncGst)}</strong> total fee
        </p>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Included per property each year: 3 routine, 1 ingoing, and 1 outgoing inspection, plus
        reference checks and the contract agreement. Open inspections and tribunal are charged
        separately.{' '}
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
  managementRateGst,
  weeklyRentAud,
  serviceFeePercent = 30,
}: {
  managementRatePercent?: number | null;
  managementRateGst?: ManagementRateGstMode;
  weeklyRentAud?: number | null;
  serviceFeePercent?: number;
}) {
  const billedRate = effectiveManagementRatePercent(managementRatePercent);
  const rent = weeklyRentAud != null && weeklyRentAud > 0 ? weeklyRentAud : 500;
  const { monthlyIncGst, feePerActiveDayAud } = crossubMonthlyServiceFeeIncGst({
    weeklyRentAud: rent,
    managementRatePercent: billedRate,
    serviceFeePercent,
    managementRateGst,
  });

  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">CROSSUB charge</p>
        <p className="text-sm font-medium text-foreground">Full Service platform fee</p>
        <p className="text-muted-foreground text-xs">
          {serviceFeePercent}% of management income · min 4% incl GST · billed by active days
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">At this property</p>
        <p className="text-sm font-semibold tabular-nums">
          {formatCurrency(monthlyIncGst)} / month
        </p>
        <p className="text-muted-foreground text-xs">
          {formatCurrency(feePerActiveDayAud)} per active day on {formatCurrency(rent)} rent @{' '}
          {billedRate}%
          {managementRateGst === 'include' ? ' (mgmt inc GST)' : ''}
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
