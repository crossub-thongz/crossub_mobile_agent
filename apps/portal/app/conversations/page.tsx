'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ConversationsWorkspace } from '@/components/agent/conversations/conversations-workspace';
import { AgentShell } from '@/components/layout/agent-shell';
import { CONVERSATIONS_COPY } from '@/constants/conversations';
import { ROUTES } from '@/constants/routes';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';

/** Self-Manage only; every other tier keeps Messages and the Message Center. */
export default function ConversationsPage() {
  const router = useRouter();
  const { ready, selfManaged } = useSelfManagedAccess();
  const redirect = ready && !selfManaged;

  useEffect(() => {
    if (redirect) router.replace(ROUTES.MESSAGES);
  }, [redirect, router]);

  if (!ready || redirect) return null;

  return (
    <AgentShell title={CONVERSATIONS_COPY.title} wide fillMain hideNeedAction hideGlobalFabs>
      <ConversationsWorkspace />
    </AgentShell>
  );
}
