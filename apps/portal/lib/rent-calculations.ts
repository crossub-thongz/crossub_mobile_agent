import {
  LEASING_CYCLE_BOND_RENT_MULTIPLIER,
  LEASING_CYCLE_DEPOSIT_RENT_MULTIPLIER,
} from '@/lib/property-form-prefill';
import type { RentPeriod } from '@/lib/store';

export type RentPeriodChoice = RentPeriod | '';

/** Convert entered rent to a weekly amount for storage and bond/deposit math. */
export function weeklyRentFromAmount(amount: number, period: RentPeriodChoice): number {
  if (!amount || amount <= 0 || !period) return 0;
  if (period === 'weekly') return amount;
  if (period === 'fortnightly') return amount / 2;
  return (amount * 12) / 52;
}

/** Convert stored weekly rent into the selected payment-cycle display amount. */
export function amountFromWeekly(weekly: number, period: RentPeriodChoice): number {
  if (!weekly || weekly <= 0 || !period) return 0;
  if (period === 'weekly') return weekly;
  if (period === 'fortnightly') return Math.round(weekly * 2 * 100) / 100;
  return Math.round(((weekly * 52) / 12) * 100) / 100;
}

export function bondFromWeekly(weekly: number): number {
  if (!weekly || weekly <= 0) return 0;
  return Math.round(weekly * LEASING_CYCLE_BOND_RENT_MULTIPLIER);
}

/** Daily rent from weekly amount (÷ 7, rounded to cents). */
export function dailyRentFromWeekly(weekly: number): number {
  if (!weekly || weekly <= 0) return 0;
  return Math.round((weekly / 7) * 100) / 100;
}

export function depositFromWeekly(weekly: number): number {
  if (!weekly || weekly <= 0) return 0;
  return Math.round(weekly * LEASING_CYCLE_DEPOSIT_RENT_MULTIPLIER);
}

export const RENT_PERIOD_OPTIONS: { value: RentPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];
