import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';

import type { Agency } from '@/lib/types';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<Agency['status'], string> = {
  ACTIVE: 'bg-primary/15 text-primary',
  ONBOARDING: 'bg-amber-500/15 text-amber-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

const STATUS_LABEL: Record<Agency['status'], string> = {
  ACTIVE: 'Active',
  ONBOARDING: 'Onboarding',
  INACTIVE: 'Inactive',
};

export function AgencyListCard({
  agency,
  href,
}: {
  agency: Agency;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative block rounded-2xl border border-border bg-card p-4 pt-3.5 transition-all active:scale-[0.99]',
        'hover:border-primary/20 hover:shadow-md hover:shadow-primary/5',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                STATUS_STYLES[agency.status],
              )}
            >
              {STATUS_LABEL[agency.status]}
            </span>
            <PortalServiceLevelBadge level={agency.portalServiceLevel} size="xs" />
          </div>
          <p className="mt-1.5 font-semibold leading-snug">{agency.name}</p>
          {agency.company && agency.company !== agency.name && (
            <p className="text-muted-foreground text-xs">{agency.company}</p>
          )}
          <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
            <p>
              <span className="text-foreground/70">Properties</span> ·{' '}
              <span className="text-foreground font-medium tabular-nums">
                {agency.propertyCount}
              </span>
            </p>
            {agency.contactName && (
              <p>
                <span className="text-foreground/70">Contact</span> · {agency.contactName}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="text-muted-foreground mt-6 size-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}
