'use client';

import { useSearchParams } from 'next/navigation';

import { InspectionsHub } from '@/components/inspections/inspections-hub';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';

export default function InspectionsPage() {
  const searchParams = useSearchParams();
  const propertyParam = searchParams.get('property');
  const { inspections, properties } = useAgentData();

  const propertyLabel = propertyParam
    ? properties.find((p) => p.id === propertyParam)
    : undefined;

  return (
    <AgentShell title="Inspections">
      <InspectionsHub
        inspections={inspections}
        propertyFilterId={propertyParam}
        propertyLabel={
          propertyLabel ? `${propertyLabel.address}, ${propertyLabel.suburb}` : undefined
        }
      />
    </AgentShell>
  );
}
