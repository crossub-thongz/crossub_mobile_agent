import { NextResponse, type NextRequest } from 'next/server';

import { isAllowedStorageDownloadUrl } from '@/lib/storage-download-url';

export const dynamic = 'force-dynamic';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENT_ID = /^[A-Za-z0-9:_-]{1,200}$/;

const apiBase = (): string => process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

function upstreamPath(kind: string, id: string): string | null {
  if (kind === 'inspection' && UUID.test(id)) {
    return `v1/agent/inspections/${id}/report/pdf`;
  }
  if (kind === 'document' && DOCUMENT_ID.test(id)) {
    return `v1/agent/documents/${encodeURIComponent(id)}/file`;
  }
  return null;
}

/**
 * The report and document routes redirect to a short-lived storage URL when the
 * browser is signed in. Mail to a tenant or owner cannot carry that session, so
 * this route reads the redirect and returns the storage URL for the email body.
 */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind') ?? '';
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const path = upstreamPath(kind, id);
  if (!path) {
    return NextResponse.json({ message: 'Download target is not allowed' }, { status: 400 });
  }

  const headers = new Headers();
  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  let upstream: Response;
  const upstreamUrl = `${apiBase()}/api/${path}`;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });
  } catch {
    return NextResponse.json({ message: 'Could not make a download link' }, { status: 502 });
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get('location');
    await upstream.body?.cancel().catch(() => undefined);
    if (!location) {
      return NextResponse.json({ message: 'Could not make a download link' }, { status: 502 });
    }
    let absolute: string;
    try {
      absolute = new URL(location, upstreamUrl).toString();
    } catch {
      return NextResponse.json({ message: 'Could not make a download link' }, { status: 502 });
    }
    if (!isAllowedStorageDownloadUrl(absolute)) {
      return NextResponse.json(
        { message: 'The download link is not on a storage host this portal can share' },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: absolute });
  }

  await upstream.body?.cancel().catch(() => undefined);
  return NextResponse.json(
    { message: 'This file has no shareable download link' },
    { status: 409 },
  );
}
