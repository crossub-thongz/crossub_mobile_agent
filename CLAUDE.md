# CROSSUB Agent Portal — CLAUDE.md

The CROSSUB agent (Account Manager) mobile-web app (Next.js 16; the app is in
`apps/portal/`). One of five role apps; the others and the backend are **sibling repos**
under `~/Desktop/crossub/`.

## The API contract is the source of truth

Talk to the backend through the **published contract**, never hand-written types:

- Package: **`@crossub-thongz/api-contract`** — generated from the NestJS API's OpenAPI
  (`openapi.mobile.json`, the `/api/v1` facades).
- Typed client: `apps/portal/lib/crossub-api/client.ts` — `createCrossubClient`
  (openapi-fetch, base `/api/v1`, cookie session via `credentials: 'include'`).
- This app's facade is **`/api/v1/agent/*`** — assigned agencies + their properties (the
  agent is an internal Account Manager, scoped to assigned clients). Add calls in
  `apps/portal/lib/crossub-api/agent-client.ts` using the `crossub` client +
  `components['schemas'][...]` types. **Never hand-roll request/response types.**
- Legacy `lib/crossub-api/maintenance-client.ts` / `types.ts` still call the non-v1
  `/maintenance/*` endpoints — migrate onto the facade over time.

## Where things live (sibling repos under `~/Desktop/crossub/`)

- **Backend (NestJS):** `crossub_web/apps/api` — the agent facade is `/api/v1/agent/*`.
- **Contract source:** `crossub_web/packages/api-contract` — wired into this session via
  `.claude/settings.json` → `additionalDirectories`, so the live contract types are in
  context without opening the whole backend or the other apps.

## Auth & data flow

- Cookie session (`csb_at`) via `/auth/login`; every call goes through the BFF proxy
  `apps/portal/app/api/[...path]/route.ts` → `API_INTERNAL_URL`.
