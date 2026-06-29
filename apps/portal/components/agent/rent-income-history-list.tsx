import type { RentIncomeEntry } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

function statusLabel(status: RentIncomeEntry['status']) {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    default:
      return 'Outstanding';
  }
}

function statusClass(status: RentIncomeEntry['status']) {
  switch (status) {
    case 'paid':
      return 'text-muted-foreground';
    case 'overdue':
      return 'text-destructive font-medium';
    default:
      return 'text-amber-600 dark:text-amber-500 font-medium';
  }
}

export function RentIncomeHistoryList({ entries }: { entries: RentIncomeEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No rent income recorded for this property.</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start justify-between gap-3 rounded-xl border bg-card/60 px-3 py-2.5 text-xs"
        >
          <div className="min-w-0">
            <p className="font-medium leading-tight">{entry.description}</p>
            <p className="text-muted-foreground mt-1">
              Due {formatDate(entry.dueDate)}
              {entry.paidDate ? ` · Paid ${formatDate(entry.paidDate)}` : ''}
            </p>
            <p className={cn('mt-1 text-[10px]', statusClass(entry.status))}>
              {statusLabel(entry.status)}
            </p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums">{formatCurrency(entry.amount)}</p>
        </div>
      ))}
    </div>
  );
}
