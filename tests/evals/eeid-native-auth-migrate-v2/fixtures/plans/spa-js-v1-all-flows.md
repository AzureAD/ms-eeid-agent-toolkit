---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "{{SKILL_VERSION}}"   # a different installed version restarts the migration
app-root: .
approach: api            # api | sdk (sdk not supported yet)
phase: 1
status: draft            # draft | approved | applying | applied | reviewed | validated | reported
revision: 1
scope: [sign-in, sign-up, sspr]
deferred: {}
approved: null           # { revision: N, date: YYYY-MM-DD, how: "confirmed in chat" }
baseline:
  commit: {{COMMIT}}
  files:
    cors.js: {{HASH}}
    src/config.js: {{HASH}}
    src/api/nativeAuthClient.js: {{HASH}}
    src/auth/errors.js: {{HASH}}
    src/auth/signIn.js: {{HASH}}
    src/auth/resetPassword.js: {{HASH}}
    src/auth/signUp.js: {{HASH}}
    src/auth/tokenStore.js: {{HASH}}
    src/ui/app.js: {{HASH}}
    src/ui/messages.js: {{HASH}}
    test/mockFetch.js: {{HASH}}
    test/signIn.test.js: {{HASH}}
    test/resetPassword.test.js: {{HASH}}
    test/signUp.test.js: {{HASH}}
dirty-files: []          # files with uncommitted changes when planned; the migration never edits them (excluded from check A1)
validation-settings:     # you may edit these before approving
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
validation-baseline: null  # set in the pre-apply check: { <check ID>: passed | "failed: <summary>" | "not-run: <reason>" } or skipped
---

# Native Auth V2 migration plan — Contoso sign-in SPA, phase 1

> Review this plan. Reply **"approved"** to apply it, or tell the assistant
> what to change. Code is not changed until you approve this revision, and
> the plan can't be approved while "Decisions needed" has open items.

## At a glance

| Item | Value |
| --- | --- |
| Migrate now | sign-in, sign-up, sspr |
| Stay on V1 | none |
| Users will notice | sign-in: none on the normal path; users who need MFA or method registration go to browser sign-in. sspr: none on the normal path; an SMS-only reset goes to browser sign-in. sign-up: the form is unchanged, but the email code is sent first and the password and display name are sent after it. |
| Files to change / add | 10 changed, 2 new, 1 removed (including 4 test files changed and 1 added) |
| Commands run on approval | `node --check cors.js`, `npm test` — twice (baseline and after) |
| You must do manually | 3 items — section 10 |
| Decisions needed | none |

## Decisions needed

None.

## Previous phases

None.

## 1. Application profile

| Item | Detected |
| --- | --- |
| Platform | Web SPA, plain JavaScript (ES modules), no framework |
| Integration | Raw native auth API V1 (no SDK) |
| HTTP layer | `fetch` in `src/api/nativeAuthClient.js` (`postRequest`) |
| Dev/CORS proxy | `cors.js` maps `http://localhost:3001/api/*` to `https://contoso.ciamlogin.com/contoso.onmicrosoft.com/*`; answers `OPTIONS` locally |
| Production proxy | None in this repo |
| Tenant and endpoint config | `src/config.js` (`BASE_URL`, `CLIENT_ID`, `ENDPOINTS`, `CHALLENGE_TYPES`) |
| Scopes requested today | `openid offline_access` — kept unchanged |
| Token storage | sessionStorage via `src/auth/tokenStore.js` — unchanged |
| Flows found | sign-in (password, email OTP), sign-up (one screen: email, password, display name; email OTP; signs in after sign-up), sspr (email OTP; polling; signs in after reset) |

## 2. Scope

| Flow | Methods and sub-flows the V1 UI handles | Other V2 steps (→ unhandled outcome) | Decision | Reason |
| --- | --- | --- | --- | --- |
| sign-in | password, email OTP; no MFA, no JIT registration | MFA, JIT registration, SMS | Migrate | |
| sign-up | email OTP, password, display name; signs in after sign-up | JIT registration; attributes the form doesn't collect | Migrate | |
| sspr | email OTP; signs in after reset (no MFA handling on that sign-in) | SMS; MFA or registration after the reset → V1's generic error | Migrate | |

## 3. V1 inventory

| File | Line(s) | Flow | Kind | Shared? | V1 usage |
| --- | --- | --- | --- | --- | --- |
| `src/config.js` | 14–33 | all | config | yes | `CHALLENGE_TYPES`, V1 `ENDPOINTS` |
| `src/api/nativeAuthClient.js` | 19–35 | all | endpoint | yes | form-encoded `postRequest`, `challenge_type: redirect` → `RedirectRequiredError` |
| `src/auth/errors.js` | 14–28 | all | error code | yes | `user_not_found`, `user_already_exists`, `invalid_grant` + suberrors, AADSTS50126 |
| `src/auth/signIn.js` | 9–74 | sign-in | endpoint | `signInWithContinuationToken` used by sign-up and sspr | `initiate`, `challenge`, `token` (`password`, `oob`, `continuation_token`) |
| `src/auth/resetPassword.js` | 7–77 | sspr | endpoint | no | `resetpassword/v1.0/*`, `poll_completion`, `poll_interval` |
| `src/auth/signUp.js` | 7–49 | sign-up | endpoint | no | `signup/v1.0/*`; signs in through `signInWithContinuationToken` |
| `src/ui/app.js` | 9–50 | all | UI | yes | keeps the continuation token in memory; `browserRequired` → browser sign-in |
| `cors.js` | 13–15 | all | proxy | yes | allows `POST, OPTIONS` and `Content-Type` only |

## 4. Coexistence notes

- No flow stays on V1, so the V1 client, V1 config, V1 error mappings, and
  `signInWithContinuationToken` are removed (cleanup step).
- Every flow uses the new V2 client; no flow mixes V1 and V2.
- `src/ui/app.js` doesn't change: each flow function keeps its name,
  parameters, and outcome objects, and the V2 flow state (latest
  continuation token and allowed links) is returned in the outcome's
  `continuationToken` field, where V1 returned its continuation token.

## 5. Behavior changes users will see

| Flow | Today (V1) | After migration (V2) |
| --- | --- | --- |
| sign-in | MFA or method registration would fail | sent to browser sign-in (the app has no MFA or registration screens) |
| sspr | reset with email code, then signed in | unchanged; an SMS-only reset goes to browser sign-in |
| sign-up | one form sends email, password, and display name, then the email code | same form; the email code is sent first, then the password and display name; an attribute the form doesn't collect sends the user to browser sign-in |
| all | browser fallback continues the flow | browser fallback restarts sign-in |

## 6. Error handling map

| Flow | V1 error the UI handles | V2 condition | UI message (unchanged unless noted) |
| --- | --- | --- | --- |
| sign-in, sspr | `user_not_found` | `invalidRequest` + `userNotFound` / AADSTS50034 | "The email or password is incorrect." — generic |
| sign-in | `invalid_grant` + AADSTS50126 | `invalidGrant` + `invalidUserNameOrPassword` | "The email or password is incorrect." |
| sign-in, sspr | `invalid_grant` + `invalid_oob_value` | `invalidGrant` + `invalidOneTimeCode` | "That code isn't right…" |
| sign-up, sspr | `invalid_grant` + password suberrors | `invalidRequest` + `passwordTooWeak` (and the other password inner codes); sign-up also `attributeValidationError` with `password` in `attributeIds` | "Choose a stronger password." |
| sign-up | `user_already_exists` | sign-up start returns `action: challenge` | "An account with this email already exists. Sign in instead." |
| sign-up | `attributes_required` | detail `attributeRequired` | "Fill in all required fields." |
| sspr | `poll_completion` `status: failed` | error body from `poll` | "We couldn't reset your password…" |
| sspr | polling limit reached | still `poll` after 10 attempts | "Resetting your password is taking too long…" |
| all | `challenge_type: redirect` | web fallback signals, or any unhandled response | browser sign-in (existing `browserRequired` outcome) |

## 7. Implementation steps

Tick items as they are applied (`[x]`). Note any deviation under the item.

### Shared
- [ ] `src/config.js`: add `V2_ENDPOINTS` (`authorizeChallenge: "/oauth2/v2.0/authorize-challenge"`, `token: "/oauth2/v2.0/token"`); remove every V1 endpoint and `CHALLENGE_TYPES` (cleanup).
- [ ] New `src/api/nativeAuthV2Client.js`: V2 client next to the V1 client — start and resume authorization, code exchange, `send` for links (JSON, `client-request-id`), link resolver, HAL response handler, V2 error and unhandled-response types.
- [ ] `src/auth/errors.js`: map the V2 errors in section 6; an unhandled response maps to `browserRequired`; remove the V1 mappings (cleanup).
- [ ] Remove `src/api/nativeAuthClient.js` (cleanup: nothing uses the V1 client any more).
- [ ] `cors.js`: allow `PUT` and the `client-request-id` header, forward `client-request-id`, expose `x-ms-request-id`.

### sign-in
- [ ] `src/auth/signIn.js`: `startSignIn`, `submitPassword`, `submitCode` follow the V2 sign-in step table (password first when both methods are offered, as V1's `password oob redirect` order); same functions and outcomes; V2 flow state in the outcome's `continuationToken`; MFA, `enroll`, and any other unhandled response → `browserRequired`. Remove the V1 `signInWithContinuationToken` (cleanup).

### sign-up
- [ ] `src/auth/signUp.js`: `startSignUp`, `submitSignUpCode` follow the V2 sign-up step table — the start request sends only the email; the password and display name stay in memory in the flow state and are submitted only when `collectAttributes` asks for them; an existing account (`action: challenge`) → `userAlreadyExists` without following its links; an attribute the form doesn't collect → `browserRequired`; sign in after sign-up as V1 did (code exchange).

### sspr
- [ ] `src/auth/resetPassword.js`: `startPasswordReset`, `submitResetCode`, `submitNewPassword` follow the V2 reset step table; `PUT` to `update`; poll 1.5 seconds apart, at most 10 attempts (V1's own limit), keeping the `delay` option; `challenge` or `enroll` after polling → V1's generic error; sign in after the reset as V1 did (code exchange).

### Tests
- [ ] `test/mockFetch.js`: also record JSON request bodies and the HTTP method.
- [ ] `test/signIn.test.js`: update to V2 — password and email OTP through code exchange, unknown user and wrong password, wrong code, web fallback, MFA and `enroll` → web fallback.
- [ ] `test/signUp.test.js`: update to V2 — email first, then password and display name through code exchange; attributes submitted only when asked; existing account; password policy error; attribute the form doesn't collect.
- [ ] `test/resetPassword.test.js`: update to V2 — success through `PUT update`, polling, and sign-in; unknown user; poll error; polling limit; MFA after reset.
- [ ] New `test/nativeAuthV2Client.test.js`: the V2 client required tests (link resolver, ignored extra links, unhandled responses, token field per endpoint, entry 401, resume, error normalization, web fallback signals, code length, method type case).

## 8. Security considerations

New code follows the skill's security guardrails. After applying, a security
review fixes any issue in the migration's own changes and reports issues
already in the inventoried code, without changing that code.

Rules that matter most for this app:

| Rule | How this migration meets it |
| --- | --- |
| SEC-03 Flow state where V1 kept it | V2 token and links kept in the same in-memory screen state as V1; token storage unchanged |
| SEC-06 No account enumeration | sign-in and reset keep one generic message for unknown users; sign-up keeps its V1 existing-account message |
| API-01 Validated links | all V2 links go through the resolver; absolute links are never requested |

Known pre-existing concerns seen during inventory: none.

## 9. Validation approach

> **Approving this plan also runs the commands below**, twice: once before
> any change (baseline) and once after the migration. A failure caused by the
> migration is fixed and re-checked up to `max-fix-attempts` times; each
> command may run up to `command-timeout-minutes`. Edit
> `validation-settings` in the front matter to change these limits.

| ID | Check | Command |
| --- | --- | --- |
| A1–A7 | Scope and V2 contract checks | search and `git diff` (no command to approve) |
| B1 | Proxy syntax check | `node --check cors.js` |
| C1 | Unit tests | `npm test` |
| D | Tests that need a real tenant | Not run — manual script in the report |

### Tests

Only unit and component tests with a mocked service boundary are added or
changed. Tests that need a real tenant (end-to-end, UI, device, emulator)
are never added, run, or changed.

| Item | Detail |
| --- | --- |
| Test framework | `node:test` (`npm test` runs `node --test`) |
| Tests to update | `test/signIn.test.js`, `test/signUp.test.js`, `test/resetPassword.test.js`, `test/mockFetch.js` |
| Tests to add | `test/nativeAuthV2Client.test.js` |
| Tenant-dependent tests (not run or changed) | none found |

## 10. Manual prerequisites (customer)

- [ ] Restart the dev proxy after the `cors.js` change.
- [ ] Update any production proxy or gateway with the V2 paths, `PUT`, and `client-request-id`.

## 11. Assumptions, risks, out of scope

- After this phase no flow uses V1.

## 12. Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | {{TODAY}} | Migration requested → scope sign-in, sign-up, sspr. V2-native option for sign-up (ask for the password after the code) offered; customer keeps the one-screen form | "Migrate this app to native authentication API V2." | 1 |
