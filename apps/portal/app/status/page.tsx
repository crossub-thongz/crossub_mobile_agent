'use client';

import { SectionStatusGrid } from '@/components/agent/section-status-grid';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';

export default function StatusPage() {
  const { sectionStatus } = useAgentData();

  return (
    <AgentShell title="Status">
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm leading-relaxed">
          One place to see where every job stands — tap a section for details.
        </p>
        <SectionStatusGrid sections={sectionStatus} />
      </div>
    </AgentShell>
  );
}
