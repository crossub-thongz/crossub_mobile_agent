import { ROUTES } from '@/constants/routes';

const HIDDEN_BILLING_HREFS = new Set([ROUTES.BILL, ROUTES.PRICING, ROUTES.BILLING_OVERDUE]);
const HIDDEN_MORE_ITEM_IDS = new Set([
  'invoices',
  'payment-methods',
  'pricing-fees',
  'billing-history',
  'service-plan',
]);

export function isPlatformBillingDisabled(
  summary?: { platformBillingDisabled?: boolean; prepaidEnabled?: boolean } | null,
): boolean {
  return summary?.platformBillingDisabled === true;
}

export function filterHiddenBillingNav<T extends { href?: string; id?: string }>(
  items: T[],
  platformBillingDisabled: boolean,
): T[] {
  if (!platformBillingDisabled) return items;
  return items.filter((item) => {
    if (item.id && HIDDEN_MORE_ITEM_IDS.has(item.id)) return false;
    if (item.href && HIDDEN_BILLING_HREFS.has(item.href)) return false;
    return true;
  });
}
