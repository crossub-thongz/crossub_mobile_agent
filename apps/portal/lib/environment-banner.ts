import {
  DEFAULT_PRODUCTION_APP_URL,
  ENVIRONMENT_BANNER_COPY,
  INFERRED_ENVIRONMENT_LABEL,
  NON_PRODUCTION_API_URL_MARKERS,
  PRODUCTION_ENVIRONMENT_LABELS,
} from '@/constants/environment-banner';

export type EnvironmentBanner = {
  label: string;
  detail: string;
  productionUrl: string;
};

export type EnvironmentBannerInput = {
  label?: string | null;
  apiInternalUrl?: string | null;
  productionUrl?: string | null;
};

/**
 * Decide whether this deployment announces itself as non-production.
 *
 * Resolution order, and the order is the whole design:
 *
 * 1. **An explicit label wins.** Naming the environment is the only way to be certain, and
 *    naming it as production is the documented escape hatch for a host the URL heuristic
 *    would otherwise flag.
 * 2. **Otherwise the API URL is the signal.** Relying on someone remembering to set a
 *    variable on the staging dashboard would mean the banner is missing precisely when it
 *    is needed — a new service, a restored one, a copy made for testing. The backend a
 *    deployment talks to is the thing that actually differs, so it is what gets read.
 * 3. **Silence is the default.** No label and no marker returns null, so production shows
 *    nothing without configuration. A banner that could appear on production would be
 *    worse than no banner at all, so the uncertain case fails toward silence.
 */
export function resolveEnvironmentBanner(
  input: EnvironmentBannerInput,
): EnvironmentBanner | null {
  const label = input.label?.trim() ?? '';
  const productionUrl =
    input.productionUrl?.trim() || DEFAULT_PRODUCTION_APP_URL;

  if (label) {
    if (PRODUCTION_ENVIRONMENT_LABELS.includes(label.toLowerCase())) return null;
    return {
      label: label.toUpperCase(),
      detail: ENVIRONMENT_BANNER_COPY.DETAIL,
      productionUrl,
    };
  }

  if (!isNonProductionApiUrl(input.apiInternalUrl)) return null;

  return {
    label: INFERRED_ENVIRONMENT_LABEL,
    detail: ENVIRONMENT_BANNER_COPY.DETAIL,
    productionUrl,
  };
}

/**
 * Match markers against the host only.
 *
 * A path or query string can carry any word at all, and matching the whole URL would let
 * something like `?redirect=/staging` light the banner on production. The host is the part
 * that identifies the backend, so it is the only part compared.
 */
export function isNonProductionApiUrl(apiInternalUrl?: string | null): boolean {
  const raw = apiInternalUrl?.trim();
  if (!raw) return false;

  const host = extractHost(raw);
  if (!host) return false;

  return NON_PRODUCTION_API_URL_MARKERS.some((marker) => host.includes(marker));
}

/**
 * `API_INTERNAL_URL` is not always a well-formed absolute URL — Render's internal
 * addresses are routinely written `crossub-api-staging:10000`, which `new URL()` parses as
 * a protocol rather than a host. Fall back to a manual split so the common internal form
 * is still read correctly instead of silently returning no host.
 */
function extractHost(raw: string): string {
  try {
    const parsed = new URL(raw).hostname;
    // `crossub-api-staging:10000` parses without throwing — as protocol
    // `crossub-api-staging:` and path `10000` — leaving hostname EMPTY. Trusting the
    // no-throw path here would drop the exact form Render uses internally, so an empty
    // hostname falls through to the manual split rather than being returned.
    if (parsed) return parsed.toLowerCase();
  } catch {
    // Not URL-shaped at all; the manual split below handles it.
  }

  return raw
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .split('/')[0]
    .split('?')[0]
    .toLowerCase();
}
