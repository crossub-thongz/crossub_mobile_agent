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

- [x] Portal sends `pageModule`, `pageLabel` and `propertyChanged` with every turn (fields already in contract 0.45.0). Code done (`constants/gii-page-context.ts`, `utils/gii-page-context.ts`, `gii-client.ts`, `gii-assistant.tsx`). Staging check passed: on the property page Cros answered without asking for an address. Moving to another property is not tested: the staging login has one property.
- [-] Contract: record type and id on screen in `GiiChatContextDto`. Moved to 2.1: no Gii tool takes a record id yet, so it lands with the first one that does.
- [x] Portal: a record screen (maintenance, inspection, leasing, tenant selection, rent review, vacate, tribunal, message thread) scopes Cros to that record's property and names the record in `pageLabel`, with its reference ("Maintenance job MR-00196: Sink tap leaking"). The prompt treats the record on screen as the subject (`crossub_web` fa5b22252). Staging check passed on 0935fba: on MR-00196 Cros named the job without asking which one. It cannot read the job's stage or quote yet (2.1).
- [~] Answers link to the record they talk about (Open buttons for every record kind, not only job cases). Built for maintenance, rent review, inspection, leasing, End Leasing, inbox thread, notification, arrears and property (`crossub_web` fa5b22252, contract 0.51.0; portal 2b99341). Staging check passed for leasing. Inbox thread, notification, arrears and property are held back by `GII_RECORD_LINK_KINDS_SENT` (a7a44742f), because an app build older than 4734d55 crashes on a kind it does not know. Turn them on once every app, live included, runs 0935fba or later, then test them.

### 1.2 Saved conversations

- [x] Prisma: `GiiConversation` (officer, title, property, messages as JSON, last activity); one table, transcript saved whole each turn. `crossub_web` 594b01d84, additive migration `20261026120000_gii_conversations`.
- [x] Agent routes: `GET /agent/gii/conversations`, `GET/PUT/DELETE /agent/gii/conversations/{id}` (contract 0.47.0). PUT creates or replaces; app mints the id. Scoped to the calling officer (another officer's chat reads as not found); property must be in scope; latest 50 kept.
- [x] Older turns summarised instead of dropped past `GII_MAX_HISTORY_MESSAGES`: `POST /agent/gii/summarise` folds them into notes sent back as `context.earlierSummary` (contract 0.48.0). Portal folds between turns once 16 lines follow the notes, keeping the last 8 word for word; a failed fold drops the oldest as before. Notes quote each officer request word for word, numbered and carried forward, with one model line per request; no figures, not saved with the chat. Staging check passed: after 11 questions Cros quoted the first (MR-00195) word for word.
- [x] Portal: History loads from the server, saves after every settled turn, reopens and deletes. Words only; cards and attachments are not saved. Times shown in Sydney time (2b99341). Staging check passed: saved, reloaded, reopened and deleted; a chat started 20:41 Sydney time is listed at 8:41 pm.

### 1.3 Confirm card and AI log

- [x] One confirm card for every write tool (exact change, Confirm, Cancel), generalising the email draft. Backend `crossub_web` 439e96a33 (contract 0.46.0): unconfirmed write calls return a signed proposal (15 min, bound to the officer); `POST /v1/agent/gii/confirm` runs exactly that call. Portal `GiiProposalCard`; a new message clears an open card. On the agent app every write in chat only proposes, so Confirm is the only way a change runs (d007cb942); a property update checks clashes when proposing and the card shows the value it replaces. On the agent app a replacement goes straight to the card, "2 (replaces 1)", with no question in words first (347d7e728). A maintenance job with photos still confirms in words. Staging check passed on d007cb94; card wording passed on 347d7e72. A card turn where Cros writes no sentence showed "Sorry, I could not complete that"; fixed in 524de54b1, live on staging (card flow rechecked).
- [x] Write an `AiDecision` row for every Gii write (action, risk, source record, approver, result). `crossub_web` e18596a68: `GiiActionLedgerService`, outcome RECOMMENDED + new reason `USER_CONFIRMED`, resolved ACCEPTED by the officer, effects and property timeline. Staging check passed: one row per Confirm, none for a typed yes or a Cancel.
- [x] Decision log rows name the field and values ("Parking spaces 1 to 2"), and `GET /agent/gii/changes` lists Cros changes in the property Activities tab with who confirmed (`crossub_web` fa5b22252, contract 0.51.0; portal 2b99341). Staging check passed: parking 1 to 2 and back, two rows, both in Activities. Rows written before this fix still read "Updated 1 detail(s)".
- [x] `GII_MAX_TURNS` 6 to 12 done (e18596a68). Model: `AI_GII_MODEL` setting added, default still Haiku 4.5; switching to Sonnet 5.5 is under Open questions (model budget).

### 1.4 Read tools

- [x] Conversations: `list_inbox` and `read_conversation` over the Self-Manage Conversations inbox (`AgentConversationService`); a thread Cros reads stays unread for the officer (`peek`). Backend `crossub_web` 54102dedf, no contract change. Staging check passed: same 4 threads as Conversations, one summarised.
- [x] Arrears: `list_arrears`, the Arrears screen's rows (`AgentPortfolioService.listAccountingForAgent`), most owed first with the total; with a propertyId, each open case split into rent, bills and bond. 54102dedf. Staging check passed: nobody behind, as the dashboard shows (nothing owed on staging).
- [x] Tasks and notifications: `list_notifications`, unread by default, read without marking read (54102dedf). Tasks stay with the existing `list_actionable_cases` (quotes awaiting approval, rent reviews, routines due); vacating, leasing and tribunal tasks are not in it yet. Staging check passed: none new, then all 4 with Sydney times.

### 1.5 Fixes before new tools

- [-] Dropped: all three exist on current `crossub_web` main (`agent-people.controller.ts`, `agent-portal.controller.ts`); the audit read a stale local checkout. Portal calls checked: `/agent/agencies/{id}/people`, `/agent/properties/{id}/tenancy/{archive,restore,current}`, `/agent/properties/{id}/contacts/{contactId}`.

---

## Stage 2: Daily work (weeks 5 to 10)

Gate: 30% of pilot quote approvals and inspection bookings done through Cros; under 2% need correcting.
Review items: AI-001, AI-002, AI-004, AI-005, AI-019, AI-024, AI-025, AI-027, AI-044.

### 2.1 Tool bundles

- [~] Bundle loading: core tools plus the bundle for the current screen. Built (`crossub_web` 76425bb7e): a bundle opens from the start on its module or record screen, elsewhere Cros opens it with `load_tools` and uses it on its next step (the tool loop rereads its list each step). One bundle so far: maintenance. On staging since f758fe15e: from the dashboard Cros opened the bundle and read MR-00196 correctly.
- [x] Contract: record kind and id on screen in `GiiChatContextDto` (from 1.1), for tools that act on the open record. `context.screenRecord {kind, id}` in 76425bb7e (contract 0.52.0); published; portal sends it from efafa0a (after the backend, which refuses unknown fields). Staging check passed on efafa0a: on MR-00195 Cros gave the job's id, which only `screenRecord` carries, and read its stage correctly.
- [~] Maintenance: approve or reject quote, chase contractor, schedule, close. Built (76425bb7e): `get_maintenance_job` (by record on screen or reference: stage, tradie, work order, owner repair limit, every quote), `approve_quote`, `decline_quote`, `send_quote_to_owner`, `record_owner_quote_reply`. Each goes through the job screen's own service, proposes on a Confirm card and is logged. Decided 27 Oct: same users as the app's buttons (declared permission overrides); Cros approves only within the owner's repair limit, otherwise offers to send the quote to the owner. Then (`crossub_web` caea31d62): `chase_contractor` (job email to the assigned or a named invited tradie), `offer_visit_times` (up to 3 windows for the tenant to pick), `record_booked_visit`, and `close_maintenance_job` (the card lists what is still open). The two emails and the two visit tools are Self-Manage only, as on the job screen. New AI actions: `SCHEDULE_MAINTENANCE_VISIT` (MEDIUM), `CLOSE_MAINTENANCE_JOB` (HIGH). No contract change. On staging (1905c406f), checked without confirming on MR-00195: chase and offer times refused (no tradie, no work order), close showed the right card. Cros offered to invite tradies, which it cannot; prompt fixed (09a81ce00), staging check passed: it now points to the job screen. Confirm paths not run on staging: no test data, by decision 27 Oct.
- [~] Inspections: book routine, ingoing and outgoing; cancel; sign off. Built (`crossub_web` 41f44d11f): `get_inspections` (a property's inspections or the one on screen: type, stage, date, who inspects, report in, signed off; on Self-Manage the agency's inspectors), `book_inspection`, `cancel_inspection` (ingoing and outgoing, with a reason), `sign_off_inspection` (agency report, principal; emails the tenant their copy). Booking follows the screen: Self-Manage books the agency's own inspector at a time the officer gives; other plans ask CROSSUB, which sets time and inspector. Decided 27 Oct: Cros books a CROSSUB inspection only when it is free; when CROSSUB would charge, it points to the Inspections screen to pay. Opens on inspection screens. New AI actions: `CANCEL_INSPECTION_JOB`, `SIGN_OFF_INSPECTION_REPORT` (HIGH). No contract change. On staging (bfd6d5d87): listing and the cancel card were right, but Cros called four unsigned agency reports "waiting for sign-off" while the screen shows them Completed (agency sign-off is optional since 26 Oct); wording and prompt fixed (f258ef0d1, waits for push). During this check Confirm was pressed by mistake on the cancel card, so outgoing inspection FI-5658042 on 1008/19 Halifax Street is cancelled on staging (reason "the tenant has extended their lease"; no email is sent on cancel). Book and sign-off cards not yet checked.
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
| 2026-10-26 | 1.4 | Read tools: inbox, arrears, notifications on the agent chat (crossub_web 54102dedf) |
| 2026-10-26 | 1.3 | Done. Agent app changes run only from Confirm; clash checked at proposal, card shows the value replaced (crossub_web d007cb942); staging retest passed |
| 2026-10-26 | 1.3 | Cros mentions a card only when one was made, never says updated before Confirm (crossub_web ab94087f6); staging retest still showed "press Confirm there" with no card after a typed yes |
| 2026-10-26 | 1.3 | Agent app: a property replacement goes straight to the card showing what it replaces (crossub_web 347d7e728); staging retest passed, ledger one row per Confirm |
| 2026-10-26 | 1.3 | A card turn with no sentence from Cros says the card is waiting instead of "could not complete" (crossub_web 524de54b1, on staging; card flow rechecked, Cancel wrote nothing) |
| 2026-10-26 | 1.2 | Notes quote the officer's requests word for word, numbered and carried forward (crossub_web 1f4e8ead5); staging recall check passed |
| 2026-10-26 | 1.2 | A long model line no longer fails the fold with 503 (crossub_web e45ed11d5); staging replay 6 of 6 and a carried fold passed |
| 2026-10-26 | 1.1 | Job reference in the screen label, record on screen is the subject; Open buttons for every record kind (crossub_web fa5b22252, contract 0.51.0; portal 2b99341) |
| 2026-10-26 | 1.1 | New button kinds crashed the live app; API sends only the kinds older apps know (crossub_web a7a44742f), app skips unknown kinds (4734d55) |
| 2026-10-26 | 1.3 | Decision log rows name field and values; Cros changes in the property Activities tab (crossub_web fa5b22252; portal 2b99341) |
| 2026-10-27 | 1 | Stage 1 retest on staging passed (`~/Downloads/Cros_Stage1_Retest_Results.pdf`); left: held-back Open buttons, property switch untested, pilot gate |
| 2026-10-27 | 2.1 | Tool bundles, record on screen (contract 0.52.0), maintenance bundle: read a job, approve within the owner's limit, decline, send to owner, record owner's answer (crossub_web 76425bb7e) |
| 2026-10-27 | 2.1 | Portal sends the record on screen (0.52.0, efafa0a). Maintenance bundle: chase the tradie, offer visit times, record a booked visit, close a job (crossub_web caea31d62) |
| 2026-10-27 | 2.1 | Maintenance invite fix passed on staging. Inspections bundle: read, book (agency inspector or free CROSSUB request), cancel, sign off (crossub_web 41f44d11f) |
