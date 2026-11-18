/**
 * Hosts the portal may PUT to on behalf of the browser.
 * Presigned R2/S3 URLs only — the route must not become an open proxy.
 */
const ALLOWED_PUT_HOST_SUFFIXES = ['.r2.cloudflarestorage.com', '.amazonaws.com'];

export function isAllowedDocumentPutUrl(raw: string): boolean {
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
  if (!host || host === 'localhost' || host.endsWith('.localhost')) return false;
  if (ALLOWED_PUT_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  const extra = (process.env.DOCUMENT_UPLOAD_PUT_HOSTS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(host);
}
