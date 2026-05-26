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

const rewriteSetCookie = (cookie: string): string =>
  cookie
    .split(';')
    .filter((part) => !part.trim().toLowerCase().startsWith('domain='))
    .join(';');

const proxy = async (
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> => {
  const { path } = await context.params;
  const upstream = await fetch(buildUpstreamUrl(req, path), {
    method: req.method,
    headers: forwardHeaders(req),
    body:
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await req.arrayBuffer(),
    redirect: 'manual',
  });

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') return;
    if (lower === 'transfer-encoding') return;
    response.headers.set(key, value);
  });

  const cookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    response.headers.append('set-cookie', rewriteSetCookie(cookie));
  }

  return response;
};

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
