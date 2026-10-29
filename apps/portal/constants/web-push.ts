/** Push alerts on this phone (Jarvis 2.2): the morning briefing and CROSSUB team replies in Cros. */

/** The service worker that shows the alerts, served from `public/`. */
export const WEB_PUSH_SERVICE_WORKER_URL = '/sw.js';

/** Where this phone stands on alerts. */
export const WEB_PUSH_STATUS = {
  /** Still checking the browser and the server. */
  CHECKING: 'checking',
  /** The browser cannot receive push alerts. */
  UNSUPPORTED: 'unsupported',
  /** iPhone: alerts only work once the app is added to the Home Screen. */
  NEEDS_INSTALL: 'needs_install',
  /** The server has no push keys yet. */
  UNCONFIGURED: 'unconfigured',
  /** The person blocked notifications for this site. */
  BLOCKED: 'blocked',
  OFF: 'off',
  ON: 'on',
} as const;

export type WebPushStatus = (typeof WEB_PUSH_STATUS)[keyof typeof WEB_PUSH_STATUS];

/** The Notification permission the browser reports when the person blocked the site. */
export const NOTIFICATION_PERMISSION_DENIED: NotificationPermission = 'denied';
export const NOTIFICATION_PERMISSION_GRANTED: NotificationPermission = 'granted';

export const WEB_PUSH_COPY = {
  LABEL: 'Alerts on this phone',
  DESCRIPTION: 'Your morning briefing and CROSSUB team replies in Cros, even when the app is closed.',
  STATUS: {
    [WEB_PUSH_STATUS.CHECKING]: 'Checking this phone…',
    [WEB_PUSH_STATUS.UNSUPPORTED]: 'This browser cannot show alerts.',
    [WEB_PUSH_STATUS.NEEDS_INSTALL]: 'On iPhone, add CROSSUB to your Home Screen (Share, then Add to Home Screen), open it from there, then turn alerts on.',
    [WEB_PUSH_STATUS.UNCONFIGURED]: 'Alerts are not available yet.',
    [WEB_PUSH_STATUS.BLOCKED]: 'Notifications are blocked for CROSSUB. Allow them in your phone or browser settings, then try again.',
    [WEB_PUSH_STATUS.OFF]: null,
    [WEB_PUSH_STATUS.ON]: null,
  } satisfies Record<WebPushStatus, string | null>,
  TURNED_ON: 'Alerts are on for this phone.',
  TURNED_OFF: 'Alerts are off for this phone.',
} as const;

/** Query parameter a push link uses to open Cros on arrival (`/dashboard?cros=open`). */
export const CROS_OPEN_PARAM = { NAME: 'cros', OPEN: 'open' } as const;
