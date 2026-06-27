# Changelog

## 2026-06-27

### Added
- `lib/crossub-api/agent-mappers.ts` — 9 pure DTO→view-model adapters for the agent facade (properties + inspections, maintenance, rent reviews, vacating, tenant selections, leasing, accounting, tribunal); `constants/api-enums.ts` mirroring the API's Prisma enums; `fetchPortfolio` / `approveMaintenance` / `declineMaintenance` typed fetchers in `agent-client.ts`.

### Changed
- The agent portal renders live data from the enriched `/api/v1/agent/properties` + `/api/v1/agent/portfolio` facades through `AgentDataProvider` — properties plus all 8 operational domains, with a per-fetch fallback to demo seeds and zero screen-component changes. The keystone `properties` (and every property-scoped domain) is now keyed by real ids.
- Maintenance quote approve/decline now drive the real `/api/v1/agent/maintenance/{id}/approve|decline` state machine (`QUOTING → SCHEDULED|OPEN`) instead of the staff in-memory `/maintenance/*` store; `maintenance/[id]` renders the workspace from the facade view-model.
- Bumped `@crossub-thongz/api-contract` to `^0.3.0` (new agent facade types).
- Tenant provisioning now calls the CROSSUB API (`POST /api/v1/agent/tenants`) through this app's own same-origin proxy, carrying the signed-in Account Manager's session cookie — instead of posting cross-origin to the tenant app's account store. `lib/tenant-provisioning.ts` rewritten onto the typed `@crossub-thongz/api-contract` client (bumped to `^0.2.0`; `crossub.POST('/agent/tenants')`); `NEXT_PUBLIC_TENANT_APP_URL` is no longer used.
