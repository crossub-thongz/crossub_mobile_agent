'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAgentInbox } from '@/components/providers/agent-inbox-provider';

/**
 * Forwards a Messages page to `target` when the agent's one inbox is Conversations. True while
 * the inbox is not yet known or the page is forwarding, so the page renders nothing meanwhile.
 */
export function useOneInboxRedirect(target: string): boolean {
  const router = useRouter();
  const { ready, conversationsOnly } = useAgentInbox();
  const redirect = ready && conversationsOnly;
  useEffect(() => {
    if (redirect) router.replace(target);
  }, [redirect, router, target]);
  return !ready || redirect;
}
