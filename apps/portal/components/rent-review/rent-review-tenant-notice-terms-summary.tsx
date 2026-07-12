import {
  formatPreferredLeaseTermLabel,
  formatRentNegotiableLabel,
  resolveTenantNoticeTerms,
  type TenantNoticeTerms,
} from '@/lib/rent-review/tenant-notice-terms';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function RentReviewTenantNoticeTermsSummary({
  detail,
  effectiveDateOverride,
  className,
}: {
  detail: RentReviewWorkflowDetail;
  effectiveDateOverride?: string | null;
  className?: string;
}) {
  const terms = resolveTenantNoticeTerms(detail, { effectiveDate: effectiveDateOverride });

  return (
    <dl className={className ?? 'grid gap-3 text-xs sm:grid-cols-2'}>
      <Term label="Rent negotiable" value={formatRentNegotiableLabel(terms.rentNegotiable)} />
      <Term
        label="Rent confirmed"
        value={`${formatCurrency(terms.rentConfirmedWeekly)}/wk`}
        tabular
      />
      <Term
        label="Preferred lease term"
        value={formatPreferredLeaseTermLabel(terms.preferredLeaseType)}
      />
      {terms.preferredLeaseType === 'fixed' && terms.fixedTermEndDate ? (
        <Term label="Fixed term ends" value={formatDate(terms.fixedTermEndDate)} tabular />
      ) : null}
      <Term
        label="Rent increase on"
        value={terms.rentIncreaseOn ? formatDate(terms.rentIncreaseOn) : '—'}
        tabular
      />
      {terms.newLeaseStart ? (
        <Term label="New lease start" value={formatDate(terms.newLeaseStart)} tabular />
      ) : null}
    </dl>
  );
}

function Term({
  label,
  value,
  tabular = false,
}: {
  label: string;
  value: string;
  tabular?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={tabular ? 'font-medium tabular-nums' : 'font-medium'}>{value}</dd>
    </div>
  );
}

export type { TenantNoticeTerms };
