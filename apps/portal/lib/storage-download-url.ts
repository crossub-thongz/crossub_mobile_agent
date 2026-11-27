import { isAllowedDocumentPutUrl } from '@/lib/presigned-upload-url';

/** Public R2 buckets use this host. Presigned PUT hosts are checked separately. */
const PUBLIC_R2_HOST_SUFFIX = '.r2.dev';

/**
 * A URL a tenant or owner can open from an email, without an agent session.
 * Only https storage hosts. Agent API paths stay on the portal.
 */
export function isAllowedStorageDownloadUrl(raw: string): boolean {
  if (isAllowedDocumentPutUrl(raw)) return true;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  return host.endsWith(PUBLIC_R2_HOST_SUFFIX);
}

/**
 * An https URL from the document API that a recipient can open.
 * Agent-session paths (`/api/...`) are not accepted; those stay on the portal.
 */
export function shareableStorageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') return null;
  return trimmed;
}
