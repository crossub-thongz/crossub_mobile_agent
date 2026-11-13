## What changed and why

<!-- One topic per pull request. Two or three sentences. -->

## Behaviour changes

<!-- List every change a user, another app or the database will notice. Write "None" if there are none.
     A change found in the diff but missing here is sent back. -->

-

## Checklist

Tick each line only after checking it. If a line does not apply, say why instead of ticking it.

- [ ] Every value on screen comes from the API. No sample rows, seed lists or fixed counts.
- [ ] Every success message follows a real save.
- [ ] Error state and empty state both exist and I looked at them.
- [ ] No new direct database read outside the owning module. No API call outside the shared client.
- [ ] Status, stage, role and type values use constants, not raw strings or numbers.
- [ ] No check, guard, test, lint rule or exemption list was switched off, skipped or loosened.
- [ ] No API address, login, password, key or personal email in source.
- [ ] Nothing unrelated is included. No whole file was overwritten.
- [ ] The checks this repo has (see `AGENTS.md`) passed on my machine.
- [ ] `CHANGELOG.md` has an entry for every behaviour change.

## AI tool use

<!-- Which tool wrote or edited this (Cursor, Claude, none)? Did it stop on anything, and how was that resolved?
     Anything it worked around must be listed here. -->

## Staging check

<!-- After merge: what was checked on staging, by whom, with a screenshot or short note. -->
