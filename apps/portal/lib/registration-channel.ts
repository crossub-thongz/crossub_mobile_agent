import { api } from '@/lib/api';

const FROM_SITE = 'site';
const CHANNEL_KEY = 'cros_reg_from';

/** Remember a click from the marketing site across the registration steps in this tab. */
export function rememberRegistrationChannel() {
  if (new URLSearchParams(window.location.search).get('from') === FROM_SITE) {
    sessionStorage.setItem(CHANNEL_KEY, FROM_SITE);
  }
}

/** Registration still succeeds if this call fails or the API is not updated yet. */
export function reportRegistrationChannel() {
  const fromSite =
    sessionStorage.getItem(CHANNEL_KEY) === FROM_SITE ||
    new URLSearchParams(window.location.search).get('from') === FROM_SITE;
  void api
    .post('/marketing/registration-channel', {
      channel: fromSite ? 'marketing_site' : 'agent_portal',
    })
    .then(() => {
      sessionStorage.removeItem(CHANNEL_KEY);
    })
    .catch(() => undefined);
}
