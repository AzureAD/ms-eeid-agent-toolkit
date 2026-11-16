---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "<metadata.version of the skill>"   # a different installed version restarts the migration
app-root: <path to the app root, relative to the workspace>
approach: api            # api | sdk (sdk: JavaScript single-page apps, iOS, macOS, and Android apps)
phase: 1
status: draft            # draft | approved | applying | applied | reviewed | validated | reported
revision: 1
scope: [<flow IDs migrated in this phase>]
deferred:                # <flow ID>: "<reason>"   ({} when nothing is deferred)
approved: null           # { revision: N, date: YYYY-MM-DD, how: "confirmed in chat" }
baseline:
  commit: <git rev-parse HEAD or "none">
  files:
    <path>: <git hash-object>
dirty-files: []          # files inside app-root with uncommitted changes when planned; the migration never edits them (excluded from check A1)
validation-settings:     # you may edit these before approving
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
validation-baseline: null  # set in the pre-apply check: { <check ID>: passed | "failed: <summary>" | "not-run: <reason>" } or skipped
---

# Native Auth V2 migration plan — <app name>, phase <N>

> Review this plan. Reply **"approved"** to apply it, or tell the assistant
> what to change. Code is not changed until you approve this revision, and
> the plan can't be approved while "Decisions needed" has open items. The
> assistant's notes for applying it are in `working-notes.md`; you don't need
> to review them.

<Write for the app's developer, as references/writing-guide.md says. Sections
1–6 hold only what helps them approve: no unchanged items, rule IDs, or check
IDs. Everything the assistant needs while applying goes in working-notes.md.>

## At a glance

| Item | Value |
| --- | --- |
| Migrate now | <sign-in, sspr (password reset)> |
| Stay on V1 | <sign-up — reason, or "none"> |
| Users will notice | <N changes — section 3, or "nothing"> |
| Files | <N changed, M new (including K test files)> |
| Commands run on approval | <`npm run typecheck`, `npm test -- --watchAll=false` — before and after the change> |
| Decisions needed | <N — see below, or "none"> |

## Decisions needed

<Each open question: the options, what each changes, and which you suggest.
Remove an item once answered and record the answer under "Decisions and
revisions". Write "None." when empty. Examples:>

- [ ] <**Tests.** This app has no test framework. Choose one:
  **Add Vitest** (adds `vitest`, `jsdom`, and a `test` script; tests for
  each migrated flow) or **skip tests** (only the build runs; you test the
  flows by hand).>
- [ ] <**Uncommitted changes.** `src/auth/signin.ts` has your uncommitted
  changes and this plan changes it. Commit or stash them, then tell me to
  continue.>
- [ ] <**Sign-up form.** Keep the one-screen form (suggested; the password
  stays in memory until V2 asks for it after the email code), or ask for the
  password on a new screen after the code?>
- [ ] <**Tenant ID.** V2 steps reject the tenant domain
  (`contoso.onmicrosoft.com`) in the service URL with `AADSTS55200`. Give
  the tenant ID (suggested; it's on the tenant's overview page in the
  Microsoft Entra admin center) and the plan puts it in
  `Configuration.swift`, or keep the domain and V2 flows fail until the
  service accepts it.>
- [ ] <**SDK install.** This migration needs `@azure/msal-browser` 5.29.0 or
  later, and the version check couldn't run here. Run
  `npm install @azure/msal-browser@^5.29.0` and tell me when it's done, or
  say you'll install it before applying.>

## Previous phases

<"None." or one line per earlier phase folder, e.g.
- `phases/2026-10-27-sign-in-sspr/` — skill 0.3.0, sign-in and sspr migrated.>

## 1. What we found

Check that this matches your app.

| Item | Found |
| --- | --- |
| App | <e.g. React 19 single-page app, TypeScript> |
| Native auth today | <e.g. raw native auth API V1 calls in `src/auth/api.ts` / MSAL JS V1 methods, `@azure/msal-browser` 5.20.0> |
| Flows | <one line per flow with the steps the app has screens for, e.g. sign-in: password, MFA by email code> |
| Config | <file with the tenant, client ID, and base URL; proxy if any> |

## 2. Scope

| Flow | Decision | Reason |
| --- | --- | --- |
| <sign-in> | <Migrate / Defer / Already on V2> | <requested / customer keeps it on V1 / already on V2> |

<A flow that already mixes V1 and V2 calls must be migrated in this phase.>

## 3. What users will notice

<One numbered entry per change a user can see, including messages that
change or go away and steps the app has no screen for. Today and After say
what the user sees, in plain words. "None." if users notice nothing.>

**<1. Short title> (<flow>)**
- *Example:* <who does what>
- *Today:* <what they see with V1>
- *After:* <what they see with V2>

## 4. Files that will change

Ticked as they're applied. A deviation is noted under its item.

### Shared
- [ ] <SDK approach, when the SDK changes: `package.json` — `@azure/msal-browser`
  5.20.0 → 5.29.0. A failed install is noted here as "Waiting for the
  customer to install: <error>".>
- [ ] <`path` — what changes, in one line>

### <flow ID>
- [ ] <`path` — what changes, in one line>

### Tests
- [ ] <`test file` — added / updated: what it covers>

<When a flow stays on V1, end with one line saying how it keeps working,
e.g. "sign-up stays on V1: it keeps using the V1 client, which isn't
changed.">

## 5. Checks run when you approve

Run twice: before any change, and after. A failure the migration causes is
fixed up to `max-fix-attempts` times; each command may run up to
`command-timeout-minutes` (edit `validation-settings` in the front matter to
change these).

| Check | Command |
| --- | --- |
| <Build and type-check> | `<npm run build>` |
| <Unit tests> | `<npm test -- --watchAll=false>` |

<Say if the project has no build or test command: the migration won't
create one.> Tests that need a real tenant are never run or changed
(<list them, or "none found">); the report ends with a manual test script.

## 6. Risks and actions for you

<Only what the migration itself could break, or what it needs the developer
to do, each with what to do. Not general setup or testing they already know.
"None." when empty. E.g.
- **Production proxy.** If the app runs behind a gateway outside this repo,
  it must forward the V2 endpoints (`/oauth2/v2.0/authorize-challenge`, …).
- [ ] **SDK install.** Install `@azure/msal-browser` 5.29.0 or later before
  approving; the migration checks it first.>

## Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | <date> | Migration requested → scope <flow IDs> | "<request>" | 1 |
