const DISMISSED_KEY = 'crossub-agent-add-to-home-dismissed';

export function isAddToHomeScreenDismissedForSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissAddToHomeScreenForSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // ignore quota errors
  }
}

/** Cleared on logout so the prompt can appear again on the next sign-in. */
export function clearAddToHomeScreenDismissedForSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    // ignore
  }
}
