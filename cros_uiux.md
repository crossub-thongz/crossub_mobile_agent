# Cros UI and UX

Making Cros easy to understand at a glance for a non technical agent. From a walk through of the agent app on staging as a Self-Manage agent (Daniel, 31 Oct 2026): dashboard, every Cros tab, Notifications, the bell, Messages, and one question to Cros.

The main problem: Cros works, but it appears as four separate tools that each count the work differently, so the agent can't tell which number to trust or where to tap.

Backend paths are in `crossub_web/apps/api/src`; app paths are in `apps/portal`.

## Status key

`[ ]` not started · `[~]` in progress · `[x]` done · `[-]` dropped (with reason)

---

## 1. Quick fixes

### 1.1 Notifications

- [ ] **The morning briefing opens Cros.** The card says "Open Cros to go through it", but tapping it only goes to the dashboard. Point it at `/dashboard?cros=open`, and make the in-app tap open the panel too, not only the phone alert.
  - Backend: `AGENT_BRIEFING_NOTIFICATION.HREF` in `constants/agent-briefing.constants.ts`.
  - App: `hooks/use-cros-open-param.ts` reads the parameter only when the page first loads, so a tap inside the app does nothing; `app/notifications/page.tsx` and `components/agent/agent-notification-bell.tsx` need to open Cros themselves.
- [ ] **Cros cards show where they came from.** Every card from Cros (briefing, reminders, "who pays" suggestions) gets the Cros face, a short "From Cros" label and an **Ask Cros** button that opens the panel on that item. The word "Cros" in the text is highlighted as well.
- [ ] **Remove the "LIVE · CROSSUB_WEB" tag** from the page and from every card (`DataSourceBadge` in `app/notifications/page.tsx`).
- [ ] **Card titles are not cut off at a colon.** The app takes a card's title from the text before the first colon (`lib/notification-activity.ts`), so a reminder shows "Set with Cros on 30/10/2026 12" with "08 AEDT." underneath. Use the notification's real title.
- [ ] **Urgent cards in plain English.** Today: "The AI recommends the owner pays for this repair (85% confident: …). Nothing has been set or sent. Confirm it or choose another party. Action this escalation." Instead: "Who pays for the tap repair? Cros thinks the owner (wear and tear). Tap to confirm."
  - Backend: `constants/agent-self-managed-maintenance.constants.ts` (escalation text) and `MAINTENANCE_ESCALATION_NOTIFY_ACTION_REQUIRED` in `constants/maintenance-escalation.constants.ts`.
- [ ] **Supplier emails stay out of the agent's notifications.** "Dear Brightness Au PTY LTD, Your quotation … has been approved" shows as a card to the agent.
- [ ] **The bell does not say "You're all caught up" while an urgent item is listed.** It means nothing unread; say "Nothing new" or show what still needs action (`components/agent/agent-notification-bell.tsx`).

### 1.2 The first suggested question

- [ ] **"What needs my attention?" sends only that.** The button sends "What needs my attention? There are 3 items waiting in my portfolio." On the Messages page Cros answered from the inbox and asked "Are any of these the 3 items you meant?" Rename to "What needs me today?" and have Cros go through the briefing (`components/agent/cros-portfolio-views.tsx`).

### 1.3 Cros panel

- [ ] **Open at the top.** The panel opened scrolled down, past the greeting and the briefing.
- [ ] **Say the briefing summary once.** It shows in the chat bubble and again in the card heading.
- [ ] **No repeated rows in "Since your last briefing".** The same smoke alarm reminder is listed twice.
- [ ] **No reference numbers on briefing rows.** NL-5650850, EL-6638260, MR-00197 and OI-1202294 are internal; the address and a plain stage ("waiting on a quote") are enough.
- [ ] **Arrears rows make sense.** "Owes $240.00" next to "0 days behind" reads as a contradiction; show what is owed and since when.
- [ ] **Voice buttons are labelled.** The headphones (hands free), speaker (mute) and microphone (so pale it looks switched off) have no words. One clear **Talk to Cros** button, with mute inside it.

---

## 2. Next

- [ ] **One number everywhere.** At the same moment: Cros button badge 3, Insights 5, briefing 10, Tasks 3, Needs Your Attention 3 pending. The Discover cards also disagree with the dashboard (rent reviews 1 open vs 0; lease renewals nothing waiting vs 1; maintenance nothing waiting while the briefing lists 2 repairs). The briefing becomes the one source and every badge shows its count.
- [ ] **Two tabs: Today and Chat.** Discover and Insights repeat the same alerts and events. Today holds the briefing; History moves behind a small icon.
- [ ] **Chat is never blank.** An empty chat shows three suggested questions.
- [ ] **A compact "What can I help with?"** The cards are large but hold about three words each; a short list lets the whole briefing fit on one screen.
- [ ] **Phone check.** This walk through was desktop only; repeat it at phone width.

## 3. Needs a decision

- [ ] **One name for the assistant.** The app uses "CROS", "Cros", "CROS Assistant", "the AI" and CROSSUB. The dashboard says inspections are "already arranged by CROS" (`components/agent/dashboard/v2-dashboard.tsx`), and its "CROS Activity" card shows jobs, not anything Cros did. Proposal: **Cros** with its face for the assistant only; "CROSSUB team" for people.
- [ ] **One inbox.** The header message icon opens Messages, the sidebar has Conversations, and Cros has its own team chat.

---

## Log

| Date | Change |
|---|---|
| 31 Oct 2026 | Walk through on staging; tracker started |
