const storageKey = (userId: string) => `crossub.training.seen.${userId}`;

function readIds(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function hasSeenTraining(userId: string, videoId: string): boolean {
  return readIds(userId).includes(videoId);
}

export function markTrainingSeen(userId: string, videoId: string): void {
  if (typeof window === 'undefined') return;
  const ids = readIds(userId);
  if (ids.includes(videoId)) return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify([...ids, videoId]));
}
