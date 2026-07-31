'use client';

import { useMemo } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { hasFullManagementAccess } from '@/lib/portal-service-level';
import { formatCurrency } from '@/lib/utils';

type Props = {
  managementRatePercent?: number | null;
  weeklyRentAud?: number | null;
  serviceFeePercent?: number;
};

function parseRate(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Explains CROSSUB Full Service fee (30% of agent management income) on property intake.
 */
export function CrossubServiceFeeNotice({
  managementRatePercent,
  weeklyRentAud,
  serviceFeePercent = 30,
}: Props) {
  const { agencies } = useAgentData();
  const show = hasFullManagementAccess(agencies);
  const rate = parseRate(managementRatePercent);
  const rent = weeklyRentAud != null && weeklyRentAud > 0 ? weeklyRentAud : 500;

  const worked = useMemo(() => {
    const effectiveRate = rate ?? 4;
    const agentIncome = Math.round(rent * (effectiveRate / 100) * 100) / 100;
    const crossubFee = Math.round(agentIncome * (serviceFeePercent / 100) * 100) / 100;
    return { effectiveRate, rent, agentIncome, crossubFee };
  }, [rate, rent, serviceFeePercent]);

  if (!show) return null;

  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-4 text-sm">
      <p className="font-semibold text-foreground">CROSSUB Full Service fee</p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Record the management rate you charge the landlord (e.g.{' '}
        <strong>{worked.effectiveRate}%</strong>). CROSSUB invoices{' '}
        <strong>{serviceFeePercent}%</strong> of your management income each month on Full Service
        accounts.
      </p>
      <div className="mt-3 space-y-1 rounded-md border border-border/60 bg-background/80 px-3 py-2 font-mono text-xs">
        <p>
          Weekly rent {formatCurrency(worked.rent)} × {worked.effectiveRate}% management ={' '}
          <strong>{formatCurrency(worked.agentIncome)}</strong> agent income
        </p>
        <p>
          CROSSUB fee {formatCurrency(worked.agentIncome)} × {serviceFeePercent}% ={' '}
          <strong>{formatCurrency(worked.crossubFee)}</strong> / week (invoiced monthly)
        </p>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Included per property each year: 3 routine, 1 ingoing, and 1 outgoing inspection. Open
        inspections and tribunal are always charged per use. See{' '}
        <a href="/pricing" className="text-primary underline-offset-2 hover:underline">
          Pricing
        </a>{' '}
        for the full schedule.
      </p>
    </div>
  );
}
