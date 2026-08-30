const ALERTED_IDS_KEY = 'crossub-agent-alerted-notification-ids';

function readStorage(storage: Storage): Set<string> {
  try {
    const raw = storage.getItem(ALERTED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function readAlertedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const local = readStorage(window.localStorage);
  const session = readStorage(window.sessionStorage);
  return new Set([...local, ...session]);
}

function writeAlertedIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify([...ids]);
  try {
    window.localStorage.setItem(ALERTED_IDS_KEY, payload);
  } catch {
    // ignore quota errors
  }
  try {
    window.sessionStorage.setItem(ALERTED_IDS_KEY, payload);
  } catch {
    // ignore quota errors
  }
}

export function hasAlertedNotification(id: string): boolean {
  return readAlertedIds().has(id);
}

export function markNotificationAlerted(id: string): void {
  const next = readAlertedIds();
  next.add(id);
  writeAlertedIds(next);
}

export function markNotificationsAlerted(ids: readonly string[]): void {
  const next = readAlertedIds();
  for (const id of ids) next.add(id);
  writeAlertedIds(next);
}
