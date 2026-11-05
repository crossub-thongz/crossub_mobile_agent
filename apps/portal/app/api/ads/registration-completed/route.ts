import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';

const PIXEL_ID = 'A79Jb1TcSMGyzyezmsPyo2';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const key = process.env.OPENAI_ADS_API_KEY?.trim();
  if (!key) return NextResponse.json({ ok: false, skipped: true });

  let sourceUrl = 'https://www.crossub.com';
  try {
    const body = (await request.json()) as { sourceUrl?: unknown };
    if (typeof body.sourceUrl === 'string' && body.sourceUrl.startsWith('http')) {
      sourceUrl = body.sourceUrl;
    }
  } catch {
    /* A missing body still reports the conversion. */
  }

  const response = await fetch(`https://bzr.openai.com/v1/events?pid=${PIXEL_ID}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      validate_only: false,
      events: [
        {
          id: randomUUID(),
          type: 'registration_completed',
          timestamp_ms: Date.now(),
          source_url: sourceUrl,
          action_source: 'web',
          data: { type: 'customer_action' },
        },
      ],
    }),
  });

  if (!response.ok) return NextResponse.json({ ok: false }, { status: 502 });
  return NextResponse.json({ ok: true });
}
