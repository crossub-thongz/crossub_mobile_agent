import type { RentPeriod } from '@/lib/store';

/** Periods the Current Rent hover lists. */
export type RentEquivalentPeriod = 'weekly' | 'fortnightly' | 'monthly';

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Fortnight = weekly × 2. Monthly = weekly ÷ 7 × 365 ÷ 12. */
export function equivalentRentFromWeekly(
  weekly: number,
  period: RentEquivalentPeriod,
): number {
  if (!Number.isFinite(weekly) || weekly <= 0) return 0;
  if (period === 'fortnightly') return roundCents(weekly * 2);
  if (period === 'monthly') return roundCents(((weekly / 7) * 365) / 12);
  return roundCents(weekly);
}

/** Inverse of `equivalentRentFromWeekly`. */
export function weeklyFromEquivalentRent(
  amount: number,
  period: RentEquivalentPeriod,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (period === 'fortnightly') return roundCents(amount / 2);
  if (period === 'monthly') return roundCents(((amount * 12) / 365) * 7);
  return roundCents(amount);
}

export function rentEquivalentPeriodLabel(period: RentEquivalentPeriod): string {
  if (period === 'fortnightly') return 'Fortnight';
  if (period === 'monthly') return 'Monthly';
  return 'Weekly';
}

const EQUIVALENT_PERIODS: RentEquivalentPeriod[] = ['weekly', 'fortnightly', 'monthly'];

export function rentEquivalentLines(
  weekly: number,
  displayedPeriod: RentPeriod | RentEquivalentPeriod = 'weekly',
): Array<{ period: RentEquivalentPeriod; label: string; amount: number }> {
  const shown: RentEquivalentPeriod =
    displayedPeriod === 'fortnightly' || displayedPeriod === 'monthly'
      ? displayedPeriod
      : 'weekly';
  return EQUIVALENT_PERIODS.filter((period) => period !== shown).map((period) => ({
    period,
    label: rentEquivalentPeriodLabel(period),
    amount: equivalentRentFromWeekly(weekly, period),
  }));
}

export function formatEquivalentRent(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
