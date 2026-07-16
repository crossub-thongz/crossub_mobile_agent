'use client';

import type { ApiQuotation } from '@/lib/crossub-api/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { MaintenanceRepairQuotationPanel } from '@/components/maintenance/maintenance-repair-quotation-panel';

export function ContractorPreviousQuotationPanel({
  quote,
  versionLabel,
}: {
  quote: ApiQuotation;
  versionLabel?: string;
}) {
  return (
    <div className="mb-4 space-y-2 rounded-lg border border-dashed border-yellow-700/30 bg-yellow-700/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-200">
          {versionLabel ?? 'Previous quotation'}
        </p>
        <p className="text-muted-foreground text-[10px] tabular-nums">
          {formatDateTime(quote.submittedAt)} · {formatCurrency(quote.price)}
        </p>
      </div>
      <MaintenanceRepairQuotationPanel quote={quote} embedded mode="readonly" />
    </div>
  );
}
