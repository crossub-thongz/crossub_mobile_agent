import { FileDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatRentReviewTermLabel } from '@/lib/rent-review-lease-helpers';
import {
  resolveTenantNoticeTerms,
  type TenantNoticeTerms,
} from '@/lib/rent-review/tenant-notice-terms';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

function formatNoticeLeaseTerm(
  detail: RentReviewWorkflowDetail,
  terms: TenantNoticeTerms,
): string {
  if (terms.preferredLeaseType === 'periodic') return 'Not applicable';
  if (terms.preferredLeaseType === 'fixed') {
    const weeks =
      detail.fixedTermWeeks === 26 || detail.fixedTermWeeks === 52
        ? `${detail.fixedTermWeeks} wks`
        : formatRentReviewTermLabel('fixed', detail.fixedTermWeeks);
    if (terms.fixedTermEndDate) {
      return `${weeks} · ends ${formatDate(terms.fixedTermEndDate)}`;
    }
    return weeks;
  }
  return '—';
}

function formatNoticeLeaseType(value: 'fixed' | 'periodic' | null): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function RentReviewTenantNoticeTermsSummary({
  detail,
  effectiveDateOverride,
  noticeSentAt,
  onDownloadNotice,
  downloadBusy,
  className,
}: {
  detail: RentReviewWorkflowDetail;
  effectiveDateOverride?: string | null;
  noticeSentAt?: string | null;
  onDownloadNotice?: () => void;
  downloadBusy?: boolean;
  className?: string;
}) {
  const terms = resolveTenantNoticeTerms(detail, { effectiveDate: effectiveDateOverride });

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <Term
            label="New rent value"
            value={`${formatCurrency(terms.rentConfirmedWeekly)}/wk`}
            tabular
          />
          <Term label="Lease term" value={formatNoticeLeaseTerm(detail, terms)} />
          <Term
            label="Rent increase on"
            value={terms.rentIncreaseOn ? formatDate(terms.rentIncreaseOn) : '—'}
            tabular
          />
          <div>
            <dt className="text-muted-foreground text-xs">Rent increase notice</dt>
            <dd className="mt-0.5">
              {onDownloadNotice ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  disabled={downloadBusy}
                  onClick={onDownloadNotice}
                >
                  <FileDown className="size-3.5" />
                  PDF
                </Button>
              ) : (
                <span className="font-medium">PDF</span>
              )}
            </dd>
          </div>
          <Term
            label="Notice sent on"
            value={noticeSentAt ? formatDateTime(noticeSentAt) : '—'}
            tabular
          />
        </dl>
        <dl className="space-y-3 text-sm">
          <Term label="Lease type" value={formatNoticeLeaseType(terms.preferredLeaseType)} />
          <Term
            label="New lease start on"
            value={terms.newLeaseStart ? formatDate(terms.newLeaseStart) : '—'}
            tabular
          />
        </dl>
      </div>
    </div>
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
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={tabular ? 'mt-0.5 font-medium tabular-nums' : 'mt-0.5 font-medium'}>
        {value}
      </dd>
    </div>
  );
}

export type { TenantNoticeTerms };
