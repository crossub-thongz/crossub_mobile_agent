const FROM_SITE = 'site';
const CHANNEL_KEY = 'cros_reg_from';

/** Remember a click from the marketing site across the registration steps in this tab. */
export function rememberRegistrationChannel() {
  if (new URLSearchParams(window.location.search).get('from') === FROM_SITE) {
    sessionStorage.setItem(CHANNEL_KEY, FROM_SITE);
  }
}

export function currentRegistrationChannel(): 'marketing_site' | 'agent_portal' {
  const fromSite =
    sessionStorage.getItem(CHANNEL_KEY) === FROM_SITE ||
    new URLSearchParams(window.location.search).get('from') === FROM_SITE;
  return fromSite ? 'marketing_site' : 'agent_portal';
}

/** Kept until the page moves on. A normal fetch is cancelled by that navigation. */
export async function reportRegistrationChannel() {
  const channel = currentRegistrationChannel();
  try {
    await fetch('/api/marketing/registration-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({ channel }),
    });
    sessionStorage.removeItem(CHANNEL_KEY);
  } catch {
    /* The account is already created. The signup request also sends the source. */
  }
}
