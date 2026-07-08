'use client';

import { useParams } from 'next/navigation';

import { InspectionDetailView } from '@/components/inspections/inspection-detail-view';
import { AgentShell } from '@/components/layout/agent-shell';
import { ROUTES } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';

export default function InspectionDetailPage() {
  const params = useParams();
  const inspectionId = String(params.id);
  const back = useBackNavigation(ROUTES.INSPECTIONS, 'Inspections');

  return (
    <AgentShell title="Inspection job" backHref={back.href} backLabel={back.label}>
      <InspectionDetailView inspectionId={inspectionId} />
    </AgentShell>
  );
}
