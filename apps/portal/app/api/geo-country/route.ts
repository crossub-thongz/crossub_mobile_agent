import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const raw = (forwarded || request.headers.get('x-real-ip') || '').trim().replace(/^::ffff:/, '');
  if (!raw) return null;
  if (raw === '::1' || raw === '127.0.0.1' || raw.startsWith('10.') || raw.startsWith('192.168.')) {
    return null;
  }
  const privateBlock = raw.match(/^172\.(\d+)\./);
  if (privateBlock) {
    const second = Number(privateBlock[1]);
    if (second >= 16 && second <= 31) return null;
  }
  return raw;
}

/** AU or NZ when the request can be placed there. Anything else stays unset so the form uses Australia. */
export async function GET(request: NextRequest) {
  const headerCountry = (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    ''
  ).toUpperCase();
  if (headerCountry === 'AU' || headerCountry === 'NZ') {
    return NextResponse.json({ country: headerCountry });
  }

  const ip = clientIp(request);
  if (!ip) return NextResponse.json({ country: null });

  try {
    const response = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(1200),
    });
    if (!response.ok) return NextResponse.json({ country: null });
    const data = (await response.json()) as { country?: string };
    const code = data.country?.toUpperCase() ?? '';
    if (code === 'AU' || code === 'NZ') return NextResponse.json({ country: code });
  } catch {
    return NextResponse.json({ country: null });
  }
  return NextResponse.json({ country: null });
}
