import { ROUTES } from '@/constants/routes';
import { CROS_OPEN_PARAM } from '@/constants/web-push';

/** The link that opens Cros on the dashboard. */
export const CROS_OPEN_HREF = `${ROUTES.DASHBOARD}?${CROS_OPEN_PARAM.NAME}=${CROS_OPEN_PARAM.OPEN}`;

/** Whether an in-app link is one that opens Cros (`/dashboard?cros=open`), not a screen. */
export function isCrosOpenHref(href: string): boolean {
  const query = href.split('#')[0].split('?')[1];
  if (!query) return false;
  return new URLSearchParams(query).get(CROS_OPEN_PARAM.NAME) === CROS_OPEN_PARAM.OPEN;
}
