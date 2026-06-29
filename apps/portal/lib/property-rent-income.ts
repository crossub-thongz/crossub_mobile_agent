import { buildRentPayments } from '@/lib/lease-package-data';
import type { LeasingRecord, PropertyAccounting, RentIncomeEntry } from '@/lib/types';

export function resolvePropertyRentIncome(
  accounting: PropertyAccounting,
  currentLease?: LeasingRecord,
): RentIncomeEntry[] {
  if (accounting.rentIncomeHistory?.length) {
    return accounting.rentIncomeHistory;
  }
  if (!currentLease) return [];
  return buildRentPayments(currentLease, accounting).map((payment) => ({
    id: payment.id,
    dueDate: payment.at,
    paidDate: payment.status === 'paid' ? payment.at : undefined,
    amount: payment.amount,
    description: payment.reference ?? 'Rent payment',
    status:
      payment.status === 'paid'
        ? 'paid'
        : payment.status === 'late'
          ? 'overdue'
          : 'outstanding',
  }));
}
