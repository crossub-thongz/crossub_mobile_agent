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
- [~] Inspections: book routine, ingoing and outgoing; cancel; sign off. Built (`crossub_web` 41f44d11f): `get_inspections` (a property's inspections or the one on screen: type, stage, date, who inspects, report in, signed off; on Self-Manage the agency's inspectors), `book_inspection`, `cancel_inspection` (ingoing and outgoing, with a reason), `sign_off_inspection` (agency report, principal; emails the tenant their copy). Booking follows the screen: Self-Manage books the agency's own inspector at a time the officer gives; other plans ask CROSSUB, which sets time and inspector. Decided 27 Oct: Cros books a CROSSUB inspection only when it is free; when CROSSUB would charge, it points to the Inspections screen to pay. Opens on inspection screens. New AI actions: `CANCEL_INSPECTION_JOB`, `SIGN_OFF_INSPECTION_REPORT` (HIGH). No contract change. On staging (bfd6d5d87): listing and the cancel card were right, but Cros called four unsigned agency reports "waiting for sign-off" while the screen shows them Completed (agency sign-off is optional since 26 Oct); wording and prompt fixed (f258ef0d1, waits for push). During this check Confirm was pressed by mistake on the cancel card, so outgoing inspection FI-5658042 on 1008/19 Halifax Street is cancelled on staging, and stays cancelled (Chan, 28 Oct) (reason "the tenant has extended their lease"; no email is sent on cancel). Book and sign-off cards not yet checked. Recheck on ad34a8a2b: Cros now says sign-off is optional and the job complete, but still heads the list "awaiting sign-off" and miscounted (said three, listed four).
- [~] Rent review: send offer, chase tenant, record response. Built (`crossub_web` ad34a8a2b): `get_rent_review` (a property's open review or the one on screen: stage, whose turn, current, recommended and proposed rent, start day, earliest lawful increase day, notice served, automatic reminders sent, the offer on the table and the tenant's counter), `serve_rent_increase_notice` (the Agent confirmed step: rent and start day from the user; refuses inside 60 days of notice, inside twelve months of the last increase, a rent that is not an increase, a lease renewal, or no tenant email), `send_rent_offer` (answer a counter or decline: a new amount, or the owner's last offer again, optionally closing further counters; says when a new amount is above the served notice and needs a new notice), `accept_rent_offer` (the tenant's counter for the owner, or the owner's offer for a tenant who told the officer), `chase_rent_review_tenant` (email to the tenant on file, filed on the review; the card shows the automatic reminders already sent). Every plan, through the rent review screen's own services; a refusal from the screen comes back as NOT DONE. Decided 28 Oct: of the tenant's replies Cros records only an acceptance; chasing is an email after Confirm. Withdraw, keep the rent, postpone and counters or declines told to the officer stay on the screen. Actions: notice `ISSUE_STATUTORY_NOTICE`, offer `PROPOSE_RENT_INCREASE`, accept `SET_RENT_REVIEW_OUTCOME`, chase `SEND_EXTERNAL_REPLY`, each open to Account Managers by a written override (the screen's buttons are). Opens on rent review screens. No contract change. On staging (ad34a8a2b), read only: the staging property has no rent review, and Cros said so, matching the screen; asked to serve a notice it refused with no card. Notice, offer, accept and chase paths not run on staging: no rent review data, and no test data by decision 27 Oct.
- [~] Conversations: reply to any party, assign, resolve. Built (`crossub_web` 8196175e2), on the agency's Self-Manage inbox through `AgentConversationService`: `reply_to_conversation` (email from the agency address to the thread's counterparty or a named party, or in the tenant and owner apps on a property thread; the card names the address the send resolves, from the hub's own ladder, new `previewAgencyReplyRecipient`), `start_conversation` (email a tenant, owner or tradie of a Self-Manage property as a new thread; owner and tenant addresses from the property, a tradie's from the user), `assign_conversation` (lists the agency's team, then assigns or unassigns), `resolve_conversation` (resolve or reopen). An email the mail guard dropped comes back NOT SENT. Reading stays with `list_inbox` and `read_conversation`. New AI action `RESOLVE_CONVERSATION` (MEDIUM); assign is `ASSIGN_TASK`; reply and start are `SEND_EXTERNAL_REPLY`, open to Account Managers by a written override (the screen's Send). Opens on the Conversations and Messages screens. No contract change. Follow-up: the Conversations screen keeps its open thread in local state, so it is not sent as the record on screen; Cros finds threads with `list_inbox`. On staging (8196175e2), read only, no card pressed: Cros found the MR-00195 thread and, reading it, pointed out the quote was already approved. Two faults found and fixed in 0757867b4 (waits for push): it said it had no address for that thread while the reply box shows one (the box answers whoever last wrote in; Cros now does the same before the party lookup), and at first it called Conversations a maintenance screen and asked the user to open the thread (prompt: search list_inbox with the reference). Recheck on 0757867b4 passed: the reply card names the same address as the reply box; no card pressed. The drafted message had no greeting or sign-off; asked for both (c0dc0d440, waits for push).
- [~] Tasks: complete a task. Built (`crossub_web` 282885cd7): `complete_task`, the task page's Mark as completed (`AgentTaskLifecycleService.forceComplete`) for inspection, leasing, rent review, End Leasing and tribunal tasks, with the officer's reason in the task's audit log. Same checks as the page, now readable without completing (`checkCompletable`: in the book, not already closed, any fee paid; a fee to pay is refused, Cros cannot pay). Maintenance jobs are refused and pointed to `close_maintenance_job`, which lists what is still open. The record on screen is the task (vacating is end_leasing). New AI action `COMPLETE_AGENT_TASK` (HIGH). Opens on the Tasks screen. No contract change. Waits for push.
- [~] Owners and keys: owner decisions, key collection. Built (`crossub_web` ab8ca4b3d): `get_owner_decisions` and `record_owner_decision` (Self-Manage; `AgentOwnerDecisionService.record`, the owner is emailed a copy with nothing to approve; the card names the owner's address or says nobody is emailed), `get_key_collection` and `set_key_collection` (`AgentDocumentService`; day, from, optional until and place from the user, in property time; every tenant on the new tenancy is emailed; the card says what it replaces). The handover report needs photos and stays on the screen. Actions: decision `SEND_EXTERNAL_REPLY` with a written override; new `SET_KEY_COLLECTION` (MEDIUM). Opens on Leasing screens. No contract change. On staging (c0dc0d440), read only: Cros listed the property's four owner decisions with what became of each owner copy, and key collection not started with no time set. Record and set paths not run (no test data).

### 2.2 Server briefing

Decided (Chan, 28 Oct 2026): in app now, push later; on for everyone, `AGENT_BRIEFING_ENABLED=false` turns it off.

- [~] Morning job per agent: urgent repairs, arrears, quotes waiting, rent reviews and inspections waiting on the agent, unanswered messages, leases ending within 60 days, changes since the last briefing. Built (`crossub_web` 445752f9c): hourly sweep builds each agent's briefing at 6am in the zone of most of their properties (Sydney when none), stored in the new `AgentBriefing` table, one bell card a day; a source that fails is named in `unavailable`, not shown as nothing waiting. Counts and lines come from the records, no AI wording. Deployed to staging and production.
- [~] Agent route for today's briefing; Cros opening message reads it instead of `lib/gii-briefing.ts`. Built: `GET /agent/gii/briefing` (builds on the spot when the sweep has not run) and `POST /agent/gii/briefing/seen` (contract 0.55.0). Cros greeting, Discover view and panel card read it, with Ask Cros and Open per item; the phone-built briefing stays as fallback. Staging check (app f560590): route returned 200 with nothing listed while Tasks showed 4 "Needs My Action" (leasing approvals, vacate notice, booking the trade); the server categories do not cover them. Decided (Chan, 28 Oct 2026): the app adds the Tasks page's "Needs My Action" rows the server does not list; the 6am bell card still counts the server categories only, until the task list moves to the server. Same check found the outstanding-cases query widening an agent's scope (spread `OR` replaced the scope's `OR`); fixed in `crossub_web` 41c657582, live on staging; briefing unchanged for the test agent after it, and the greeting reads "4 things need you today." (app dd55d62).
- [ ] Push alert with the briefing (the agent app registers no device tokens yet).
- [ ] Move the Tasks page's task list to the server, so the bell card, the briefing and Tasks read one list.
- [ ] Review and switch on the outstanding reminder sweep (`AGENT_OUTSTANDING_REMINDERS_ENABLED`, off): its cron fires 08:00 UTC, it does not skip archived assignments, and it has never run on real data.

### 2.3 Talk to a person

The boss's "communication tool" (agreed on a call, 28 Oct 2026): when Cros cannot help, the agent reaches a real CROSSUB person in the same Cros chat, like WhatsApp or WeChat. It does not replace the Self-Manage Conversations page, which stays the agency's email inbox.

- [ ] Handoff card: when Cros cannot do a request, or the agent asks for a person, Cros offers "Hand to CROSSUB team" on a Confirm card. New AI action with a risk level before it ships.
- [ ] Handoff route: Confirm opens (or reuses) a "CROSSUB Support — " staff thread (`STAFF_SUPPORT_SUBJECT_PREFIX`, `MessagingService`) carrying a summary of the chat (`POST /agent/gii/summarise`), the property and the record on screen; linked to the `GiiConversation`.
- [ ] Staff reply from the admin Message Center; replies show in the Cros chat as bubbles with the staff member's name.
- [ ] Delivery: the open chat checks for new replies every few seconds; push alert (Expo) when the app is closed. A websocket comes later if polling is not fast enough.
- [ ] While a person holds the chat, Cros stays quiet; the chat returns to Cros when staff close the thread.
- [ ] Waiting time and out of hours: show how long the agent has waited, using the working day in `ai-escalation-sla.constants.ts`; outside it, say when someone will answer.

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
- Talk to a person (2.3): who answers, the agency's Account Manager or a shared CROSSUB support team?
- Talk to a person (2.3): what does the agent see outside 9 to 5 when nobody is online?
- Talk to a person (2.3): agent app only, or the tenant, landlord and contractor apps' Cros too?

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
| 2026-10-28 | 2.1 | Inspections on staging: sign-off wording fixed (f258ef0d1); FI-5658042 cancelled by mistake during the check. Rent review bundle: read, serve notice, send offer, accept, chase tenant (crossub_web ad34a8a2b) |
| 2026-10-28 | 2.1 | Rent review read-only staging check passed (no review on staging). Conversations bundle: reply, start, assign, resolve (crossub_web 8196175e2) |
| 2026-10-28 | 2.1 | Tasks bundle: complete a task (crossub_web 282885cd7) |
| 2026-10-28 | 2.1 | Conversations staging check: reply recipient and inbox search fixed (crossub_web 0757867b4) |
| 2026-10-28 | 2.1 | Reply recipient recheck passed. Owners and keys bundle: owner decisions, key collection (crossub_web ab8ca4b3d); email greeting fix (c0dc0d440) |
| 2026-10-28 | 2.3 | Added Talk to a person: Cros hands a chat to a live CROSSUB person (boss's communication tool); Conversations stays as is |
| 2026-10-28 | 2.2 | Server briefing built: morning sweep, briefing route, Cros opening message (crossub_web 445752f9c, contract 0.55.0) |
| 2026-10-28 | 2.2 | Staging check: briefing adds Tasks page "Needs My Action" rows; outstanding-cases scope fix (crossub_web 41c657582) |
| 2026-10-28 | 2.2 | Scope fix 41c657582 pushed and live on staging; briefing and greeting rechecked |
