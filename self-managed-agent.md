# Self-Managed Agent

Plan for letting an agency run its whole portfolio itself from the agent app (Self-Manage tier), with Inspection Only and Full Service as optional paid layers on top. Desktop view is the priority.

Shared plan page: https://claude.ai/artifact/1M4Xp6dm4Kq8VkAmpZs6Zj

## Background

Crossub is positioned as free property management software with free Cros AI (Business Direction & Website Positioning Brief, Oct 2026). There are three ways to manage:

| Tier | How it works | Commercial | Today |
|---|---|---|---|
| Self-Manage | Agent runs the portfolio with the software and Cros | Core, free, **default** | Does not exist |
| Inspection Only | Agent manages; CROSSUB does agreed inspection work | Optional, paid | `LEVEL_1_INSPECTION_ONLY` |
| Full Service | CROSSUB runs agreed day-to-day operations | Optional, paid | `LEVEL_2_FULL_MANAGEMENT` (current default) |

Scope from Daniel: Maintenance, Inspection, Leasing, Conversations, Trust accounting. In Self-Manage, anything a CROSSUB Account Manager does in the staff admin (`crossub_web/apps/web`) becomes something the agent does in this app.

## Decisions (Daniel, 17 Oct 2026)

1. **Landlord email is restricted by tier, not globally.** Inspection Only and Full Service keep the block. Self-Manage agencies may email landlords from a CROSSUB-provided domain.
2. **Owner email is a record only.** No approve links and no owner portal. Every confirmation becomes a manual action on the platform. The agent makes or records the decision, and the owner gets an emailed copy.
3. **The agency's own accountant runs trust.** This needs a new role.
4. **Agency staff use the existing inspector app.** Feasibility confirmed (see Phase 1).
5. **Everything moved to the agent is for Self-Manage agents only.** Inspection Only and Full Service users keep exactly what they have today (Daniel, 17 Oct 2026).

## Rules that apply to every phase

- **Self-Manage only.** New agent actions, pages, owner emails and the plan switch apply only to Self-Manage agencies and properties; the backend refuses them for other tiers. An agent who also works for an Inspection Only or Full Service agency sees that agency's jobs exactly as today.
- **Everything depends on the resolved service level**: `Management.serviceLevel` overrides `Agency.portalServiceLevel`. No separate Self-Manage code path; an agency that switches tiers gets the matching behaviour.
- **Three flips in Self-Manage**:
  - A step a CROSSUB AM does becomes a step the agent does.
  - A landlord the system may not email becomes a landlord who gets the agent's decision by email from the agency address.
  - Copy such as "CROSSUB is handling this", "Send to CROSSUB" and the CROS-handling task bucket now speaks to the agent ("you"), with Cros assisting.
- **Through the contract only.** Every new agent action is a `/api/v1/agent/*` route in `crossub_web/apps/api`, published in `@crossub-thongz/api-contract`, called from `apps/portal/lib/crossub-api/agent-client.ts` with `components['schemas'][...]` types. No hand-rolled types.
- **Reuse staff logic.** The staff API already implements every operation (maintenance 75 routes, leasing cycles 78, end leasing 61, trust accounting). New agent routes wrap the existing services with `AgentPortalScopeService` agency scoping. They don't re-implement them.
- **Desktop first.** Each module gets a sidebar page with a list-and-detail split pane, dense sortable tables and bulk actions. Mobile stays usable for decisions and quick replies.
- **Constants and utils.** Service levels, labels, decision values and copy go in `constants/`. Predicates such as `isSelfManagedLevel` go in `utils/` or `lib/`. No raw string comparisons.

---

## Phase 0: Foundation

Owner: Chan

### Backend (`crossub_web/apps/api`)

- [x] Add `SELF_MANAGED` to `enum AgentPortalServiceLevel` (Prisma migration). Add helpers next to `isInspectionOnlyPortalLevel` / `isFullManagementPortalLevel` in `src/constants/agent-portal.constants.ts`.
- [x] Make Self-Manage the default for **new** agencies only. Existing Level 1 and Level 2 agencies are unchanged, so no data migration.
- [x] Review `agent-portal-access.util.ts` and `assertAgencyFullManagementAccess` so Self-Manage gets full module access (it is not Inspection Only).
- [x] Remove the prepay gate and platform charges for Self-Manage (`billing-inspection.service.ts`, `ensureLevel2InspectionChargeAccrued`, `assertInspectionPrepaidSettled`).
- [x] **Landlord mail guard by tier.**
  - `LandlordMailGuardService.isLandlordAddress` / `partitionCc` take a send context (`propertyId` or `agencyId`).
  - Allow a landlord recipient when that property's resolved level is `SELF_MANAGED`.
  - Keep failing closed when the level cannot be resolved.
  - Thread the context through `mail.service.ts` call sites.
- [ ] **Agency sender.** (Code done. DKIM and sending records for `email.crossub.com.au` are entered in GoDaddy and wait for the domain owner's SMS verification, then Resend verification.) Send owner email as `"Agency name" <inboundEmailSlug@CROSSUB domain>` so replies land in the agency's inbox (`agency-inbound-email-assign.util.ts`, `formatAgencyInboundAddress`). Confirm SPF/DKIM for that domain.
- [x] **Shared decision record.** One service that records "decision + emailed owner copy" on a job's timeline. Every module reuses it.
- [x] Agent route to change the agency's tier, for the plan switch. Principal only.

### Contract

- [x] Publish a new `@crossub-thongz/api-contract` version (0.26.0) with the enum value and new routes. Bump `apps/portal/package.json`.

### Agent app (`apps/portal`)

- [x] Add `SELF_MANAGED` to `lib/portal-service-level.ts` (labels "Self-Manage" / "Free"). Update `portal-service-level-gate.tsx` and the `portalAccess` filter in `constants/nav.ts`.
- [x] Registration: Self-Manage is the default. Inspection Only and Full Service are optional (`components/register/register-pricing-panel.tsx`).
- [x] Copy and task buckets by tier:
  - `constants/agent-page-tour.ts`
  - `constants/agent-module-tutorial.ts`
  - `lib/task-list-v2.ts` (the CROS-handling default bucket)
  - Gii's "your Account Manager" intro in `components/agent/gii-assistant.tsx`
  - Property approval banner
- [x] Desktop module shell: sidebar entries and pages for Maintenance, Inspections, Leasing, Conversations, Trust. These replace today's redirects to `/tasks`.
- [x] Shared `DecisionWithOwnerEmail` component: decision buttons, an owner email preview, and the sent-copy record on the timeline.
- [x] Settings → Plan card: compare the three tiers and switch with confirmation.

**Done when:** a new agency registers as Self-Manage and sees all module pages on desktop with Self-Manage copy. A test email to the landlord on a Self-Manage property is delivered from the agency address. The same email on a Level 2 property is still blocked.

---

## Phase 1: Maintenance and Inspection

Owner: Chan

### Maintenance

Today the agent can log a job, set responsibility, invite tradies, approve, reject or negotiate a quote, choose Owner to Handle, close a job and approve completion.

New agent actions (backend route, contract, then screen):

- [x] Urgent triage: confirm urgent, convert to normal, make-safe or escalate, and set the spending limit (`MaintenanceUrgentAuthorisation`).
- [x] Issue triage: split, combine, dismiss, send questions to the tenant, record answers.
- [x] Invite the agency's preferred tradies to quote (added in testing: an AI-set responsibility moves the job to quoting with nobody invited).
- [x] Enter a quote for a tradie (invited tradies only). The unused legacy `createMaintenanceQuotation` is removed.
- [x] Quote comparison view (submitted quotes side by side, lowest flagged, approve or decline).
- [x] Book visit times on the contractor's behalf, or record a visit they arranged directly.
- [x] Invoice match (accept variance or dispute) and payment status. A Self-Manage agency records its own payment as `EXTERNAL_SETTLEMENT`; `PAID` stays staff only.
- [x] Completion gates the agency clears itself (added in testing: they were contractor or staff only, so a Self-Manage job could not close): upload completion photos and the invoice for the tradie, record the tenant's sign-off.
- [x] Self-Manage: quote decisions above `maintenanceSpendThreshold` (any decision when none is set) and job completion send the owner a copy through the shared decision record.
- [x] Desktop Maintenance page: lanes (Needs action, Awaiting contractor, Awaiting tenant, In progress, Done) as a table with the case workspace in a split pane.

### Inspection (agency staff in the inspector app)

What already works: the API lets an agency login into the inspector app when it has an `Inspector` roster row (the fallback in `roles.guard.ts`). Assignment scoping and the full inspection workflow work as they are.

Backend:

- [x] Add `Inspector.agencyId` (nullable).
- [x] Principal adds a team member as an agency inspector (reuse `inspector-registry.service.ts` `createInspector`), with `receivingPoolJobs=false`.
- [x] Refuse agency inspectors in `listPoolInspections`, `claimInspection` and open-batch, outright rather than only by flag.
- [x] `assignInspector`: an agency inspector can only be assigned their own agency's inspections.
- [x] Agent routes to create ingoing, outgoing and routine inspections "conducted by" a team member, mirroring `defaultInspectorId`.
- [x] Mark agency-conducted jobs (`workflowMeta.conductedByAgency`, generalising `oiAgentConducted`).
  - Skip the platform charge, the allowance count and `submitAttendance` (payout).
  - Keep these jobs out of pool sweeps (`escalateUnclaimedPoolJobs`, routine repair, prepaid refund).
- [x] Agency sign-off: an agent route (Principal) that reuses `InspectionReportsService.approve` and records "approved by agency". Exclude these jobs from the officer task pool.
- [x] Inspector agreement: add an agency-inspector branch so signing does **not** create a CROSSUB HR `Employee` record (`system-access-agreement.service.ts` `ensureEmployeeForUser`).
- [x] Disable the email-fallback linking for agency inspectors (`resolveInspectorScope`). Link by `userId` only.

Inspector app (`crossub_mobile_inspector/apps/inspector`):

- [x] Agency mode from `/inspector/profile`. Hide Job Pool, Open Batch, Earnings, Weekly Availability, Tribunal and Register (`inspector-shell.tsx`, `app/more/page.tsx`, `app/profile/page.tsx`, `registration-gate.tsx`).
- [x] Stop location sync (`lib/use-inspector-location-sync.ts`).
- [x] Relabel "Pending officer approval" as agency approval (`constants/inspection-approval.ts`).
- [x] Re-sync the vendored contract.

Agent app:

- [x] Team page: add or remove agency inspectors.
- [x] Create-inspection wizard: "Conducted by" a team member for Self-Manage.
- [x] Report review and sign-off, then send to the tenant and owner.
- [x] Desktop Inspections page: upcoming, in progress, awaiting sign-off, published.

**Done when:** a Self-Manage principal adds a staff member as inspector and creates a routine inspection for them. The staff member does it in the inspector app, the principal signs it off in the agent app, and the report goes to the tenant and owner. There is no CROSSUB charge, no payout, no HR record, and the job never appears in the CROSSUB pool.

Staging QA (18 Oct 2026): ingoing booked, done in the inspector app in agency mode and signed off in the agent app; no charge, kept out of the pool. Still open:
- Owner copy is blocked until `email.crossub.com.au` is verified in Resend (403 "Domain not verified"). After that, confirm the PDF arrives attached.
- Not yet run on staging: the tenant copy (the test job had no tenant email), a routine job and sending a report back.

---

## Phase 2: Leasing and Conversations

Owner: Wayne

### Leasing (with rent review and end leasing)

Today the agent can make the re-let decision, add and shortlist applicants, handle deposit and bond proofs, record signing, run key collection, negotiate rent reviews, and do end-of-lease steps including settlement approval.

New agent actions:

- [x] Application screening, with Cros scoring visible, and reference checks. (Screening panel on the applicant card: Cros score, referees with phone numbers, notes, recommendation and Cros summary on agent routes. Skip screening for a tenant already found.)
- [x] Applicant negotiation and request-info.
- [x] Prepare the contract, send it to the tenant, upload the signed copy.
- [x] Mark deposit paid, set the bond link, mark bond paid, record bond lodgement and refund. (Agent routes for deposit and bond paid and for approving or rejecting their proofs; buttons in the onboarding step. Mark paid posts the legacy ledger receipt as the agent with the ledger key for that request only. Lodgement is the bond link plus bond paid; refund is the end-leasing settlement. Recording the deposit or bond as received, by mark paid or proof approval, is the principal or accountant only; field agents can reject a proof.)
- [x] Generate the open report and order the ingoing inspection (reuses Phase 1).
- [x] Rent review: key in landlord offers and record tenant responses as the agent (today the ACCOUNT_MANAGER channel).
- [x] End leasing (settlement panel with the settlement method; the agent edits the report comparison: responsibility items, moves between tenant and landlord, quotes and contractors. Gap: the quote step's Send quotation to tenant still waits on the CROSSUB bond deduction proposal and landlord quotation emails, which have no agent route):
  - The agent builds the report comparison and deductions themselves. Today they enter them only "when CROSSUB asks" (`lib/termination-case-api.ts`, `agent-deductions-window.tsx`).
  - The agent proposes bond deductions and confirms the settlement.
- [x] Self-Manage owner copies: chosen applicant, rent increase, bond deductions.
- [x] **Bug:** tenant-selection approve and decline are local only (`app/tenant-selection/[id]/page.tsx:39-55`). Wire them to the API.
- [x] Desktop Leasing page: cycles table with status pills and the cycle workspace in a split pane. (The selected letting's step workspace sits in a wider detail pane under its summary.)

- Built 18 Oct 2026 (crossub_web 39dc2b0a7, 17ae46c27; contract 0.33.0, 0.34.0; agent app 7d42cc3).
- Built 19 Oct 2026: screening and reference check, skip screening, deposit and bond paid and proofs, desktop Leasing workspace pane, end-of-lease report comparison editing and settlement method (crossub_web 4e32d9fd0, contract 0.37.0, agent app 55c63be; staging QA pending).
- Staging QA 19 Oct 2026 (QA Self-Manage agency): letting created with a self-run open, manual applicant, propose terms and accept, request info, approve (owner copy recorded), agreement condition, confirm and send, bond link; vacating case, deductions edit and confirm settlement (owner copy recorded with the right figures). Owner emails fail until `email.crossub.com.au` is verified. Fixed during QA: owner copy now uses the agreed rent; settlement note no longer claims the owner was emailed. Not yet run: rent review tenant response, contract upload, open report, ingoing order, tenant-selection page.

### Conversations

Today the agent has messages and the message center with linked Gmail or Yahoo and reply.

- [x] Agency inbox on the agency's CROSSUB address (folio EXTERNAL scoping), with landlord recipients allowed in Self-Manage (Phase 0 guard).
- [x] Compose to tenant, owner or tradie, using templates and Cros drafts. (Templates are CROSSUB's global ones; agency-owned templates need a migration.)
- [x] Assign a thread to a team member, link it to a job, set status.
- [x] Desktop Conversations page: three panes (threads, conversation, job context).
- Note: there is no SMS or WhatsApp gateway. Those channels stay record-only.
- Built 18 Oct 2026 (crossub_web 13ecd773b, contract 0.35.0; agent app 5cf3779).
- Staging QA 19 Oct 2026: list, thread, job context, assign, resolve and reopen, Cros draft, reply from the agency address (blocked by the staging allowlist for example.com, as expected). Fixed during QA: reply has a To field so it sends when the property has no contact email. Not yet run: compose, file under property, link job, templates.

**Done when:** a Self-Manage agent can let a property end to end and handle the tenancy's end without CROSSUB involvement. Owner emails and replies thread in the agency inbox.

---

## Phase 3: Trust accounting

Owner: whoever frees up first. Can start earlier, since the decisions are made.

### Backend

- [x] Add `ACCOUNTANT` to `enum AgencyMembershipTier`. The Principal invites an accountant like any team member.
- [x] The accountant becomes a `TrustWorkspaceMember` of the agency's `TrustWorkspaceKind.AGENCY` workspace, with trust permissions (`POST_TRUST_TRANSACTIONS`, `APPROVE_TRUST_PAYMENTS`, `RECONCILE_TRUST_ACCOUNT`) on a request-local actor, scoped to that workspace only. Never `MANAGE_TRUST_SETTINGS` (D132): settings stay with CROSSUB.
- [x] Agent trust routes wrapping `src/modules/trust-accounting/*`:
  - ledgers, with the ledger download as CSV or PDF
  - receipts and tenant receipts
  - transactions: list, view, reverse
  - bills
  - fee charges: list, charge a one-off fee, post pending, waive
  - disbursements and payment batches (ABA): pool summary, create a batch, list, download the ABA or BPAY file and its report
  - owner statements
  - bank statements: read a QIF file, accept suggested matches, match, unmatch
  - reconciliation locks
  - reports: receipts, withdrawals, ledger balances, unpresented payments, each as CSV
- Not exposed to the agency (staff only):
  - Everything behind `MANAGE_TRUST_SETTINGS` (D132): bank accounts and ABA details, account codes, workspace members, change of ownership, rebuild ledger balance, take-on.
  - Reconciliation revoke, fee settings, payout methods and schedule, withholds, manual withdrawals, manual receipts, withdrawals and journals: allowed by the agency's keys but not asked for yet.
  - Bank statement import is QIF read only, base64 in JSON like the staff route; there is no CSV or OFX reader and no stored statement or statement line list (D98).
  - The trust reports have no PDF; only the ledger download has one.
- [x] Owner statements emailed to the owner for Self-Manage (Phase 0 guard).
- [x] Update `crossub_web/docs/trustaccounting.md`: decisions D89 to D91 reversed, R24 answered (D132).

### Agent app

- [x] Replace the placeholder settings section (`components/accounting/accounting-settings-section.tsx`) for Self-Manage principals and accountants with a read-only summary of the trust bank accounts and account codes, linking to Trust. Everyone else keeps the placeholder. `ACCOUNTING_MODULE_LAUNCHED` stays off, so the same summary is also the Trust page Settings tab.
- [x] Desktop Trust pages: overview, ledgers (with fees and CSV or PDF download), transactions, rent, bills, disbursement, bank files (ABA), bank statement, reconciliation, reports, settings.
- [x] Only Principal and Accountant see Trust.

- Built 18 Oct 2026 (crossub_web 13ecd773b, 8d01dc358; contract 0.35.0, 0.36.0; agent app a734708). CROSSUB staff must create each agency's AGENCY trust workspace and bank account first. Not yet run on staging.
- Transactions, fees, bank files, bank statement, reports and settings built 19 Oct 2026; uncommitted, needs a contract release after 0.36.0. Not yet run on staging.

**Done when:** an agency accountant receipts rent, pays a bill, runs an owner disbursement, issues the owner statement by email, and reconciles and locks the month, all inside their own agency workspace.

---

## Open questions

1. Switching tiers: per agency, or per property using the existing override? What happens to jobs in progress, and can an agency switch back down to Self-Manage?
2. Agency-signed inspection reports: agency branding on the PDF instead of CROSSUB's? Keep Cros AI review and auto maintenance spawn?
3. Free Cros entitlements: which fair-use limits apply to Self-Manage (AI research, voice)?
4. Trust: does the agency hold its own trust bank account, with CROSSUB providing software only? This affects bank feeds and ABA files.
5. Agency sender: reuse the inbound slug domain for outbound, or a dedicated sending domain?

## Separate check (not part of this project)

Agency users hold `MODIFY_CUSTOMER_INFO`, which may let them call the staff route `POST /inspections/:id/approve` and approve any of their agency's reports, including ones CROSSUB inspected. Untested. Verify and fix independently.
