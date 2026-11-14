import { createCrossubClient } from '@crossub-thongz/api-contract';

import { fetchWithSession } from '@/lib/api';

/** Same-origin `/api/v1` base; also builds link URLs (report PDFs) through the BFF proxy. */
export const CROSSUB_API_V1_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/v1`;

/**
 * Typed CROSSUB mobile-contract client for the agent (Account Manager) app.
 *
 * Same-origin: the browser calls the BFF proxy at /api/v1/* (app/api/[...path]/route.ts),
 * which forwards to the Nest API carrying the httpOnly `csb_at` session cookie, so we
 * authenticate with the existing cookie session and no bearer token is needed. Every path,
 * param, body and response is typed from `@crossub-thongz/api-contract`.
 *
 * `fetchWithSession` gives these calls the same 401 refresh as the `api` / `apiV1` helpers.
 *
 * Do not replace this with a hand-written client (AGENTS.md rule 5). If a path is "not
 * assignable", the installed contract is older than the API: publish the contract from
 * `crossub_web` and bump the dependency here.
 */
export const crossub = createCrossubClient({
  baseUrl: CROSSUB_API_V1_BASE,
  credentials: 'include',
  fetch: fetchWithSession,
});
