import { type NextRequest, NextResponse } from 'next/server';

const apiBase = (): string =>
  process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const forwardHeaders = (req: NextRequest): Headers => {
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('connection');
  return headers;
};

const buildUpstreamUrl = (req: NextRequest, path: string[]): string => {
  const suffix = path.length > 0 ? path.join('/') : '';
  return `${apiBase()}/api/${suffix}${req.nextUrl.search}`;
};

/** R2/CDN previews redirect; follow server-side so browser blob downloads stay same-origin. */
const shouldFollowUpstreamRedirects = (req: NextRequest, path: string[]): boolean =>
  req.method === 'GET' &&
  path[0] === 'maintenance' &&
  path[1] === 'attachments' &&
  path.length >= 4 &&
  path[3] === 'preview';

const rewriteSetCookie = (cookie: string, hostname: string): string => {
  const isLocalhost =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  let strippedSecure = false;
  const parts = cookie.split(';').filter((part) => {
    const trimmed = part.trim().toLowerCase();
    if (trimmed.startsWith('domain=')) return false;
    // Staging/production APIs set Secure; strip for local HTTP dev so cookies persist.
    if (isLocalhost && trimmed === 'secure') {
      strippedSecure = true;
      return false;
    }
    return true;
  });

  if (!isLocalhost || !strippedSecure) {
    return parts.join(';');
  }

  // SameSite=None requires Secure; without it browsers reject the cookie on http://localhost.
  return parts
    .map((part) => {
      const trimmed = part.trim().toLowerCase();
      if (trimmed === 'samesite=none') return 'SameSite=Lax';
      return part;
    })
    .join(';');
};

const proxy = async (
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> => {
  const { path } = await context.params;
  const isBodyMethod = req.method !== 'GET' && req.method !== 'HEAD';
  let upstream: Response;
  try {
    upstream = await fetch(buildUpstreamUrl(req, path), {
      method: req.method,
      headers: forwardHeaders(req),
      body: isBodyMethod ? req.body : undefined,
      // Stream large JSON uploads (base64 documents) without buffering the full body in the portal.
      ...(isBodyMethod ? { duplex: 'half' as const } : {}),
      redirect: shouldFollowUpstreamRedirects(req, path) ? 'follow' : 'manual',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    return NextResponse.json(
      { message: `API unavailable: ${message}` },
      { status: 502 },
    );
  }

  const responseBody =
    upstream.status === 204 || req.method === 'HEAD'
      ? null
      : await upstream.arrayBuffer();

  const response = new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') return;
    if (lower === 'transfer-encoding') return;
    // fetch() decompresses gzip/br bodies; forwarding content-encoding breaks browsers.
    if (lower === 'content-encoding') return;
    if (lower === 'content-length') return;
    response.headers.set(key, value);
  });

  const cookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    response.headers.append('set-cookie', rewriteSetCookie(cookie, req.nextUrl.hostname));
  }

  return response;
};

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;

/** Large document uploads can take several minutes on staging. */
export const maxDuration = 300;
