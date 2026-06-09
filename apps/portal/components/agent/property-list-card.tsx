import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { NeedActionBadge } from '@/components/agent/need-action-badge';
import type { Property } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

const STATUS_STYLES: Record<Property['leaseStatus'], string> = {
  active: 'bg-primary/15 text-primary',
  periodic: 'bg-sky-500/15 text-sky-400',
  vacating: 'bg-amber-500/15 text-amber-400',
  vacant: 'bg-muted text-muted-foreground',
};

export function PropertyListCard({
  property,
  actionCount,
  href,
}: {
  property: Property;
  actionCount: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative block rounded-2xl border bg-card p-4 pt-3.5 transition-all active:scale-[0.99]',
        actionCount > 0
          ? 'border-destructive/25 shadow-sm shadow-destructive/5'
          : 'border-border hover:border-primary/20 hover:shadow-md hover:shadow-primary/5',
      )}
    >
      {actionCount > 0 && (
        <div className="absolute top-3 right-3">
          <NeedActionBadge count={actionCount} size="sm" />
        </div>
      )}

      <div className="flex items-start gap-3 pr-16">
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
              STATUS_STYLES[property.leaseStatus],
            )}
          >
            {property.leaseStatus}
          </span>
          <p className="mt-1.5 font-semibold leading-snug">{property.address}</p>
          <p className="text-muted-foreground text-xs">{property.suburb}</p>
          <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
            <p>
              <span className="text-foreground/70">Tenant</span> · {property.tenantName}
            </p>
            {property.rentWeekly > 0 && (
              <p>
                <span className="text-foreground/70">Rent</span> ·{' '}
                <span className="text-foreground font-medium tabular-nums">
                  {formatCurrency(property.rentWeekly)}/wk
                </span>
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="text-muted-foreground mt-6 size-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}
