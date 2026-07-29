import type { AgentPageGuideId } from '@/constants/agent-page-guides';
import { AGENT_PAGE_GUIDE_STORAGE_PREFIX } from '@/constants/agent-page-guides';

export type AgentPageGuideStatus = 'completed' | 'skipped';

function storageKey(guideId: AgentPageGuideId): string {
  return `${AGENT_PAGE_GUIDE_STORAGE_PREFIX}${guideId}`;
}

export function isAgentPageGuideSeen(guideId: AgentPageGuideId): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(storageKey(guideId));
    return raw === 'completed' || raw === 'skipped';
  } catch {
    return true;
  }
}

export function markAgentPageGuideSeen(
  guideId: AgentPageGuideId,
  status: AgentPageGuideStatus,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(guideId), status);
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetAgentPageGuides(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(AGENT_PAGE_GUIDE_STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
