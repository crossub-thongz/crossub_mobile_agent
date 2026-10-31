import { CROS_OPEN_PARAM } from '@/constants/web-push';

/** Whether an in-app link is one that opens Cros (`/dashboard?cros=open`), not a screen. */
export function isCrosOpenHref(href: string): boolean {
  const query = href.split('#')[0].split('?')[1];
  if (!query) return false;
  return new URLSearchParams(query).get(CROS_OPEN_PARAM.NAME) === CROS_OPEN_PARAM.OPEN;
}
