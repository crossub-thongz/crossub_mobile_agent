'use client';

const STORAGE_KEY = 'crossub:agent-portal-recent-properties';
export const MAX_RECENT_PROPERTIES = 5;

export type RecentPropertyVisit = {
  id: string;
  label: string;
};

export function readRecentPropertyVisits(): RecentPropertyVisit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentPropertyVisit[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          typeof item?.id === 'string' &&
          item.id.length > 0 &&
          typeof item?.label === 'string' &&
          item.label.length > 0,
      )
      .slice(0, MAX_RECENT_PROPERTIES);
  } catch {
    return [];
  }
}

function writeRecentPropertyVisits(items: RecentPropertyVisit[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_RECENT_PROPERTIES)),
    );
  } catch {
    // best-effort
  }
}

export function recordRecentPropertyVisit(id: string, label: string): RecentPropertyVisit[] {
  const trimmed = label.trim();
  if (!id || !trimmed) return readRecentPropertyVisits();

  const next = [
    { id, label: trimmed },
    ...readRecentPropertyVisits().filter((item) => item.id !== id),
  ].slice(0, MAX_RECENT_PROPERTIES);

  writeRecentPropertyVisits(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crossub:agent-recent-properties-updated'));
  }

  return next;
}

export const RECENT_PROPERTIES_UPDATED_EVENT = 'crossub:agent-recent-properties-updated';
