'use client';

import Link from 'next/link';

import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';

export function InspectionOnlyPlanBanner() {
  const { isInspectionOnlyAgent, portalAccessReady } = useAgentData();

  if (!portalAccessReady || !isInspectionOnlyAgent) return null;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-relaxed">
      <div className="flex flex-wrap items-center gap-2">
        <PortalServiceLevelBadge level="LEVEL_1_INSPECTION_ONLY" variant="level" size="sm" />
        <p className="font-medium">Inspection Only Service</p>
      </div>
      <p className="text-muted-foreground mt-2">
        Your account is limited to properties, inspections, and tribunal. Leasing, maintenance,
        accounting, and other Full Service modules are hidden.
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        Need the full platform?{' '}
        <Link href={ROUTES.PRICING} className="text-primary font-medium hover:underline">
          View Full Service pricing
        </Link>
        .
      </p>
    </div>
  );
}
