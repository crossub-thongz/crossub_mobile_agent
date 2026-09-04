'use client';

import { AgentWorkflowTourHub } from '@/components/agent/agent-workflow-tour-hub';
import { AgentShell } from '@/components/layout/agent-shell';
import { PageIntro } from '@/components/agent/page-intro';
import { ROUTES } from '@/constants/routes';

export default function AgentWorkflowToursPage() {
  return (
    <AgentShell title="Workflow demo tours" backHref={ROUTES.SUPPORT} backLabel="Support">
      <PageIntro
        description="Interactive spotlight tours for maintenance, inspections, new leasing, end leasing, and tribunal — walk through each lifecycle on live Tasks and job pages."
      />
      <AgentWorkflowTourHub className="mt-6 max-w-3xl" />
    </AgentShell>
  );
}
