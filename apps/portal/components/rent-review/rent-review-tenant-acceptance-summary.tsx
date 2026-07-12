import {
  buildRentIncreaseSchedulingNote,
  type TenantAcceptanceSummary,
} from '@/lib/rent-review/tenant-decision-display';
import { formatCurrency, formatDate } from '@/lib/utils';

export function RentReviewTenantAcceptanceSummary({
  summary,
  showSchedulingNote = true,
}: {
  summary: TenantAcceptanceSummary;
  showSchedulingNote?: boolean;
}) {
  const isFixedRenewal = summary.preferredLeaseType === 'fixed';

  return (
    <div className="space-y-3">
      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">New rent price</dt>
          <dd className="text-primary font-medium tabular-nums">
            {formatCurrency(summary.newRentWeekly)}/wk
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rent increase start date</dt>
          <dd className="font-medium tabular-nums">
            {summary.rentIncreaseStartDate ? formatDate(summary.rentIncreaseStartDate) : 'TBC'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Preferred renewal</dt>
          <dd className="font-medium capitalize">{summary.preferredLeaseType ?? '—'}</dd>
        </div>
        {isFixedRenewal ? (
          <>
            <div>
              <dt className="text-muted-foreground">Lease term</dt>
              <dd className="font-medium">
                {summary.leaseTermWeeks != null ? `${summary.leaseTermWeeks} weeks` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">New lease start</dt>
              <dd className="font-medium tabular-nums">
                {summary.newLeaseStart ? formatDate(summary.newLeaseStart) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">New lease end</dt>
              <dd className="font-medium tabular-nums">
                {summary.newLeaseEnd ? formatDate(summary.newLeaseEnd) : '—'}
              </dd>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">New lease start / end</dt>
            <dd className="font-medium">Not applicable — periodic renewal</dd>
          </div>
        )}
      </dl>

      {showSchedulingNote ? (
        <p className="text-muted-foreground rounded-lg border bg-muted/20 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {buildRentIncreaseSchedulingNote(summary)}
        </p>
      ) : null}
    </div>
  );
}
