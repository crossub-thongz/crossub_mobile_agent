# Jarvis (Cros v2)

Plan for turning Cros (code name Gii) into a personal assistant that runs the agent app alongside each agent: it sees the screen, acts on anything the app can do, speaks first, remembers and talks back. Every change to a record, or message leaving the agency, still waits for the agent's Confirm.

Plan PDF: `~/Downloads/Cros_v2_Plan.pdf` (agreed 26 Oct 2026). Backend feasibility review: `~/Downloads/Crossub_AI_Backend_Feasibility_Review 1.docx` (item IDs AI-001 to AI-080).

## Five abilities

| Ability | Agent experience | Test |
|---|---|---|
| Aware | On a job screen, "chase this tradie" works without naming property or job | 9 in 10 screen based requests resolved without Cros asking which record |
| Capable | Anything the agent can tap, the agent can ask Cros to do | Every agent action has a Cros tool, or a written reason why not |
| Proactive | Cros opens the day with what matters | Briefing on the phone by 7am for every pilot agent |
| Remembers | "Remind me Friday if the owner hasn't replied" just happens | Follow up fires once, never if the reply already arrived |
| Hands free | Agent speaks and hears answers while driving | A maintenance request raised and confirmed entirely by voice |

## Starting point (audit, 26 Oct 2026)

- 12 tools (6 read, 6 write) in `constants/gii.constants.ts`; actions in `constants/gii-tool-actions.constants.ts`; built in `modules/gii/gii-vacate-tools.service.ts`.
- Model `AI_MODEL` (default `claude-haiku-4-5`), `GII_MAX_TURNS = 6`, `GII_MAX_HISTORY_MESSAGES = 20`.
- Stateless: the portal resends the transcript; history lives in `sessionStorage` only.
- Writes use a required `userConfirmed` flag; `send_property_email` returns a draft when false.
- Gii writes no `AiDecision` rows, although the ledger and approval queue exist (`modules/ai`).
- `GiiChatContextDto` accepts `pageModule`, `pageLabel`, `propertyChanged`; the portal never sent them.
- 262 `/api/v1/agent/*` endpoints; Gii partly covers 8 of 11 areas, none of arrears, trust, billing.
- Briefing built client side (`lib/gii-briefing.ts`); `AGENT_OUTSTANDING_SWEEP_QUEUE` reminder sweep ships off; push works through Expo only.
- Voice: hold to talk transcription works; `POST /v1/agent/voice/session` (LiveKit) exists, unused by the portal; no spoken replies.

## Rules that apply to every stage

- **Through the contract only.** New agent behaviour is a `/api/v1/agent/*` route or a `GiiChat*` DTO field in `crossub_web/apps/api`, published in `@crossub-thongz/api-contract`, used from the portal with `components['schemas'][...]` types.
- **Every tool is governed.** A new Gii tool gets a `GII_TOOL_ACTION` entry (action type and risk) before it ships; the record is total, so the build fails without one.
- **Confirm before change.** Any write returns the exact change for the agent to confirm; nothing changes until they do.
- **Figures from records.** Amounts and dates come from records and engines, never from the model.
- **Never in v2:** moving trust money, legal notices, tribunal filing, bond settlement lodging, write offs, applicant decisions. Cros may prepare these for the normal screen.
- **Staging only.** Test on `crossub-api-staging`; pushing `crossub_web` main also releases to production.

## Status key

`[ ]` not started · `[~]` in progress · `[x]` done · `[-]` dropped (with reason)

---

## Stage 1: Foundations (weeks 1 to 4)

Gate: pilot agents use Cros daily; no change happens without Confirm; every Cros change is in the AI decision log.
Review items: AI-003, AI-012, AI-013.

### 1.1 Screen awareness

- [~] Portal sends `pageModule`, `pageLabel` and `propertyChanged` with every turn (fields already in contract 0.45.0). Code done (`constants/gii-page-context.ts`, `utils/gii-page-context.ts`, `gii-client.ts`, `gii-assistant.tsx`); staging check pending.
- [-] Contract: record type and id on screen in `GiiChatContextDto`. Moved to 2.1: no Gii tool takes a record id yet, so it lands with the first one that does.
- [~] Portal: a record screen (maintenance, inspection, leasing, tenant selection, rent review, vacate, tribunal, message thread) scopes Cros to that record's property and names the record in `pageLabel`. Code done (`GII_SCREEN_RECORD_LIST`, `giiScreenRecordFor`); staging check pending.
- [ ] Answers link to the record they talk about (Open buttons for every record kind, not only job cases).

### 1.2 Saved conversations

- [x] Prisma: `GiiConversation` (officer, title, property, messages as JSON, last activity); one table, transcript saved whole each turn. `crossub_web` 594b01d84, additive migration `20261026120000_gii_conversations`.
- [x] Agent routes: `GET /agent/gii/conversations`, `GET/PUT/DELETE /agent/gii/conversations/{id}` (contract 0.47.0). PUT creates or replaces; app mints the id. Scoped to the calling officer (another officer's chat reads as not found); property must be in scope; latest 50 kept.
- [~] Older turns summarised instead of dropped past `GII_MAX_HISTORY_MESSAGES`: `POST /agent/gii/summarise` folds them into notes sent back as `context.earlierSummary` (contract 0.48.0). Portal folds between turns once 16 lines follow the notes, keeping the last 8 word for word; a failed fold drops the oldest as before. Notes carry no figures and are not saved with the chat. Staging check pending.
- [~] Portal: History loads from the server, saves after every settled turn, reopens and deletes. Words only; cards and attachments are not saved. Staging check pending.

### 1.3 Confirm card and AI log

- [~] One confirm card for every write tool (exact change, Confirm, Cancel), generalising the email draft. Backend `crossub_web` 439e96a33 (contract 0.46.0): unconfirmed write calls return a signed proposal (15 min, bound to the officer); `POST /v1/agent/gii/confirm` runs exactly that call. Portal `GiiProposalCard`; a new message clears an open card. A maintenance job with photos still confirms in words. Staging check pending.
- [~] Write an `AiDecision` row for every Gii write (action, risk, source record, approver, result). `crossub_web` e18596a68: `GiiActionLedgerService`, outcome RECOMMENDED + new reason `USER_CONFIRMED`, resolved ACCEPTED by the officer, effects and property timeline. Staging check pending.
- [~] `GII_MAX_TURNS` 6 to 12 done (e18596a68). Model: `AI_GII_MODEL` setting added, default still Haiku 4.5; switching to Sonnet 5.5 waits on the model budget question.

### 1.4 Read tools

- [ ] Conversations: list threads, read and summarise a thread.
- [ ] Arrears: arrears list and per tenancy detail.
- [ ] Tasks and notifications: read the agent's open tasks and notifications.

### 1.5 Fixes before new tools

- [-] Dropped: all three exist on current `crossub_web` main (`agent-people.controller.ts`, `agent-portal.controller.ts`); the audit read a stale local checkout. Portal calls checked: `/agent/agencies/{id}/people`, `/agent/properties/{id}/tenancy/{archive,restore,current}`, `/agent/properties/{id}/contacts/{contactId}`.

---

## Stage 2: Daily work (weeks 5 to 10)

Gate: 30% of pilot quote approvals and inspection bookings done through Cros; under 2% need correcting.
Review items: AI-001, AI-002, AI-004, AI-005, AI-019, AI-024, AI-025, AI-027, AI-044.

### 2.1 Tool bundles

- [ ] Bundle loading: core tools plus the bundle for the current screen.
- [ ] Contract: record kind and id on screen in `GiiChatContextDto` (from 1.1), for tools that act on the open record.
- [ ] Maintenance: approve or reject quote, chase contractor, schedule, close.
- [ ] Inspections: book routine, ingoing and outgoing; cancel; sign off.
- [ ] Rent review: send offer, chase tenant, record response.
- [ ] Conversations: reply to any party, assign, resolve.
- [ ] Tasks: complete a task.
- [ ] Owners and keys: owner decisions, key collection.

### 2.2 Server briefing

- [ ] Morning job per agent: urgent repairs, arrears, quotes waiting, leases expiring, unanswered messages, changes since last visit.
- [ ] Agent route for today's briefing; Cros opening message reads it instead of `lib/gii-briefing.ts`.
- [ ] Push alert with the briefing; review and switch on the outstanding reminder sweep.

---

## Stage 3: Follow up (weeks 11 to 16)

Gate: every test follow up fires once and stops on reply; trust and arrears answers match the ledger in every check.
Review items: AI-006, AI-014, AI-030, AI-032, AI-033, AI-037, AI-043, AI-068, AI-073.

- [ ] Follow ups: "remind me" and "chase if no reply" as scheduled jobs that check their condition and cancel once met.
- [ ] Preferences the agent can see and edit: tone, sign off, preferred contractors, quiet hours.
- [ ] Leasing: book open, request reference, shortlist.
- [ ] End leasing: start vacate, prepare bond outcome for review.
- [ ] Arrears: payment promise, rent chase.
- [ ] Trust: explain ledgers, balances and statements (read only).

---

## Stage 4: Hands free (weeks 17 to 20)

Gate: a pilot agent raises and confirms a maintenance request entirely by voice.
Review items: AI-016 (spoken English first).

- [ ] Spoken replies with a mute toggle and short spoken versions of long answers.
- [ ] Portal connects to `POST /v1/agent/voice/session` for a full voice conversation.
- [ ] Voice confirm reads the change back before acting; money and legal steps never by voice alone.
- [ ] Billing and agency invoices: explain charges (read only).

---

## Success measures

| Measure | Pilot target |
|---|---|
| Daily active agents using Cros | 70% of pilot agents |
| Share of actions through Cros in Stage 2 areas | 30% |
| Wrong record or wrong figure | Zero |
| Proposed changes the agent rejects | Under 10% |
| Briefing to first action | Under 15 minutes |
| Model cost per agent per day | Set in workshop |

## Open questions

- Which agents and agencies join the pilot, and for how long?
- Model budget per agent per day; when Sonnet is worth its cost over Haiku?
- Is a native app planned? Push beyond Expo depends on it.
- Where are owner approval limits set, and does Cros read them per owner?
- Spoken replies in English only at first?
- Who signs off the risk level for each new tool?

## Log

| Date | Item | Note |
|---|---|---|
| 2026-10-26 | Plan | Plan agreed; tracker created |
| 2026-10-26 | 1.1 | Portal sends screen module and label on every turn; property change only counts navigation, reset on a new chat |
| 2026-10-26 | 1.1 | Record screens scope Cros to the record's property; contract record field moved to 2.1 |
| 2026-10-26 | 1.3 | AI decision log rows for confirmed Cros writes, 12 tool steps, `AI_GII_MODEL` (crossub_web e18596a68) |
| 2026-10-26 | 1.3 | Confirm card: signed proposals and `POST /agent/gii/confirm` (crossub_web 439e96a33, contract 0.46.0); portal card |
| 2026-10-26 | 1.5 | Dropped: the routes already exist on main |
| 2026-10-26 | 1.2 | Saved chats: `GiiConversation` table and routes (crossub_web 594b01d84, contract 0.47.0); portal History on the server |
| 2026-10-26 | 1.2 | Long chats: older turns folded into notes, `POST /agent/gii/summarise` (contract 0.48.0) |
