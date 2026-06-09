import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { LeaseHistoryItem, RentPaymentRecord } from '@/lib/lease-package-data';

export function LeaseHistorySection({
  title,
  icon: Icon,
  empty,
  isEmpty,
  children,
}: {
  title: string;
  icon: LucideIcon;
  empty?: string;
  isEmpty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className="text-primary size-4" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-3">
        {isEmpty ? (
          <p className="text-muted-foreground px-1 py-2 text-sm">{empty ?? 'No records.'}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function LeaseHistoryList({ items }: { items: LeaseHistoryItem[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-primary/20 hover:bg-secondary/40"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{item.label}</p>
            {item.sublabel && (
              <p className="text-muted-foreground text-xs">{item.sublabel}</p>
            )}
            {item.date && (
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                {formatDateTime(item.date)}
              </p>
            )}
          </div>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </Link>
      ))}
    </div>
  );
}

export function RentHistoryList({ payments }: { payments: RentPaymentRecord[] }) {
  return (
    <div className="space-y-1.5">
      {payments.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium">{formatCurrency(p.amount)}</p>
            <p className="text-muted-foreground truncate text-xs">
              {p.reference ?? formatDate(p.at)}
            </p>
          </div>
          <span
            className={
              p.status === 'paid'
                ? 'rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary'
                : p.status === 'late'
                  ? 'rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400'
                  : 'rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive'
            }
          >
            {p.status}
          </span>
        </div>
      ))}
    </div>
  );
}
