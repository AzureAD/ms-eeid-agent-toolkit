---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "{{SKILL_VERSION}}"   # a different installed major or minor version restarts the migration
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
dirty-files: []          # files inside app-root with uncommitted changes when planned; the migration never edits them (excluded from check A1)
validation-settings:     # you may edit these before approving
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
validation-baseline: null  # set in the pre-apply check: { <check ID>: passed | "failed: <summary>" | "not-run: <reason>" } or skipped
---

# Native Auth V2 migration plan — Contoso sign-in SPA, phase 1

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
| Users will notice | 4 changes — section 3 |
| Files | 10 changed, 2 new, 1 removed (including 4 test files changed and 1 added) |
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
| Native auth today | Raw native auth API V1 (no SDK) |
| Flows | sign-in (password, email OTP), sign-up (one screen: email, password, display name; email OTP; signs in after sign-up), sspr (email OTP; polling; signs in after reset) |
| Config | `src/config.js` (`BASE_URL`, `CLIENT_ID`, `ENDPOINTS`, `CHALLENGE_TYPES`); dev proxy `cors.js` |

## 2. Scope

| Flow | Decision | Reason |
| --- | --- | --- |
| sign-in | Migrate | requested |
| sign-up | Migrate | requested |
| sspr | Migrate | requested |

## 3. What users will notice

**1. MFA or registering a method opens browser sign-in** (sign-in)
- *Example:* a user whose account needs MFA, or who must register an MFA
  method, signs in.
- *Today:* sign-in fails with the app's error.
- *After:* the app opens browser sign-in, where they finish.

**2. A text-message-only password reset opens browser sign-in** (sspr)
- *Example:* a user whose only reset method is a text message resets their
  password.
- *Today:* the reset fails with the app's error.
- *After:* the app opens browser sign-in, where they finish.

**3. A sign-up field the form doesn't have opens browser sign-in** (sign-up)
- *Example:* the tenant requires a sign-up attribute the form has no field
  for.
- *Today:* sign-up fails with the app's error.
- *After:* the app opens browser sign-in, where they finish signing up.

**4. Browser sign-in starts over** (all flows)
- *Example:* the service needs the browser partway through a flow.
- *Today:* browser sign-in continues where the user left off.
- *After:* browser sign-in starts from the beginning; the user enters their
  email again.

## 4. Files that will change

Ticked as they're applied. A deviation is noted under its item.

### Shared
- [ ] `src/config.js`: add `V2_ENDPOINTS` (`authorizeChallenge: "/oauth2/v2.0/authorize-challenge"`, `token: "/oauth2/v2.0/token"`); remove every V1 endpoint and `CHALLENGE_TYPES` (cleanup).
- [ ] New `src/api/nativeAuthV2Client.js`: V2 client next to the V1 client — start and resume authorization, code exchange, `send` for links (JSON, `client-request-id`), link resolver, HAL response handler, V2 error and unhandled-response types.
- [ ] `src/auth/errors.js`: map the V2 errors in the error mapping (`working-notes.md`); an unhandled response maps to `browserRequired`; remove the V1 mappings (cleanup).
- [ ] Remove `src/api/nativeAuthClient.js` (cleanup: nothing uses the V1 client any more).
- [ ] `cors.js`: allow `PUT` and the `client-request-id` header, forward `client-request-id`, expose `x-ms-request-id`.
- [ ] `cors.js`: set `TARGET_PATH` to the tenant ID, `"/00000000-0000-0000-0000-000000000001"`, instead of the tenant domain (V2 steps reject the domain; V1 calls accept either).

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
- [ ] Update any production proxy or gateway with the V2 paths, `PUT`, and `client-request-id`, and make it forward to `https://contoso.ciamlogin.com/00000000-0000-0000-0000-000000000001` (the tenant ID, not `contoso.onmicrosoft.com`).
- After this phase no flow uses V1.

## Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | {{TODAY}} | Migration requested → scope sign-in, sign-up, sspr. V2-native option for sign-up (ask for the password after the code) offered; customer keeps the one-screen form | "Migrate this app to native authentication API V2." | 1 |
| 2 | {{TODAY}} | Tenant ID: the dev proxy forwarded to the tenant domain; the customer gave the tenant ID for its target | "The tenant ID is 00000000-0000-0000-0000-000000000001." | 1 |
