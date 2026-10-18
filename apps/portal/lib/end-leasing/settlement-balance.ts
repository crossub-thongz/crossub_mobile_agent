import { SETTLEMENT_METHOD } from '@/constants/end-leasing';
import type { SettlementStageState } from '@/lib/end-leasing/types';

/**
 * Total deductions, refund and debt from the bond, the settlement's deduction lines and the
 * settlement method. Deduct from bond: what is left of the bond is refunded and any excess is
 * owed by the tenant. Tenant pays separately: the whole bond is refunded and the tenant owes the
 * whole total. Matches the API's `recomputeSettlement` (sum of every line, then
 * `splitVacatingSettlement` by method), so the figures are right before the settlement's first
 * save — the stored totals stay 0 until then.
 */
export function settlementBalance(
  settlement: Pick<SettlementStageState, 'bondHeld' | 'deductions' | 'method'>,
): { totalDeductions: number; refund: number; debt: number } {
  const cents = (n: number) => Math.round(n * 100) / 100;
  const totalDeductions = cents(settlement.deductions.reduce((sum, line) => sum + line.amount, 0));
  if (settlement.method === SETTLEMENT_METHOD.TENANT_PAYS) {
    return {
      totalDeductions,
      refund: cents(Math.max(0, settlement.bondHeld)),
      debt: cents(Math.max(0, totalDeductions)),
    };
  }
  return {
    totalDeductions,
    refund: cents(Math.max(0, settlement.bondHeld - totalDeductions)),
    debt: cents(Math.max(0, totalDeductions - settlement.bondHeld)),
  };
}
