import {
  buildRentIncreaseSchedulingNote,
  type TenantAcceptanceSummary,
} from '@/lib/rent-review/tenant-decision-display';
import { formatCurrency, formatDate } from '@/lib/utils';

function formatLeaseType(value: 'fixed' | 'periodic' | null | undefined): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatLeaseTerm(weeks: number | null, preferredLeaseType: 'fixed' | 'periodic' | null): string {
  if (preferredLeaseType === 'periodic') return 'Not applicable';
  if (weeks != null && weeks > 0) return `${weeks} wks`;
  return '—';
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
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={tabular ? 'mt-0.5 font-medium tabular-nums' : 'mt-0.5 font-medium'}>{value}</dd>
    </div>
  );
}

export function RentReviewTenantAcceptanceSummary({
  summary,
  showSchedulingNote = false,
}: {
  summary: TenantAcceptanceSummary;
  showSchedulingNote?: boolean;
}) {
  const isFixedRenewal =
    summary.preferredLeaseType === 'fixed' ||
    summary.newLeaseStart != null ||
    summary.newLeaseEnd != null;

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <Term
            label="New rent"
            value={`${formatCurrency(summary.newRentWeekly)}/wk`}
            tabular
          />
          <Term label="Lease type" value={formatLeaseType(summary.preferredLeaseType)} />
          <Term
            label="New lease start"
            value={
              isFixedRenewal && summary.newLeaseStart
                ? formatDate(summary.newLeaseStart)
                : 'Not applicable'
            }
            tabular
          />
        </dl>
        <dl className="space-y-3 text-sm">
          <Term
            label="Rent increase on"
            value={
              summary.rentIncreaseStartDate ? formatDate(summary.rentIncreaseStartDate) : '—'
            }
            tabular
          />
          <Term
            label="Lease term"
            value={formatLeaseTerm(summary.leaseTermWeeks, summary.preferredLeaseType)}
          />
          <Term
            label="New lease end"
            value={
              isFixedRenewal && summary.newLeaseEnd
                ? formatDate(summary.newLeaseEnd)
                : 'Not applicable'
            }
            tabular
          />
        </dl>
      </div>

      {showSchedulingNote ? (
        <p className="text-muted-foreground rounded-lg border bg-muted/20 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {buildRentIncreaseSchedulingNote(summary)}
        </p>
      ) : null}
    </div>
  );
}
