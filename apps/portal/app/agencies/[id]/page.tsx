'use client';

import { notFound, useParams } from 'next/navigation';
import { Building2, Mail, Phone } from 'lucide-react';

import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { PropertyListCard } from '@/components/agent/property-list-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { Agency } from '@/lib/types';
import { propertyDetail, ROUTES } from '@/constants/routes';
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

export default function AgencyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { agencies, properties, getPropertyActions } = useAgentData();
  const agency = agencies.find((a) => a.id === id);

  if (!agency) notFound();

  const agencyProperties = properties.filter((p) => p.agencyId === id);
  const occupied = agencyProperties.filter((p) => p.leaseStatus !== 'vacant').length;
  const vacant = agencyProperties.length - occupied;

  return (
    <AgentShell title={agency.name} backHref={ROUTES.AGENCIES} backLabel="Agencies">
      <div className="space-y-4 pb-8">
        <div className="rounded-2xl border bg-gradient-to-br from-card to-secondary/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Client agency</p>
              <p className="mt-0.5 text-lg font-semibold leading-tight">{agency.name}</p>
              {agency.company && agency.company !== agency.name && (
                <p className="text-muted-foreground mt-0.5 text-sm">{agency.company}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold',
                  STATUS_STYLES[agency.status],
                )}
              >
                {STATUS_LABEL[agency.status]}
              </span>
              <PortalServiceLevelBadge level={agency.portalServiceLevel} size="xs" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border bg-card/60 p-2">
              <p className="text-lg font-semibold tabular-nums">{agencyProperties.length}</p>
              <p className="text-muted-foreground text-[10px]">Properties</p>
            </div>
            <div className="rounded-xl border bg-card/60 p-2">
              <p className="text-lg font-semibold tabular-nums">{occupied}</p>
              <p className="text-muted-foreground text-[10px]">Occupied</p>
            </div>
            <div className="rounded-xl border bg-card/60 p-2">
              <p className="text-lg font-semibold tabular-nums">{vacant}</p>
              <p className="text-muted-foreground text-[10px]">Vacant</p>
            </div>
          </div>
        </div>

        <InfoPanel title="Client contact" icon={Building2}>
          <InfoRow label="Agency" value={agency.name} />
          {agency.company && <InfoRow label="Company" value={agency.company} />}
          <InfoRow label="Status" value={STATUS_LABEL[agency.status] ?? agency.status} />
          <InfoRow label="Portal access">
            <PortalServiceLevelBadge level={agency.portalServiceLevel} />
          </InfoRow>
          {agency.contactName && <InfoRow label="Contact" value={agency.contactName} />}
          {agency.contactEmail && (
            <InfoRow label="Email">
              <a
                href={`mailto:${agency.contactEmail}`}
                className="flex items-center gap-1.5 text-primary"
              >
                <Mail className="size-3.5" />
                {agency.contactEmail}
              </a>
            </InfoRow>
          )}
          {agency.contactPhone && (
            <InfoRow label="Mobile">
              <a
                href={`tel:${agency.contactPhone.replace(/\s/g, '')}`}
                className="flex items-center gap-1.5"
              >
                <Phone className="size-3.5" />
                {agency.contactPhone}
              </a>
            </InfoRow>
          )}
        </InfoPanel>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Properties ({agencyProperties.length})</h2>
            {agencyProperties.length > 0 && (
              <p className="text-muted-foreground text-xs tabular-nums">
                {occupied} occupied · {vacant} vacant
              </p>
            )}
          </div>
          {agencyProperties.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
              No properties under this agency yet.
            </p>
          ) : (
            agencyProperties.map((p) => (
              <PropertyListCard
                key={p.id}
                property={p}
                actionCount={getPropertyActions(p.id).length}
                href={propertyDetail(p.id)}
              />
            ))
          )}
        </section>
      </div>
    </AgentShell>
  );
}
