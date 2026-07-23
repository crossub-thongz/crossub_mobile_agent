/** Staging tenant portal — default when env is unset (no localhost in QR / apply links). */
export const STAGING_TENANT_APP_URL = 'https://crossub-mobile-tenant.onrender.com';
export const PROD_TENANT_APP_URL = 'https://crossub-mobile-tenant-prod.onrender.com';

function isProdDeploymentHost(hostname: string): boolean {
  return hostname.includes('-prod') || hostname.endsWith('.crossub.com.au');
}

/** Public tenant app base URL for apply links, QR codes, and credential handoff. */
export function tenantAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_TENANT_APP_URL?.trim();
  if (raw && raw.length > 0) return raw.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost') return 'http://localhost:3003';
    if (isProdDeploymentHost(host)) return PROD_TENANT_APP_URL;
  }
  const apiInternal = process.env.API_INTERNAL_URL?.trim() ?? '';
  if (apiInternal.includes('-prod')) return PROD_TENANT_APP_URL;
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

/** Prospect check-in link for an open inspection viewing session. */
export function tenantAppCheckInUrl(propertyId: string, viewingSessionId: string): string {
  const base = `${tenantAppBaseUrl()}/properties/${encodeURIComponent(propertyId)}/check-in`;
  return `${base}?sessionId=${encodeURIComponent(viewingSessionId)}`;
}

export function resolveOpenInspectionCheckInUrl(session: {
  checkInUrl?: string;
  propertyId?: string;
  id: string;
}): string | undefined {
  if (session.propertyId) {
    return tenantAppCheckInUrl(session.propertyId, session.id);
  }
  const fromApi = session.checkInUrl?.trim();
  return fromApi || undefined;
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
