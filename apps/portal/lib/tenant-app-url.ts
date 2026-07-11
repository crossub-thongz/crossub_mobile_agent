/** Staging tenant portal — default when env is unset (no localhost in QR / apply links). */
export const STAGING_TENANT_APP_URL = 'https://crossub-mobile-tenant.onrender.com';

/** Public tenant app base URL for apply links, QR codes, and credential handoff. */
export function tenantAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_TENANT_APP_URL?.trim();
  if (raw && raw.length > 0) return raw.replace(/\/$/, '');
  return STAGING_TENANT_APP_URL;
}

/** Guest rental application deep link (optional viewing session for applicant tracking). */
export function tenantAppApplyUrl(
  propertyId: string,
  viewingSessionId?: string | null,
): string {
  const base = `${tenantAppBaseUrl()}/properties/${encodeURIComponent(propertyId)}/apply`;
  if (!viewingSessionId) return base;
  return `${base}?sessionId=${encodeURIComponent(viewingSessionId)}`;
}

/** Prefer client-built staging URL over API applyUrl (API may still emit localhost). */
export function resolveOpenInspectionApplyUrl(session: {
  applyUrl?: string;
  propertyId?: string;
  id: string;
}): string | undefined {
  if (session.propertyId) {
    return tenantAppApplyUrl(session.propertyId, session.id);
  }
  const fromApi = session.applyUrl?.trim();
  if (!fromApi) return undefined;
  try {
    const url = new URL(fromApi);
    const propertyMatch = url.pathname.match(/\/properties\/([^/]+)\/apply\/?$/);
    const propertyId = propertyMatch?.[1];
    const sessionId = url.searchParams.get('sessionId') ?? session.id;
    if (propertyId) return tenantAppApplyUrl(propertyId, sessionId);
  } catch {
    // fall through
  }
  if (fromApi.includes('localhost')) {
    return undefined;
  }
  return fromApi;
}
