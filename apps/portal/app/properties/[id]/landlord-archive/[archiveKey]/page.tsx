'use client';

import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { Archive } from 'lucide-react';

import { ArchivedLandlordOverview } from '@/components/agent/archived-landlord-overview';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { findArchivedLandlord } from '@/lib/property-archive';
import { formatDate, formatDateTime, formatPropertyFullAddress } from '@/lib/utils';

export default function ArchivedLandlordPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const archiveKey = params.archiveKey as string;
  const { properties } = useAgentData();

  const property = properties.find((p) => p.id === propertyId);
  const landlord = useMemo(
    () => (property ? findArchivedLandlord(property.registryDraft, archiveKey) : undefined),
    [property, archiveKey],
  );

  if (!property || !landlord) notFound();

  const propertyAddress = formatPropertyFullAddress(property);
  const leasePeriod =
    landlord.leaseStartDate || landlord.leaseEndDate
      ? `${landlord.leaseStartDate ? formatDate(landlord.leaseStartDate) : '—'} — ${
          landlord.leaseEndDate ? formatDate(landlord.leaseEndDate) : '—'
        }`
      : null;

  return (
    <AgentShell
      title="Archived landlord"
      backHref={`${propertyDetail(propertyId)}?section=archive&tab=Archive`}
      backLabel="Archived"
    >
      <div className="space-y-4 pb-8">
        <section className="rounded-xl border bg-card p-3">
          <div className="flex items-start gap-2">
            <Archive className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{landlord.name}</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">{propertyAddress}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Archived {landlord.archivedAt ? formatDateTime(landlord.archivedAt) : '—'}
              </p>
              {leasePeriod ? (
                <p className="text-muted-foreground mt-1 text-xs">Lease period: {leasePeriod}</p>
              ) : null}
            </div>
          </div>
        </section>

        <ArchivedLandlordOverview landlord={landlord} />
      </div>
    </AgentShell>
  );
}
