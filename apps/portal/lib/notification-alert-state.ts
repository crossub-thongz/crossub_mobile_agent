const ALERTED_IDS_KEY = 'crossub-agent-alerted-notification-ids';

function readAlertedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(ALERTED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function hasAlertedNotification(id: string): boolean {
  return readAlertedIds().has(id);
}

export function markNotificationAlerted(id: string): void {
  if (typeof window === 'undefined') return;
  const next = readAlertedIds();
  next.add(id);
  try {
    sessionStorage.setItem(ALERTED_IDS_KEY, JSON.stringify([...next]));
  } catch {
    // ignore quota errors
  }
}
