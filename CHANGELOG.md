# Changelog

## 2026-06-28

### Added
- `lib/crossub-api/agent-client.ts` — `fetchMessageThreads` / `replyToThread` / `createThread` typed fetchers for the new `/api/v1/agent/messages` facade; `fetchNotifications` / `markNotificationRead` / `markAllNotificationsRead` for `/api/v1/agent/notifications`.
- `lib/crossub-api/agent-mappers.ts` — `mapAgentMessages(dtos, properties, agentId)` (fills the thread parties from the live `properties`; `taskType`/`messageCategory` from `department`, `relatedCaseId` from `caseId`; mentions stay client-side) + `messageCategoryToDepartment`; `mapAgentNotifications(dtos)` (type lower-cased to the view union, `source: 'api'`, view-only fields defaulted). New `COMM_DEPARTMENT` / `COMM_CHANNEL` / `AGENT_NOTIFICATION_TYPE` enum mirrors in `constants/api-enums.ts`.

### Changed
- Messages now render from the live agent facade instead of the `MESSAGE_THREADS` demo seed: `AgentDataProvider.refresh()` loads message threads (independently of the portfolio, so a messaging hiccup never blanks it) and the `messages` memo reconciles optimistic store threads against the server. `sendMessage` is repointed to the API — replies to a persisted thread hit `POST .../reply`; a first message on an optimistic thread persists it via `POST /agent/messages` and is promoted onto its server content (keeping the local id so an open detail route stays valid). Offline falls back to the device-local optimistic store. New optional `MessageThread.serverThreadId` carries the persisted thread id.
- Notifications now render from the live agent facade instead of the `NOTIFICATIONS` demo seed: `refresh()` loads them (via `Promise.allSettled` alongside messages, so either degrades to its demo seed independently), and `markNotificationRead` / `markAllNotificationsRead` are repointed to the API (optimistic `readIds` overlay + `refresh()` reconciles). The notifications screen is unchanged.

### Added
- `lib/crossub-api/agent-mappers.ts` — 9 pure DTO→view-model adapters for the agent facade (properties + inspections, maintenance, rent reviews, vacating, tenant selections, leasing, accounting, tribunal); `constants/api-enums.ts` mirroring the API's Prisma enums; `fetchPortfolio` / `approveMaintenance` / `declineMaintenance` typed fetchers in `agent-client.ts`.

### Changed
- The agent portal renders live data from the enriched `/api/v1/agent/properties` + `/api/v1/agent/portfolio` facades through `AgentDataProvider` — properties plus all 8 operational domains, with a per-fetch fallback to demo seeds and zero screen-component changes. The keystone `properties` (and every property-scoped domain) is now keyed by real ids.
- Maintenance quote approve/decline now drive the real `/api/v1/agent/maintenance/{id}/approve|decline` state machine (`QUOTING → SCHEDULED|OPEN`) instead of the staff in-memory `/maintenance/*` store; `maintenance/[id]` renders the workspace from the facade view-model.
- Bumped `@crossub-thongz/api-contract` to `^0.3.0` (new agent facade types).
- Tenant provisioning now calls the CROSSUB API (`POST /api/v1/agent/tenants`) through this app's own same-origin proxy, carrying the signed-in Account Manager's session cookie — instead of posting cross-origin to the tenant app's account store. `lib/tenant-provisioning.ts` rewritten onto the typed `@crossub-thongz/api-contract` client (bumped to `^0.2.0`; `crossub.POST('/agent/tenants')`); `NEXT_PUBLIC_TENANT_APP_URL` is no longer used.
