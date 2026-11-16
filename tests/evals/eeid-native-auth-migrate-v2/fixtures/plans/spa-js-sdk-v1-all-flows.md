---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "{{SKILL_VERSION}}"   # a different installed version restarts the migration
app-root: .
approach: sdk            # api | sdk (sdk: JavaScript single-page apps only)
phase: 1
status: draft            # draft | approved | applying | applied | reviewed | validated | reported
revision: 1
scope: [sign-in, sign-up, sspr]
deferred: {}
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
dirty-files: []          # files inside app-root with uncommitted changes when planned; the migration never edits them (excluded from check A1)
validation-settings:     # you may edit these before approving
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
validation-baseline: null  # set in the pre-apply check: { <check ID>: passed | "failed: <summary>" | "not-run: <reason>" } or skipped
---

# Native Auth V2 migration plan — Contoso sign-in SPA (SDK), phase 1

> Review this plan. Reply **"approved"** to apply it, or tell the assistant
> what to change. Code is not changed until you approve this revision, and
> the plan can't be approved while "Decisions needed" has open items. The
> assistant's notes for applying it are in `working-notes.md`; you don't need
> to review them.

## At a glance

| Item | Value |
| --- | --- |
| Migrate now | sign-in, sign-up, sspr |
| Stay on V1 | none |
| Users will notice | 2 changes — section 3 |
| Files | 11 changed, 0 new (including 4 test files changed) |
| Commands run on approval | `node --check cors.js`, `npm test` — before and after the change |
| Decisions needed | none |

## Decisions needed

None.

## Previous phases

None.

## 1. What we found

Check that this matches your app.

| Item | Found |
| --- | --- |
| App | Web SPA, plain JavaScript (ES modules), no framework |
| Native auth today | MSAL JS native auth SDK V1 (`CustomAuthPublicClientApplication`); `@azure/msal-browser` `^5.20.0` → latest 5.x (at least 5.29.0) |
| Flows | sign-in (one screen: email and password; email OTP), sign-up (one screen: email, password, display name; email OTP; signs in after sign-up), sspr (email OTP; signs in after reset) |
| Config | `src/config.js` (`customAuthConfig`: authority, client ID, `authApiProxyUrl`, `challengeTypes`) |

## 2. Scope

| Flow | Decision | Reason |
| --- | --- | --- |
| sign-in | Migrate | requested |
| sign-up | Migrate | requested |
| sspr | Migrate | requested |

## 3. What users will notice

**1. Signing up with an existing account may send an email** (sign-up)
- *Example:* someone signs up with an email that already has an account.
- *Today:* "An account with this email already exists."
- *After:* the same message, but that account may also get a sign-in code
  email it can't use.

**2. An expired session shows the generic error** (all flows)
- *Example:* a user leaves the code screen open until the session expires,
  then submits the code.
- *Today:* "Your session expired. Start again."
- *After:* the app's generic error message.

## 4. Files that will change

Ticked as they're applied. A deviation is noted under its item.

### Shared
- [ ] `package.json`: `@azure/msal-browser` latest 5.x (at least 5.29.0), keeping the `^` style; install with `npm install @azure/msal-browser@5` so the lockfile records it.
- [ ] `src/config.js`: remove `customAuth.challengeTypes` (cleanup; V1 only). Keep `authApiProxyUrl` and `SCOPES`.
- [ ] `src/auth/errors.js`: map the V2 checks in the error mapping (`working-notes.md`), per flow (a wrong sign-in password stays "incorrect", not "choose a stronger password"); remove the V1 checks (cleanup).
- [ ] `cors.js`: allow `PUT`.
- [ ] `cors.js`: set `TARGET_PATH` to the tenant ID, `"/00000000-0000-0000-0000-000000000001"`, instead of the tenant domain (V2 steps reject the domain; V1 calls accept either).

### sign-in
- [ ] `src/auth/signIn.js`: `startSignIn(app, username, password)` calls `signInV2({ username, scopes })`, submits the held password on `passwordRequired` and clears it; `codeRequired` → the code screen; more than one usable method → select the first in V1's `challengeTypes` order without asking; `submitSignInCode` handles `completed`; any other state → generic error; same functions and outcomes.

### sign-up
- [ ] `src/auth/signUp.js`: `startSignUp` calls `signUpV2({ username, attributes, scopes })` without the password; the three existing-account states → `userAlreadyExists` with no further call; `submitSignUpCode` handles `passwordRequired` (submits the held password), `attributesRequired` (submits only requested attributes the form collected; others → generic error), and `signInContinuation` → `signIn()` as V1 signed in after sign-up.

### sspr
- [ ] `src/auth/resetPassword.js`: `startPasswordReset` calls `resetPasswordV2({ username, scopes })`; `codeRequired` → code screen; `submitResetCode` handles `newPasswordRequired`; `submitNewPassword` handles `signInContinuation` → `signIn()`; MFA or registration after the reset → V1's generic error.

### Tests
- [ ] `test/fakeSdk.js`: fakes for V2 results (`isState`, `isFailed`, `isPasswordRequired`), V2 states, and `AuthFlowErrorV2` checks.
- [ ] `test/signIn.test.js`: update to V2 — password through `passwordRequired` with the held password, email OTP, unknown user and wrong password share a message, wrong code, browser required, an unexpected state.
- [ ] `test/signUp.test.js`: update to V2 — email first, then password and display name, then `signIn()`; no password at start; existing account (each start state) with no further call; password policy error; wrong code.
- [ ] `test/resetPassword.test.js`: update to V2 — code, new password, `signIn()`; unknown user; wrong code; MFA after reset → generic error.

## 5. Checks run when you approve

Run twice: before any change, and after. A failure the migration causes is
fixed up to `max-fix-attempts` times; each command may run up to
`command-timeout-minutes` (edit `validation-settings` in the front matter to
change these).

| Check | Command |
| --- | --- |
| Proxy syntax check | `node --check cors.js` |
| Unit tests | `npm test` |

Tests that need a real tenant are never run or changed (none found); the
report ends with a manual test script.

## 6. Risks and actions for you

- [ ] Restart the dev proxy after the `cors.js` change.
- [ ] Update any production proxy or gateway with `PUT` and the V2 paths, and make it forward to `https://contoso.ciamlogin.com/00000000-0000-0000-0000-000000000001` (the tenant ID, not `contoso.onmicrosoft.com`).
- After this phase no flow uses V1.

## Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | {{TODAY}} | Migration requested → scope sign-in, sign-up, sspr. V2-native option for sign-up (ask for the password after the code) offered; customer keeps the one-screen form | "Migrate this app to native authentication V2." | 1 |
| 2 | {{TODAY}} | Tenant ID: the dev proxy forwarded to the tenant domain; the customer gave the tenant ID for its target | "The tenant ID is 00000000-0000-0000-0000-000000000001." | 1 |
