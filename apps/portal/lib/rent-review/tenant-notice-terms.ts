import {
  deriveNewLeaseStartDate,
  deriveRentIncreaseOnDate,
  isCurrentTenancyFixed,
} from '@/lib/rent-review/agent-decision-scheduling';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface TenantNoticeTerms {
  rentNegotiable: boolean | null;
  rentConfirmedWeekly: number;
  preferredLeaseType: 'fixed' | 'periodic' | null;
  rentIncreaseOn: string | null;
  newLeaseStart: string | null;
  fixedTermEndDate: string | null;
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.slice(0, 10);
}

/** Agent-confirmed terms shown in the tenant notice email and panel. */
export function resolveTenantNoticeTerms(
  detail: RentReviewWorkflowDetail,
  overrides?: { effectiveDate?: string | null },
): TenantNoticeTerms {
  const currentLeaseIsFixed = isCurrentTenancyFixed(detail);
  const rentIncreaseOn =
    toDateOnly(overrides?.effectiveDate) ??
    toDateOnly(detail.effectiveDate) ??
    deriveRentIncreaseOnDate(detail);
  const newLeaseStart = currentLeaseIsFixed
    ? toDateOnly(detail.newAgreementStart) ?? deriveNewLeaseStartDate(detail)
    : null;

  return {
    rentNegotiable: detail.rentNegotiable,
    rentConfirmedWeekly:
      detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? detail.currentWeeklyRent,
    preferredLeaseType: detail.preferredLeaseType,
    rentIncreaseOn,
    newLeaseStart,
    fixedTermEndDate:
      detail.preferredLeaseType === 'fixed' ? toDateOnly(detail.newAgreementEnd) : null,
  };
}

export function formatRentNegotiableLabel(value: boolean | null): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

export function formatPreferredLeaseTermLabel(value: 'fixed' | 'periodic' | null): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Bullet lines for the tenant notice / reminder email body. */
export function tenantNoticeTermsEmailLines(terms: TenantNoticeTerms): string[] {
  const lines = [
    `Rent negotiable: ${formatRentNegotiableLabel(terms.rentNegotiable)}`,
    `Rent confirmed: ${formatCurrency(terms.rentConfirmedWeekly)}/wk`,
    `Preferred lease term: ${formatPreferredLeaseTermLabel(terms.preferredLeaseType)}`,
  ];

  if (terms.preferredLeaseType === 'fixed' && terms.fixedTermEndDate) {
    lines.push(`Fixed term ends: ${formatDate(terms.fixedTermEndDate)}`);
  }

  lines.push(
    `Rent increase on: ${terms.rentIncreaseOn ? formatDate(terms.rentIncreaseOn) : '—'}`,
  );

  if (terms.newLeaseStart) {
    lines.push(`New lease start: ${formatDate(terms.newLeaseStart)}`);
  }

  return lines;
}
