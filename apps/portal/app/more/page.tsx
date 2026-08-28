'use client';

import { MoreHub } from '@/components/agent/more/more-hub';
import { AgentShell } from '@/components/layout/agent-shell';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES } from '@/constants/routes';

export default function MorePage() {
  const isV2 = useIsAgentUiV2();

  if (isV2) {
    return (
      <AgentShell>
        <MoreHub />
      </AgentShell>
    );
  }

  return (
    <AgentShell title="More" backHref={ROUTES.DASHBOARD}>
      <MoreHub />
    </AgentShell>
  );
}
