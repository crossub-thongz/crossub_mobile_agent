'use client';

import { formatRentReviewAuditDetail } from '@/lib/rent-review/audit-detail-display';
import type { RentReviewAuditEntry } from '@/lib/rent-review/types';
import { formatDateTime } from '@/lib/utils';

export function RentReviewActivityLog({
  entries,
  showTimestamp = false,
}: {
  entries: RentReviewAuditEntry[];
  showTimestamp?: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-xl border bg-muted/20 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide">Activity</p>
      <ul className="space-y-1 text-xs">
        {entries.map((e) => {
          const detail = formatRentReviewAuditDetail(e);
          return (
            <li key={e.id}>
              {showTimestamp ? (
                <span className="text-muted-foreground">{formatDateTime(e.at)} · </span>
              ) : null}
              <span className="font-medium">{e.message}</span>
              {detail ? <span className="text-muted-foreground"> · {detail}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
