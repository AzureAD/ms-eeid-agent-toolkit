# Evals: eeid-native-auth-migrate-v2

Cases and fixtures for
`.github/plugins/eeid-toolkit/skills/eeid-native-auth-migrate-v2`. How evals
work, how to run them on each supported agent, and how to write graders:
[../README.md](../README.md). Use `eeid-native-auth-migrate-v2` as `<skill>`
in its commands. Each case is tagged with its type (`triggering` or
`behavior`). Case names start with the integration approach they test, so a
name pattern selects one approach:

| Prefix | Approach | Fixture |
| --- | --- | --- |
| `api-` | Raw native auth API (app calls the endpoints itself) | `spa-js-v1` |
| `sdk-js-` | MSAL JS native auth SDK (`@azure/msal-browser`) | `spa-js-sdk-v1` |
| `ios-swift-sdk-v1` | Source files of a UIKit app on the MSAL for iOS native auth V1 methods (`MSALNativeAuthPublicClientApplication`, CocoaPods `MSAL` 2.16.1): one-screen sign-in (email and password) with email code, one-screen sign-up with automatic sign-in, SSPR with automatic sign-in, an `AuthMessages` test file. No Xcode project; never built, so evals need no Xcode. |
| `sdk-ios-` | MSAL native auth SDK for iOS and macOS | `ios-swift-sdk-v1` (source only, never built) |
| `no-trigger-` | Shared should-not-trigger cases (no approach) | none |

| Select | `--case` |
| --- | --- |
| All raw API cases | `'api-*'` |
| All JS SDK cases | `'sdk-js-*'` |
| All iOS SDK cases | `'sdk-ios-*'` |
| Should-trigger cases of one approach | `'api-trigger-*'`, `'sdk-js-trigger-*'`, `'sdk-ios-trigger-*'` |
| Every should-not-trigger case | `'*no-trigger-*'` |
| Plan cases | `'api-plan-*'`, `'sdk-js-plan-*'`, `'sdk-ios-plan-*'`, or `'*-plan-*'` for all |
| Full-migration cases (long) | `'api-migrate-*'`, `'sdk-js-migrate-*'`, or `'*-migrate-*'` for both (no iOS full-migration case yet) |

## Triggering (`triggering/`)

Short runs (12 turns, read-only tools) that only check whether the skill
loads. Should-trigger cases seed their approach's fixture; should-not-trigger
cases run in an empty workspace.

| Case | Expect | Prompt idea |
| --- | --- | --- |
| `api-trigger-upgrade-native-auth` | Fires | "Upgrade our native auth to the new API version." |
| `api-trigger-v1-endpoints-named` | Fires | Names `/oauth2/v2.0/initiate` and `/signup/v1.0/start` |
| `api-trigger-assess-effort` | Fires | "How much work would it be…? Don't change anything yet." |
| `api-trigger-forgot-password-v2` | Fires | One flow in the user's words |
| `api-trigger-authorize-challenge` | Fires | Names `authorize-challenge` and HAL |
| `sdk-js-trigger-v2-methods` | Fires | `CustomAuthPublicClientApplication` V1 methods → `signInV2` and so on |
| `sdk-js-trigger-sign-in-only` | Fires | MSAL.js custom auth SDK, sign-in only |
| `sdk-js-no-trigger-version-bump` | Doesn't fire | `@azure/msal-browser` version bump with no V2 migration |
| `sdk-js-no-trigger-already-v2` | Doesn't fire | App already on `signInV2`; a UI feature request |
| `sdk-ios-trigger-v2-methods` | Fires | `MSALNativeAuthPublicClientApplication` V1 methods → `signInV2` and so on |
| `sdk-ios-trigger-sign-in-only` | Fires | iOS app on MSAL native auth, sign-in only |
| `sdk-ios-no-trigger-version-bump` | Doesn't fire | iOS MSAL upgrade with no V2 migration |
| `sdk-ios-no-trigger-already-v2` | Doesn't fire | iOS app already on `signInV2`; a UI feature request |
| `no-trigger-msal-redirect` | Doesn't fire | MSAL.js `loginRedirect` button |
| `no-trigger-b2c-migration` | Doesn't fire | Azure AD B2C to External ID |
| `no-trigger-new-native-auth-app` | Doesn't fire | Native auth in a new app (nothing to migrate) |
| `no-trigger-android-sdk-migration` | Doesn't fire | Android native auth SDK migration (not covered) |
| `no-trigger-change-password` | Doesn't fire | Change password for a signed-in user (not SSPR) |
| `no-trigger-client-credentials` | Doesn't fire | An unrelated `/oauth2/v2.0/token` change |

## Behavior (`behavior/`)

Two kinds of case per approach: plan cases (`*-plan-*`) and full-migration
cases (`*-migrate-*`). `--tag behavior` runs all of them; to leave the long
full-migration runs out, use `--case '*-plan-*'`.

### Plan cases

Plan-only runs that stop at the approval gate. Shared checks in every case:
the skill fires; `plan.md` is created as a draft with the approach and a
skill version; the plan follows the skill's plan template (every front
matter field; every section, matched by its number and the first word of its
title; no placeholder text left); the plan's scope table marks each flow
Migrate or Defer as requested; no file under `src/`, `test/`, `cors.js`, or
`package.json` is edited or written; the final message stops for approval
(judge).

| Case | Request | Extra checks |
| --- | --- | --- |
| `api-plan-sign-in-sspr` | Sign-in and SSPR; keep sign-up on V1 | `approach: api`; `scope` has both; `sign-up` deferred and not in scope; error map lists `user_not_found`, `invalid_oob_value` |
| `api-plan-sign-in-only` | Only sign-in | `scope` has sign-in only; `sspr` and `sign-up` deferred; error map lists `user_not_found`, `invalid_oob_value` |
| `api-plan-sspr-only` | Only forgot password | `scope` has `sspr` only; `sign-in` and `sign-up` deferred; same error codes |
| `api-plan-sign-up-only` | Only sign-up | `scope` has `sign-up` only; others deferred; error map lists `user_already_exists`, `invalid_oob_value`; the plan notes email-first sign-up |
| `api-plan-all-flows` | "Migrate this app", no flows named | All three flows in `scope`; `deferred: {}`; error map lists all three codes |
| `sdk-js-plan-sign-in-only` | Only sign-in | `approach: sdk`; `scope` has sign-in only; error map lists `isUserNotFound`, `isInvalidCode`; the plan moves the SDK to at least `5.29.0` and says the V2 methods are experimental |
| `sdk-js-plan-sign-up-only` | Only sign-up | `approach: sdk`; `scope` has `sign-up` only; error map lists `isUserAlreadyExists`, `isInvalidCode`; email-first sign-up; at least `5.29.0`; experimental |
| `sdk-js-plan-all-flows` | "Migrate this app", no flows named | `approach: sdk`; all three flows; error map lists all three checks; at least `5.29.0`; experimental |
| `sdk-ios-plan-sign-in-only` | Only sign-in | `approach: sdk`; `scope` has sign-in only; error map lists `isUserNotFound`, `isInvalidCode`; experimental; says no MSAL release has V2 yet and lists that under "Decisions needed" |
| `sdk-ios-plan-all-flows` | "Migrate this app", no flows named | `approach: sdk`; all three flows; error map lists `isUserNotFound`, `isInvalidCode`, `isUserAlreadyExists`; experimental; the release decision as above |

`api-plan-approve-with-open-decision` checks the approval gate. It seeds the
app and a draft sign-in + SSPR plan with one open item under "Decisions
needed" (`fixtures/plans/spa-js-v1-sign-in-sspr-open-decision.md`), and the
prompt approves it anyway. Checks: the plan stays `status: draft` with
`approved: null`, the decision is still open, every app file is exactly the
original and no file is added (generated `gen-file-` checks), and the final
message asks for the decision (judge).

### Full-migration cases

Each case seeds its approach's fixture and a complete plan (from
`fixtures/plans/`) that the customer is about to approve; the prompt approves
it. The agent then applies the plan, runs the security review and
validation, and writes the report. These runs are long (one run each).

| Case | Plan |
| --- | --- |
| `api-migrate-sign-in-sspr` | Sign-in and SSPR to V2; sign-up stays on V1 |
| `api-migrate-all-flows` | All flows to V2, including the V1 cleanup |
| `sdk-js-migrate-sign-in-sspr` | Sign-in and SSPR to the V2 SDK methods; sign-up stays on the V1 methods |
| `sdk-js-migrate-all-flows` | All flows to the V2 SDK methods; `challengeTypes` removed |

The score is the weighted share of passed checks, grouped by name prefix:

| Prefix | Checks |
| --- | --- |
| `process-` | The plan was approved at revision 1, ends `reported`, keeps its scope, has every implementation step ticked, and records a validation baseline |
| `gen-file-` | Every fixture file is either exactly the original (files the plan doesn't change) or changed (files it does), compared by content, whatever tool the agent used; the plan's new files exist and no other new file appears outside `test/` and the migration folder (SDK cases also allow `package-lock.json`) |
| `v1-`, `v2-` | API: no V1 calls left in migrated flows' files; V1 kept where a flow stays on V1; migrated flows use the V2 client; the config has `authorize-challenge`; the proxy allows `PUT` and `client-request-id`. SDK: migrated flows call the V2 methods and not the V1 start calls; no password passed to `signInV2` or `signUpV2`; the held sign-in password goes to `submitPassword`; existing-account states handled; `signIn()` after sign-up and reset as V1 did; `@azure/msal-browser` at or above `5.29.0`; `isBrowserRequired` handled; the proxy allows `PUT` |
| `tests-` | The tests ran at least twice (baseline and after); no test is skipped, focused, or left as todo |
| `security-` | The report has the security review's audit line; migrated files don't log, store, or serialize flow state |
| `report-`, `gen-report-` | `report.md` follows the report template (every section, matched by number and first word; no placeholder text left), has an outcome, every validation row, unit tests passed, and "not committed" |
| `critical-` | No `git commit` or `git push` |

The eval checks what the skill made the agent do. Whether the migrated code
works is the app's own tests' job; the report's unit test row and the
`tests-` checks show that they ran and passed.

## Generated graders

Graders named `gen-*.md` are written by `scripts/generate-graders.mjs` from
the skill's plan and report templates, the fixtures, and the case lists at
the top of the script. Don't edit them; after changing a template, a
fixture, or a case's planned files, run:

```bash
node tests/evals/eeid-native-auth-migrate-v2/scripts/generate-graders.mjs
```

`npm test` fails while they're out of date.

## Fixtures

| Fixture | What it is |
| --- | --- |
| `spa-js-v1` | Plain-JavaScript SPA calling the V1 raw API through a local dev proxy (`cors.js`). Password and email OTP sign-in, one-screen sign-up with automatic sign-in, SSPR with polling and automatic sign-in. No dependencies; `npm test` runs `node --test` (12 tests). |
| `spa-js-sdk-v1` | Plain-JavaScript SPA on the MSAL JS native auth SDK V1 methods (`@azure/msal-browser` `^5.20.0`, `CustomAuthPublicClientApplication`) through a local dev proxy. One-screen sign-in (email and password) with email OTP, one-screen sign-up with automatic sign-in, SSPR with automatic sign-in. Only `src/auth/msalApp.js` imports the SDK; the flows take the app instance as a parameter, and the tests use a fake SDK (`test/fakeSdk.js`), so `npm test` needs no install (13 tests). Plain JavaScript keeps the fixture framework-neutral, like the SDK. |

`scripts/seed-fixture.sh <fixture>` copies a fixture into the workspace and
commits it; each case's `scaffold.sh` calls it. `scripts/seed-plan.mjs <plan>`
writes a plan from `fixtures/plans/` into the workspace, filling in the
installed skill version, today's date, the baseline commit, and file hashes.

The iOS plan cases expect the plan to say that no MSAL for iOS release has
the V2 methods yet (2.17.1 is the latest), or that the check couldn't run and
availability is unverified. When the V2 release ships, update
`references/sdk/ios/approach.md` with its version and change
`plan-sdk-not-released` and `plan-decision-for-sdk-release` in those cases to
check for the version instead.
