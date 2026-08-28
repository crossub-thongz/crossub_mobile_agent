'use client';

import { TeamUsersHub } from '@/components/agent/team-users-hub';
import { AgentShell } from '@/components/layout/agent-shell';
import { ROUTES } from '@/constants/routes';

export default function TeamPage() {
  return (
    <AgentShell title="Team & users" backHref={ROUTES.MORE} backLabel="More">
      <TeamUsersHub />
    </AgentShell>
  );
}
