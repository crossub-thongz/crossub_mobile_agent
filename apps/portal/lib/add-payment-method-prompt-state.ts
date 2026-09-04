const SYDNEY_TZ = 'Australia/Sydney';
const DISMISSED_DAY_KEY_PREFIX = 'crossub-agent-l2-payment-method-prompt-dismissed';

function storageKey(userId: string): string {
  return `${DISMISSED_DAY_KEY_PREFIX}:${userId}`;
}

/** Sydney calendar day as YYYY-MM-DD — matches billing and open-batch boundaries. */
export function sydneyCalendarDay(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: SYDNEY_TZ });
}

/** True when the Level 2 add-card prompt was dismissed earlier today (Sydney). */
export function isL2PaymentMethodPromptDismissedToday(userId: string, now = new Date()): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    return stored === sydneyCalendarDay(now);
  } catch {
    return false;
  }
}

/** Remember that the agent dismissed the Level 2 add-card prompt for today. */
export function dismissL2PaymentMethodPromptForToday(userId: string, now = new Date()): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), sydneyCalendarDay(now));
  } catch {
    // ignore quota errors
  }
}
