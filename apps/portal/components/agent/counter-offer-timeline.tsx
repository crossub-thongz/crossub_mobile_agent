import { formatCurrency, formatDateTime } from '@/lib/utils';

export function CounterOfferTimeline({
  history,
}: {
  history: { at: string; party: string; amount: number; note?: string }[];
}) {
  return (
    <ol className="space-y-3">
      {history.map((entry, i) => (
        <li key={i} className="rounded-lg border bg-card px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{entry.party}</span>
            <span className="text-primary font-semibold">
              {formatCurrency(entry.amount)}/wk
            </span>
          </div>
          {entry.note && (
            <p className="text-muted-foreground mt-1">{entry.note}</p>
          )}
          <p className="text-muted-foreground mt-1">{formatDateTime(entry.at)}</p>
        </li>
      ))}
    </ol>
  );
}
