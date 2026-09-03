'use client';

import { SupportHub } from '@/components/agent/support/support-hub';
import { AgentShell } from '@/components/layout/agent-shell';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { ROUTES } from '@/constants/routes';

export default function SupportPage() {
  const isV2 = useIsAgentUiV2();

  if (isV2) {
    return (
      <AgentShell>
        <SupportHub />
      </AgentShell>
    );
  }

  return (
    <AgentShell title="Support" backHref={ROUTES.MORE} backLabel="More">
      <SupportHub />
    </AgentShell>
  );
}
