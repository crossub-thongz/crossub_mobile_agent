'use client';

import { CommunicationsLogClient } from '@/components/agent/communications-log-client';
import { AgentShell } from '@/components/layout/agent-shell';

export default function CommunicationsPage() {
  return (
    <AgentShell wide hideNeedAction>
      <CommunicationsLogClient />
    </AgentShell>
  );
}
