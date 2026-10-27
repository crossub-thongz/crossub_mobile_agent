'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { OVERVIEW_COPY } from '@/constants/property-tenancies';
import type { PropertyTenancyOverview } from '@/lib/crossub-api/agent-tenancy-client';

/** The tenancy overview once loaded; a loading line until then. */
export function TenancyOverviewGate({
  record,
  children,
}: {
  record: PropertyTenancyOverview | null;
  children: (record: PropertyTenancyOverview) => ReactNode;
}) {
  if (record) return <>{children(record)}</>;
  return (
    <p className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
      <Loader2 className="size-4 animate-spin" />
      {OVERVIEW_COPY.LOADING}
    </p>
  );
}
