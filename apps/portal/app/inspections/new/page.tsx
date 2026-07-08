'use client';

import { CreateInspectionWizard } from '@/components/inspections/create-inspection-wizard';
import { AgentShell } from '@/components/layout/agent-shell';
import { ROUTES } from '@/constants/routes';

export default function NewInspectionPage() {
  return (
    <AgentShell title="Add inspection" backHref={ROUTES.INSPECTIONS}>
      <CreateInspectionWizard />
    </AgentShell>
  );
}
