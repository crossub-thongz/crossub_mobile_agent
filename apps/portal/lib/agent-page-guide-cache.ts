import type { AgentPageGuideId } from '@/constants/agent-page-guides';
import type { AgentPageGuideStatus } from '@/lib/crossub-api/agent-client';

const STORAGE_PREFIX = 'crossub-agent-page-guides:';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readCachedPageGuides(
  userId: string,
): Record<string, AgentPageGuideStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const seen: Record<string, AgentPageGuideStatus> = {};
    for (const [guideId, status] of Object.entries(parsed)) {
      if (status === 'completed' || status === 'skipped') {
        seen[guideId] = status;
      }
    }
    return seen;
  } catch {
    return {};
  }
}

export function writeCachedPageGuides(
  userId: string,
  seen: Record<string, AgentPageGuideStatus>,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(seen));
  } catch {
    /* ignore quota / private mode */
  }
}

export function markCachedPageGuide(
  userId: string,
  guideId: AgentPageGuideId,
  status: AgentPageGuideStatus,
): Record<string, AgentPageGuideStatus> {
  const next = { ...readCachedPageGuides(userId), [guideId]: status };
  writeCachedPageGuides(userId, next);
  return next;
}

export function clearCachedPageGuides(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export function mergePageGuideSeenMaps(
  ...maps: Array<Record<string, AgentPageGuideStatus>>
): Record<string, AgentPageGuideStatus> {
  return maps.reduce<Record<string, AgentPageGuideStatus>>(
    (merged, map) => ({ ...merged, ...map }),
    {},
  );
}
