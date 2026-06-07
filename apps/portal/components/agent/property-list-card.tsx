import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';

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
        'group block rounded-2xl border bg-card p-4 transition-all active:scale-[0.99]',
        actionCount > 0
          ? 'border-destructive/25 shadow-sm shadow-destructive/5'
          : 'border-border hover:border-primary/20 hover:shadow-md hover:shadow-primary/5',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl',
            actionCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
          )}
        >
          <MapPin className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {actionCount > 0 && <NeedActionBadge count={actionCount} />}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                STATUS_STYLES[property.leaseStatus],
              )}
            >
              {property.leaseStatus}
            </span>
          </div>
          <p className="mt-1.5 font-semibold leading-snug">{property.address}</p>
          <p className="text-muted-foreground text-xs">{property.suburb}</p>
          <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
            <p>
              <span className="text-foreground/70">Landlord</span> · {property.homeOwnerName}
            </p>
            <p>
              <span className="text-foreground/70">Tenant</span> · {property.tenantName}
            </p>
          </div>
          {property.openTasks > 0 && (
            <p className="text-primary mt-2 text-[11px] font-medium">
              {property.openTasks} open task{property.openTasks === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {property.rentWeekly > 0 && (
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(property.rentWeekly)}
              <span className="text-muted-foreground text-[10px] font-normal">/wk</span>
            </span>
          )}
          <ChevronRight className="text-muted-foreground size-4 transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </div>
    </Link>
  );
}
