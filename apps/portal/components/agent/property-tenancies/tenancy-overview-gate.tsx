'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { OVERVIEW_COPY } from '@/constants/property-tenancies';
import type { TrustResource } from '@/hooks/use-trust-resource';
import type { PropertyTenancyOverview } from '@/lib/crossub-api/agent-tenancy-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Loading, error (with retry) or the tenancy overview, for the Self-Manage sections. */
export function TenancyOverviewGate({
  resource,
  children,
}: {
  resource: TrustResource<PropertyTenancyOverview>;
  children: (record: PropertyTenancyOverview) => ReactNode;
}) {
  if (resource.data) return <>{children(resource.data)}</>;
  if (resource.error) {
    return (
      <div className="v2-dashboard__card space-y-3 rounded-2xl border p-4 text-sm">
        <p className="text-muted-foreground">{apiErrorMessage(resource.error, OVERVIEW_COPY.LOAD_FAILED)}</p>
        <Button type="button" variant="outline" size="sm" onClick={resource.reload}>
          {OVERVIEW_COPY.RETRY}
        </Button>
      </div>
    );
  }
  return (
    <p className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
      <Loader2 className="size-4 animate-spin" />
      {OVERVIEW_COPY.LOADING}
    </p>
  );
}
