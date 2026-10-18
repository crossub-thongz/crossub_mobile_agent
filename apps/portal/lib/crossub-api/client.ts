import { createCrossubClient } from '@crossub-thongz/api-contract';

/** Same-origin `/api/v1` base; also builds link URLs (report PDFs) through the BFF proxy. */
export const CROSSUB_API_V1_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/v1`;

/**
 * Typed CROSSUB mobile-contract client for the agent (Account Manager) app.
 *
 * Same-origin: the browser calls the BFF proxy at /api/v1/* (app/api/[...path]/route.ts),
 * which forwards to the Nest API carrying the httpOnly `csb_at` session cookie — so we
 * authenticate with the existing cookie session, no bearer token needed. Every path,
 * param, body and response is typed from `@crossub-thongz/api-contract`.
 */
export const crossub = createCrossubClient({
  baseUrl: CROSSUB_API_V1_BASE,
  credentials: 'include',
});
