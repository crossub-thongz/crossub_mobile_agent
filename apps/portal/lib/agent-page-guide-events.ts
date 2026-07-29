export const PORTAL_WELCOME_DISMISSED_EVENT = 'crossub:portal-welcome-dismissed';

export function notifyPortalWelcomeDismissed(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PORTAL_WELCOME_DISMISSED_EVENT));
}
