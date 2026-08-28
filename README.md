# crossub_mobile_agent

External portal for property agents and partners. Consumes the [crossub_web](https://github.com/justin-crossub/crossub_web) API.

> **Use pnpm only.** Run all scripts via `pnpm`.

## What gets committed

Only source and config — never commit install or build output:

| Tracked | Ignored (do not commit) |
|---------|-------------------------|
| `apps/portal/app/`, `components/`, `lib/`, … | `node_modules/` |
| `package.json`, `pnpm-lock.yaml` | `.pnpm-store/` |
| `render.yaml`, `.env.example` | `.next/`, `.env` |

If your IDE shows thousands of changed files, it is almost always `.pnpm-store/` or `node_modules/` — both are in `.gitignore`.

## Apps

- `apps/portal` — `@crossub/portal`, Next.js 16 agent portal (port **3002** locally)

## Requirements

- Node.js `>=20`
- pnpm `>=9`
- `crossub_web` API running (Postgres + Redis in that repo)

## Local development

```bash
pnpm install
cp apps/portal/.env.example apps/portal/.env

# Terminal 1 — API (crossub_web)
cd ../crossub_web && pnpm dev:api

# Terminal 2 — portal (this repo)
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002).

---

## Deploy on Render

Deploy **after** the `crossub_web` API is live on Render. The portal proxies browser requests to that API.

### Step 1 — Deploy the API (crossub_web)

If not done already, deploy `crossub_web` → `apps/api` as a Render Web Service. Note the public URL, e.g.:

`https://crossub-api.onrender.com`

See `crossub_web/README.md` for Postgres, Redis, and API env vars.

### Step 2 — Create the portal Web Service

**Option A — Blueprint (recommended)**

1. Push this repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the `crossub_mobile_agent` repo — Render reads `render.yaml`.
4. When prompted, set **`API_INTERNAL_URL`** to your API URL (no trailing slash):

   ```
   https://crossub-api.onrender.com
   ```

**Option B — Manual Web Service**

| Setting | Value |
|---------|--------|
| **Environment** | Node |
| **Root Directory** | *(blank)* |
| **Build Command** | `corepack enable && pnpm install && pnpm build:portal` |
| **Start Command** | `pnpm --filter @crossub/portal start` |

### Step 3 — Portal environment variables

Set these in Render → your service → **Environment**:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
API_INTERNAL_URL=https://crossub-api.onrender.com
```

Replace the API URL with yours. Do **not** add `/api` to the end — Next.js rewrites append it.

Render injects `PORT` automatically; the start script binds to it via `next start`.

### Step 4 — Update API CORS / email links (crossub_web)

In `crossub_web` API env on Render, add your portal URL:

```bash
# Password-reset and invite emails point here when agents use this portal
WEB_URL=https://crossub-mobile-agent.onrender.com

# Only needed if a frontend calls the API directly (not via /api proxy)
CORS_ORIGINS=https://crossub-mobile-agent.onrender.com,https://crossub-web.onrender.com
```

With the default `/api` proxy, the browser talks to the portal origin only — CORS is usually not an issue for login.

Leave `COOKIE_DOMAIN` empty so auth cookies bind to the portal hostname.

### Step 5 — Verify

1. Open `https://crossub-mobile-agent.onrender.com/login`
2. Sign in with a CROSSUB account from the shared API
3. Dashboard and Maintenance should load (Maintenance needs a valid JWT)

---

## Environment reference

| Variable | Local | Render |
|----------|-------|--------|
| `NEXT_PUBLIC_API_URL` | `/api` | `/api` |
| `API_INTERNAL_URL` | `http://localhost:3001` | `https://your-api.onrender.com` |
| `CROSSUB_AGENT_UI` | unset (`v1`) or `v2` to preview the redesign | Staging blueprint sets `v2`. Leave **unset** on production. |
| `PORT` | `3002` (dev script) | Set by Render |

## Build

```bash
pnpm build:portal
```

## Project structure

```
crossub_mobile_agent/
├── apps/portal/       Next.js agent portal
├── render.yaml        Render Blueprint
├── scripts/           Dev helpers
└── package.json       Workspace root
```
