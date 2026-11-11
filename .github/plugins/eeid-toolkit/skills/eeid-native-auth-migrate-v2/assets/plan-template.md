---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "<metadata.version of the skill>"   # a different installed version restarts the migration
app-root: <path to the app root, relative to the workspace>
approach: api            # api | sdk (sdk: JavaScript single-page apps, iOS and macOS apps)
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
dirty-files: []          # files with uncommitted changes when planned; the migration never edits them (excluded from check A1)
validation-settings:     # you may edit these before approving
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
validation-baseline: null  # set in the pre-apply check: { <check ID>: passed | "failed: <summary>" | "not-run: <reason>" } or skipped
---

# Native Auth V2 migration plan — <app name>, phase <N>

> Review this plan. Reply **"approved"** to apply it, or tell the assistant
> what to change. Code is not changed until you approve this revision, and
> the plan can't be approved while "Decisions needed" has open items.

## At a glance

| Item | Value |
| --- | --- |
| Migrate now | <sign-in, sspr> |
| Stay on V1 | <sign-up — reason> |
| Users will notice | <per migrated flow: behavior changes, or "none"> |
| Files to change / add | <N changed, M new (including K test files)> |
| Commands run on approval | <`npm run typecheck`, `npm test -- --watchAll=false` — twice (baseline and after)> |
| You must do manually | <N items — section 10> |
| Decisions needed | <N — see below, or "none"> |

## Decisions needed

<Remove this section's items as the customer answers them; record each
answer under "Decisions and revisions". Write "None." when empty.>

- [ ] <e.g. Tests: this project has no test framework. Introduce <framework>
  (adds <dependencies> and `<test command>`) or skip tests?>
- [ ] <e.g. `src/auth/signin.ts` has your uncommitted changes and this plan
  changes it. Commit or stash them, then tell me to continue.>
- [ ] <e.g. V2-native option. Sign-up: keep the one-screen form (suggested;
  the password stays in memory until V2 asks for it after the email code),
  or ask for the password after the code (no buffered password, one more
  screen)?>

## Previous phases

<"None." or each earlier phase folder with its skill version and outcome, e.g.
- `phases/2026-10-27-sign-in-sspr/` — skill 0.3.0, sign-in and sspr migrated.
- `phases/2026-11-03-sign-up-restarted/` — skill 0.3.0, restarted after the
  skill was updated to 0.4.0; code changes reverted.>
<If an earlier phase used a different skill version, add a risk in section 11:
the code it migrated may need changes; check the release notes.>

## 1. Application profile

| Item | Detected |
| --- | --- |
| Platform | <e.g. Web SPA (React 19, TypeScript, react-router)> |
| Integration | <from the approach guide, e.g. Raw native auth API V1 (no SDK)> |
| <Approach-specific rows> | <e.g. HTTP layer, dev/CORS proxy, production proxy> |
| Tenant and endpoint config | <file where base URL, tenant, and client ID are set> |
| Scopes requested today | <e.g. `openid offline_access api://…/read` — kept unchanged> |
| Token storage | <e.g. sessionStorage via src/auth/tokenStore.ts — unchanged> |
| Flows found | <sign-in (password + MFA email OTP), sign-up (password + email OTP), sspr (email OTP)> |

## 2. Scope

| Flow | Methods and sub-flows the V1 UI handles | Other V2 steps (→ unhandled outcome) | Decision | Reason |
| --- | --- | --- | --- | --- |
| sign-in | <password, MFA (email OTP)> | <SMS, JIT registration> | Migrate | |
| sign-up | <email OTP, password, dynamic attributes; no sign-in after sign-up> | <JIT registration> | Defer | <customer keeps it on V1> |
| sspr | <email OTP; sign-in after reset> | <SMS> | Migrate | |

<Decision is Migrate, Defer, or Already on V2 (left unchanged). A flow that
already mixes V1 and V2 calls must be migrated in this phase.>

## 3. V1 inventory

| File | Line(s) | Flow | Kind | Shared? | V1 usage |
| --- | --- | --- | --- | --- | --- |
| | | | <endpoint / response field / error code / UI / config> | <no / with sign-up> | |

## 4. Coexistence notes

<Shared code and how flows that stay on V1 keep working. Confirm no flow
mixes V1 and V2, including MFA and JIT inside each flow.>

## 5. Behavior changes users will see

| Flow | Today (V1) | After migration (V2) |
| --- | --- | --- |
| <sign-up> | <one form sends email, password, and attributes, then OTP> | <same form; email sent first, code verified, then password and attributes; service may ask for extra attributes> |
| <sign-in> | <users without an MFA method register it in the app (V1 JIT)> | <unchanged, V2 JIT registration — or: sent to web fallback if V1 had no JIT> |
| <all> | <browser fallback continues the flow> | <browser fallback restarts sign-in> |

## 6. Error handling map

| Flow | V1 error the UI handles | V2 condition | UI message (unchanged unless noted) |
| --- | --- | --- | --- |
| <sign-in> | <`user_not_found`> | <`invalidRequest` + `userNotFound` / AADSTS50034> | <"User not found" — unchanged (V1 conflict); finding in section 8> |
| <sign-up> | <`user_already_exists`> | <sign-up start returns `action: challenge`> | <"An account with this email already exists" — unchanged> |

<V2 conditions come from the approach's error reference. Anything not
mapped uses the app's existing generic error.>

## 7. Implementation steps

Tick items as they are applied (`[x]`). Note any deviation under the item.

### Shared
- [ ] <from the approach guide, e.g. add V2 client; config; dev proxy>

### <flow ID>
- [ ] <file: change>

### Tests
- [ ] <test file: update / add — what it covers>

## 8. Security considerations

New code follows the skill's security guardrails. After applying, a security
review fixes any issue in the migration's own changes and reports issues
already in the inventoried code, without changing that code.

Rules that matter most for this app:

| Rule | How this migration meets it |
| --- | --- |
| <e.g. SEC-03 Flow state where V1 kept it> | <V2 continuation token and links kept in the same in-memory flow state as V1; token storage unchanged> |
| <e.g. SEC-06 No account enumeration> | <Sign-in and reset messages keep V1 wording (V1 conflict); unknown-user disclosure reported below; no new disclosure> |
| <e.g. API-01 Validated links> | <All V2 links go through `resolveLink`> |

Known pre-existing concerns seen during inventory: <list, or "none"; they are
reported, not fixed>.

## 9. Validation approach

> **Approving this plan also runs the commands below**, twice: once before
> any change (baseline) and once after the migration. A failure caused by the
> migration is fixed and re-checked up to `max-fix-attempts` times; each
> command may run up to `command-timeout-minutes`. Edit
> `validation-settings` in the front matter to change these limits.

| ID | Check | Command |
| --- | --- | --- |
| A1–A7 | Scope and V2 contract checks | search and `git diff` (no command to approve) |
| B1 | <Type-check / build> | `<e.g. npm run typecheck>` |
| C1 | <Unit tests> | `<e.g. npm test -- --watchAll=false>` |
| D | Tests that need a real tenant | Not run — manual script in the report |

<If the project defines no build or test commands, say so. The migration
won't create any; only the A checks and the manual script apply.>

### Tests

Only unit and component tests with a mocked service boundary are added or
changed. Tests that need a real tenant (end-to-end, UI, device, emulator)
are never added, run, or changed.

| Item | Detail |
| --- | --- |
| Test framework | <e.g. Vitest (package.json) / XCTest target `AppTests` / JUnit — or "none found" (see Decisions needed)> |
| Tests to update | <test files that assert V1 behavior for migrated flows, or "none"> |
| Tests to add | <new test files and what they cover, from the approach's required tests> |
| Tenant-dependent tests (not run or changed) | <e.g. e2e/signin.spec.ts — or "none found"> |

## 10. Manual prerequisites (customer)

- [ ] <Approach-specific items from the approach guide>

## 11. Assumptions, risks, out of scope

- <...>

## 12. Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | <date> | Migration requested → scope <flow IDs> | "<request>" | 1 |
| 2 | <date> | <e.g. Tests: introduce Vitest> | "<answer>" | 1 → 2 |
| 3 | <date> | Revision 2 approved | "<approval>" | 2 |
