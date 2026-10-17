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

## Testing: staging only, never local (Chan, 17 Oct 2026)

- **Do not use a local database.** Don't connect to, migrate, reset, `db push` or create scratch
  databases on the local Postgres (`crossub_web/apps/api/.env` → `localhost:5432/crossub`). It is
  months behind the schema and is not a test target.
- **Don't run a local API or local dev servers for QA.** Test directly on the staging Render
  services: `crossub-api-staging` (API) with `crossub-db-staging` (Postgres), and the staging web
  apps. Render project: https://dashboard.render.com/project/prj-d7sm5fpj2pic73apfuc0
- Schema changes reach staging through deploy: `crossub-api-staging` runs `prisma:deploy` as its
  pre-deploy command. Pushing `main` in `crossub_web` also releases to production (auto-deploy is on).
- Local gates are still fine and expected before a push: `tsc --noEmit`, unit tests, contract build.
- Never paste staging credentials or connection strings into code, docs or chat.
