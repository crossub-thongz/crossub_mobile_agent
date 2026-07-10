'use client';

import { notFound, useParams } from 'next/navigation';

import { LeasingPackageWorkspace } from '@/components/leasing-workflow/leasing-package-workspace';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { formatPropertyFullAddress } from '@/lib/utils';

export default function PropertyLeasingWorkflowPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const { properties } = useAgentData();
  const property = properties.find((p) => p.id === propertyId);

  if (!property) notFound();

  return (
    <AgentShell
      title="Leasing workflow"
      backHref={propertyDetail(propertyId)}
      backLabel="Property"
    >
      <div className="space-y-4 pb-8">
        <LeasingPackageWorkspace
          propertyId={property.id}
          propertyAddress={formatPropertyFullAddress(property)}
          rentWeekly={property.rentWeekly}
        />
      </div>
    </AgentShell>
  );
}
