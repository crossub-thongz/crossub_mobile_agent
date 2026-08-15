/**
 * The non-production banner.
 *
 * Two hosts serve this app and they differ by one `-prod` suffix while pointing at
 * different databases: `crossub-mobile-agent.onrender.com` (staging API, staging DB) and
 * `crossub-mobile-agent-prod.onrender.com` (production). An agent who lands on the wrong
 * one and types a live password is told `Invalid email or password`, because the account
 * genuinely does not exist in that database — so a wrong-host visit is indistinguishable
 * from a wrong password, and it gets reported as a broken login every time.
 *
 * The banner exists to make that one minute of confusion impossible. It says where you
 * are and where to go instead, before the password is typed.
 */

/** Environment variables read to decide whether the banner shows. */
export const ENVIRONMENT_BANNER_ENV_KEY = {
  /** Explicit override. Set it and the banner says exactly this. */
  LABEL: 'CROSSUB_ENVIRONMENT_LABEL',
  /** Fallback signal — the API this deployment proxies to. */
  API_INTERNAL_URL: 'API_INTERNAL_URL',
  /** Where to send someone who landed here by mistake. */
  PRODUCTION_URL: 'CROSSUB_AGENT_PRODUCTION_URL',
} as const;

/**
 * Labels that mean "this IS production, show nothing".
 *
 * Compared lowercased so `Production`, `PROD` and `live` all disable the banner. An
 * explicit production label is the documented way to force the banner off on a host the
 * URL heuristic would otherwise flag.
 */
export const PRODUCTION_ENVIRONMENT_LABELS: readonly string[] = [
  'production',
  'prod',
  'live',
];

/**
 * Substrings in `API_INTERNAL_URL` that mark a non-production backend.
 *
 * This is the reason the banner works on staging with no dashboard change at all: the
 * staging service already proxies to a host with `staging` in its name, so the signal is
 * present today. Production's API URL contains none of these, so production stays silent
 * whether or not anybody remembers to set a variable — the failure direction that matters.
 */
export const NON_PRODUCTION_API_URL_MARKERS: readonly string[] = [
  'staging',
  'uat',
  'localhost',
  '127.0.0.1',
];

/** Label used when the backend looks non-production but nobody named the environment. */
export const INFERRED_ENVIRONMENT_LABEL = 'STAGING';

export const ENVIRONMENT_BANNER_COPY = {
  /** Read before the password is typed, so it leads with the consequence. */
  DETAIL: 'Test environment — your live login will not work here.',
  LINK: 'Open the live app',
} as const;

/**
 * Strip height, excluding the notch. The layout adds `env(safe-area-inset-top)` on top and
 * every offset downstream reads the composed `--env-banner-height`, defaulting to `0px`
 * when the banner is absent — so production computes exactly the values it does today.
 */
export const ENVIRONMENT_BANNER_HEIGHT = '1.875rem';

/** The CSS variable every fixed element offsets by. */
export const ENVIRONMENT_BANNER_HEIGHT_VAR = '--env-banner-height';

/** Fallback target for the "live app" link when no URL is configured. */
export const DEFAULT_PRODUCTION_APP_URL =
  'https://crossub-mobile-agent-prod.onrender.com';
