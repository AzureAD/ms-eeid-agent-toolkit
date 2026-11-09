---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "{{SKILL_VERSION}}"   # a different installed version restarts the migration
app-root: .
approach: sdk            # api | sdk (sdk: JavaScript single-page apps only)
phase: 1
status: draft            # draft | approved | applying | applied | reviewed | validated | reported
revision: 1
scope: [sign-in, sspr]
deferred:
  sign-up: "customer keeps it on V1 for now"
approved: null           # { revision: N, date: YYYY-MM-DD, how: "confirmed in chat" }
baseline:
  commit: {{COMMIT}}
  files:
    package.json: {{HASH}}
    cors.js: {{HASH}}
    src/config.js: {{HASH}}
    src/auth/msalApp.js: {{HASH}}
    src/auth/account.js: {{HASH}}
    src/auth/errors.js: {{HASH}}
    src/auth/signIn.js: {{HASH}}
    src/auth/signUp.js: {{HASH}}
    src/auth/resetPassword.js: {{HASH}}
    src/ui/app.js: {{HASH}}
    src/ui/messages.js: {{HASH}}
    test/fakeSdk.js: {{HASH}}
    test/signIn.test.js: {{HASH}}
    test/signUp.test.js: {{HASH}}
    test/resetPassword.test.js: {{HASH}}
dirty-files: []          # files with uncommitted changes when planned; the migration never edits them (excluded from check A1)
validation-settings:     # you may edit these before approving
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
validation-baseline: null  # set in the pre-apply check: { <check ID>: passed | "failed: <summary>" | "not-run: <reason>" } or skipped
---

# Native Auth V2 migration plan — Contoso sign-in SPA (SDK), phase 1

> Review this plan. Reply **"approved"** to apply it, or tell the assistant
> what to change. Code is not changed until you approve this revision, and
> the plan can't be approved while "Decisions needed" has open items.

## At a glance

| Item | Value |
| --- | --- |
| Migrate now | sign-in, sspr |
| Stay on V1 | sign-up — customer keeps it on V1 for now |
| Users will notice | The V2 SDK methods are experimental (not for production) in the planned `@azure/msal-browser`. sign-in: none; the same form sends the email first and the password when the SDK asks for it. sspr: none. sign-in and sspr: an expired session shows the generic error instead of "Your session expired". |
| Files to change / add | 8 changed, 0 new (including 3 test files changed) |
| Commands run on approval | `node --check cors.js`, `npm test` — twice (baseline and after) |
| You must do manually | 4 items — section 10 |
| Decisions needed | none |

## Decisions needed

None.

## Previous phases

None.

## 1. Application profile

| Item | Detected |
| --- | --- |
| Platform | Web SPA, plain JavaScript (ES modules), no framework |
| Integration | MSAL JS native auth SDK V1 (`CustomAuthPublicClientApplication`) |
| UI framework | none (DOM wiring in `src/ui/app.js`) |
| SDK version | `@azure/msal-browser` `^5.20.0` → latest 5.x (at least 5.29.0) |
| CORS proxy | `cors.js` maps `http://localhost:3001/api/*` to `https://contoso.ciamlogin.com/contoso.onmicrosoft.com/*`; allows `POST, OPTIONS` and the SDK headers |
| Production proxy | None in this repo |
| Tenant and app config | `src/config.js` (`customAuthConfig`: authority, client ID, `authApiProxyUrl`, `challengeTypes`) |
| Scopes requested today | `openid offline_access` (`SCOPES`) — kept unchanged |
| Token storage | SDK cache in sessionStorage (`cache.cacheLocation`) — unchanged |
| Flows found | sign-in (one screen: email and password; email OTP), sign-up (one screen: email, password, display name; email OTP; signs in after sign-up), sspr (email OTP; signs in after reset) |

## 2. Scope

| Flow | Methods and sub-flows the V1 UI handles | Other V2 steps (→ unhandled outcome) | Decision | Reason |
| --- | --- | --- | --- | --- |
| sign-in | password (sent with the email), email OTP; no MFA, no JIT registration | SMS, MFA, JIT registration (more than one usable method: first in V1's order, no choice screen) | Migrate | |
| sign-up | email OTP, password, display name; signs in after sign-up | — | Defer | customer keeps it on V1 for now |
| sspr | email OTP; signs in after reset (no MFA handling on that sign-in) | SMS; MFA or registration after the reset → V1's generic error | Migrate | |

## 3. V1 inventory

| File | Line(s) | Flow | Kind | Shared? | V1 usage |
| --- | --- | --- | --- | --- | --- |
| `package.json` | 11–13 | all | dependency | yes | `@azure/msal-browser` `^5.20.0` |
| `src/config.js` | 2–20 | all | config | yes | `customAuth.challengeTypes`, `authApiProxyUrl` |
| `src/auth/msalApp.js` | 1–11 | all | SDK instance | yes | `CustomAuthPublicClientApplication.create` |
| `src/auth/errors.js` | 1–22 | all | error checks | yes | `isRedirectRequired`, `isUserNotFound`, `isPasswordIncorrect`, `isInvalidCode`, `isUserAlreadyExists`, `isInvalidPassword`, `isMissingRequiredAttributes`, `isAttributesValidationFailed`, `isTokenExpired` |
| `src/auth/signIn.js` | 1–30 | sign-in | SDK calls | `toSignInOutcome` used by sign-up and sspr | `app.signIn({ username, password, scopes })`, `submitCode`, `isCompleted`, `isCodeRequired`, `getSentTo`, `getCodeLength` |
| `src/auth/signUp.js` | 1–32 | sign-up | SDK calls | no | `app.signUp({ username, password, attributes })`, `submitCode`, completed `state.signIn({ scopes })` |
| `src/auth/resetPassword.js` | 1–40 | sspr | SDK calls | no | `app.resetPassword`, `submitCode`, `submitNewPassword`, completed `state.signIn({ scopes })` |
| `src/ui/app.js` | 10–70 | all | UI | yes | keeps the SDK state object in memory; `browserRequired` → browser sign-in |
| `cors.js` | 14–25 | all | proxy | yes | allows `POST, OPTIONS` only |

## 4. Coexistence notes

- sign-up stays on V1: `src/auth/signUp.js` and `test/signUp.test.js`
  don't change, and keep calling the V1 `signUp`, the V1 checks, and the V1
  continuation `state.signIn({ scopes })`.
- `customAuth.challengeTypes` stays in the config for V1 sign-up (V2
  ignores it), so `src/config.js` doesn't change.
- `src/auth/errors.js` keeps the V1 checks sign-up uses and adds the V2
  checks; `toSignInOutcome` keeps serving the V1 sign-up continuation.
- `test/fakeSdk.js` keeps the V1 fakes sign-up's tests use and adds V2 fakes.
- The one app instance from `src/auth/msalApp.js` stays; every flow calls its
  V2 method.
- `src/ui/app.js` doesn't change: each flow function keeps its name,
  parameters, and outcome objects, and the V2 state object is returned in
  the outcome's `state` field, where V1 returned its state object.
- `src/auth/account.js` doesn't change: tokens and sign-out work the same
  after V2 sign-in.

## 5. Behavior changes users will see

| Flow | Today (V1) | After migration (V2) |
| --- | --- | --- |
| all | stable SDK methods | V2 SDK methods marked experimental; latest 5.x, at or above the minimum |
| sign-in | email and password sent together | same form; the email is sent first and the password when the SDK asks for it |
| sign-in, sspr | expired session → "Your session expired. Start again." | the generic error (V2 has no expired-session check) |

## 6. Error handling map

| Flow | V1 check the UI handles | V2 check | UI message (unchanged unless noted) |
| --- | --- | --- | --- |
| sign-in, sspr | `isUserNotFound()` | `isUserNotFound()` | "The email or password is incorrect." — generic |
| sign-in | `isPasswordIncorrect()` | `isInvalidPassword()` | "The email or password is incorrect." |
| sign-in, sspr | `isInvalidCode()` | `isInvalidCode()` | "That code isn't right…" |
| sspr | `isInvalidPassword()` | `isInvalidPassword()` | "Choose a stronger password." |
| sign-in, sspr | `isTokenExpired()` | none | generic error (behavior change) |
| sign-in, sspr | `isRedirectRequired()` | `isBrowserRequired()` | browser sign-in (existing `browserRequired` outcome) |

## 7. Implementation steps

Tick items as they are applied (`[x]`). Note any deviation under the item.

### Shared
- [ ] `package.json`: `@azure/msal-browser` latest 5.x (at least 5.29.0), keeping the `^` style; install with `npm install @azure/msal-browser@5` so the lockfile records it.
- [ ] `src/auth/errors.js`: add the V2 checks in section 6, per flow (a wrong sign-in password stays "incorrect", not "choose a stronger password"); keep the V1 checks for sign-up.
- [ ] `cors.js`: allow `PUT`.

### sign-in
- [ ] `src/auth/signIn.js`: `startSignIn(app, username, password)` calls `signInV2({ username, scopes })`, submits the held password on `passwordRequired` and clears it; `codeRequired` → the code screen; more than one usable method → select the first in V1's `challengeTypes` order without asking; `submitSignInCode` handles `completed`; any other state → generic error; same functions and outcomes.

### sspr
- [ ] `src/auth/resetPassword.js`: `startPasswordReset` calls `resetPasswordV2({ username, scopes })`; `codeRequired` → code screen; `submitResetCode` handles `newPasswordRequired`; `submitNewPassword` handles `signInContinuation` → `signIn()`; MFA or registration after the reset → V1's generic error.

### Tests
- [ ] `test/fakeSdk.js`: keep the V1 fakes; add fakes for V2 results (`isState`, `isFailed`, `isPasswordRequired`), V2 states, and `AuthFlowErrorV2` checks.
- [ ] `test/signIn.test.js`: update to V2 — password through `passwordRequired` with the held password, email OTP, unknown user and wrong password share a message, wrong code, browser required, an unexpected state.
- [ ] `test/resetPassword.test.js`: update to V2 — code, new password, `signIn()`; unknown user; wrong code; MFA after reset → generic error.

## 8. Security considerations

New code follows the skill's security guardrails. After applying, a security
review fixes any issue in the migration's own changes and reports issues
already in the inventoried code, without changing that code.

Rules that matter most for this app:

| Rule | How this migration meets it |
| --- | --- |
| SDKJS-02 State objects in memory, per flow | V2 state objects returned in the outcome's `state`, kept in `src/ui/app.js` memory as V1's were; held passwords cleared after submission |
| SEC-06 No account enumeration | sign-in and reset keep one generic message for unknown users |
| SDKJS-01 Approved SDK version | latest 5.x, at or above the 5.29.0 minimum, from the configured registry |

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
| Tests to update | `test/fakeSdk.js`, `test/signIn.test.js`, `test/resetPassword.test.js` |
| Tests to add | none |
| Tenant-dependent tests (not run or changed) | none found |

## 10. Manual prerequisites (customer)

- [ ] Tenant enrolled in the Native Auth API V2 private preview.
- [ ] Accept that the V2 SDK methods are experimental in the planned `@azure/msal-browser`.
- [ ] Restart the dev proxy after the `cors.js` change.
- [ ] Update any production proxy or gateway with `PUT` and the V2 paths.

## 11. Assumptions, risks, out of scope

- V2 is in private preview and the V2 SDK methods are experimental; both may change.
- sign-up stays on V1 until a later phase.

## 12. Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | {{TODAY}} | Migration requested → scope sign-in, sspr; sign-up deferred | "Move sign-in and password reset to native authentication V2; keep sign-up on V1 for now." | 1 |
