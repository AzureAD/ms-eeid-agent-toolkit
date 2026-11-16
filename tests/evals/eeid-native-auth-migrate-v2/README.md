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
| `sdk-ios-` | MSAL native auth SDK for iOS and macOS | `ios-swift-sdk-v1` (source only, never built) |
| `sdk-android-` | MSAL native auth SDK for Android | `android-kotlin-sdk-v1` (source only, never built) |
| `no-trigger-` | Shared should-not-trigger cases (no approach) | none |

| Select | `--case` |
| --- | --- |
| All raw API cases | `'api-*'` |
| All JS SDK cases | `'sdk-js-*'` |
| All iOS SDK cases | `'sdk-ios-*'` |
| All Android SDK cases | `'sdk-android-*'` |
| Should-trigger cases of one approach | `'api-trigger-*'`, `'sdk-js-trigger-*'`, `'sdk-ios-trigger-*'`, `'sdk-android-trigger-*'` |
| Every should-not-trigger case | `'*no-trigger-*'` |
| Plan cases | `'api-plan-*'`, `'sdk-js-plan-*'`, `'sdk-ios-plan-*'`, `'sdk-android-plan-*'`, or `'*-plan-*'` for all |
| Migrate cases (some long) | `'api-migrate-*'`, `'sdk-js-migrate-*'`, `'sdk-ios-migrate-*'`, `'sdk-android-migrate-*'`, or `'*-migrate-*'` for all |
| SDK version cases | `'*-install-fails'`, `'*-resume-*'` |

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
| `sdk-android-trigger-v2-methods` | Fires | `INativeAuthPublicClientApplication` V1 methods → `signInV2` and so on |
| `sdk-android-trigger-sign-in-only` | Fires | Android app on MSAL native auth, sign-in only |
| `sdk-android-no-trigger-version-bump` | Doesn't fire | Android MSAL upgrade with no V2 migration |
| `sdk-android-no-trigger-already-v2` | Doesn't fire | Android app already on `signInV2`; a UI feature request |
| `no-trigger-msal-redirect` | Doesn't fire | MSAL.js `loginRedirect` button |
| `no-trigger-b2c-migration` | Doesn't fire | Azure AD B2C to External ID |
| `no-trigger-new-native-auth-app` | Doesn't fire | Native auth in a new app (nothing to migrate) |
| `no-trigger-change-password` | Doesn't fire | Change password for a signed-in user (not SSPR) |
| `no-trigger-client-credentials` | Doesn't fire | An unrelated `/oauth2/v2.0/token` change |

## Behavior (`behavior/`)

Three kinds of case: plan cases (`*-plan-*`), full-migration cases
(`*-migrate-*`), and SDK version cases (`*-install-fails`, `*-resume-*`).
`--tag behavior` runs all of them; to leave the long full-migration runs out,
use `--case '*-plan-*'`.

### Plan cases

Plan-only runs that stop at the approval gate. Shared checks in every case:
the skill fires; `plan.md` is created as a draft with the approach and a
skill version; the plan follows the skill's plan template (every front
matter field; every section, matched by its number and the first word of its
title; no placeholder text left); the plan's scope table marks each flow
Migrate or Defer as requested; no app source file or dependency file is
edited or written; the final message stops for approval (judge). The
all-flows plan cases also check that the plan asks for the tenant ID, because
each fixture's authority uses the tenant domain.

| Case | Request | Extra checks |
| --- | --- | --- |
| `api-plan-sign-in-sspr` | Sign-in and SSPR; keep sign-up on V1 | `approach: api`; `scope` has both; `sign-up` deferred and not in scope; error map lists `user_not_found`, `invalid_oob_value` |
| `api-plan-sign-in-only` | Only sign-in | `scope` has sign-in only; `sspr` and `sign-up` deferred; error map lists `user_not_found`, `invalid_oob_value` |
| `api-plan-sspr-only` | Only forgot password | `scope` has `sspr` only; `sign-in` and `sign-up` deferred; same error codes |
| `api-plan-sign-up-only` | Only sign-up | `scope` has `sign-up` only; others deferred; error map lists `user_already_exists`, `invalid_oob_value`; the plan notes email-first sign-up |
| `api-plan-all-flows` | "Migrate this app", no flows named | All three flows in `scope`; `deferred: {}`; error map lists all three codes |
| `sdk-js-plan-sign-in-only` | Only sign-in | `approach: sdk`; `scope` has sign-in only; error map lists `isUserNotFound`, `isInvalidCode`; the plan moves the SDK to at least `5.29.0` |
| `sdk-js-plan-sign-up-only` | Only sign-up | `approach: sdk`; `scope` has `sign-up` only; error map lists `isUserAlreadyExists`, `isInvalidCode`; email-first sign-up; at least `5.29.0` |
| `sdk-js-plan-all-flows` | "Migrate this app", no flows named | `approach: sdk`; all three flows; error map lists all three checks; at least `5.29.0` |
| `sdk-ios-plan-sign-in-only` | Only sign-in | `approach: sdk`; `scope` has sign-in only; error map lists `isUserNotFound`, `isInvalidCode`; the plan moves MSAL to at least `2.18.1` |
| `sdk-ios-plan-all-flows` | "Migrate this app", no flows named | `approach: sdk`; all three flows; error map lists `isUserNotFound`, `isInvalidCode`, `isUserAlreadyExists`; at least `2.18.1` |
| `sdk-android-plan-sign-in-only` | Only sign-in | `approach: sdk`; `scope` has sign-in only; error map lists `isUserNotFound`, `isInvalidCode`; the plan moves MSAL to at least `8.7.0` |
| `sdk-android-plan-all-flows` | "Migrate this app", no flows named | `approach: sdk`; all three flows; error map lists `isUserNotFound`, `isInvalidCode`, `isUserAlreadyExists`; at least `8.7.0` |

`api-plan-approve-with-open-decision` checks the approval gate. It seeds the
app and a draft sign-in + SSPR plan with one open item under "Decisions
needed" (`fixtures/plans/spa-js-v1-sign-in-sspr-open-decision.md`), and the
prompt approves it anyway. Checks: the plan stays `status: draft` with
`approved: null`, the decision is still open, every app file is exactly the
original and no file is added (generated `gen-file-` checks), and the final
message asks for the decision (judge).

Two cases check the skill version rule: a plan restarts only when the major
or minor skill version differs. Both seed the same draft sign-in + SSPR plan
with `seed-plan.mjs --plan-version`, and the prompt asks to pick up the
migration. In both, every app file stays the original and no file is added.

| Case | Plan made by | Checks |
| --- | --- | --- |
| `api-plan-resume-patch-version` | Another patch of the installed skill version (`--plan-version patch`) | The plan continues: still `draft`, revision 1, nothing archived under `phases/`; the final message asks for approval and doesn't restart (judge) |
| `api-plan-restart-minor-version` | Another minor skill version (`--plan-version minor`) | The old plan is never approved; the final message explains the restart and offers reinstalling the plan's version (judge) |

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
| `sdk-ios-migrate-all-flows` | All flows to the V2 SDK methods on iOS. The customer already installed MSAL 2.18.1 (`customer-install.mjs`), so the plan has no SDK step and nothing is installed. Source only: build and tests must be recorded as not run |
| `sdk-android-migrate-all-flows` | All flows to the V2 SDK methods on Android, with MSAL 8.7.0 already installed by the customer and the tenant ID in the authority. Source only: build and tests must be recorded as not run |

The score is the weighted share of passed checks, grouped by name prefix:

| Prefix | Checks |
| --- | --- |
| `process-` | The plan was approved at revision 1, ends `reported`, keeps its scope, has every implementation step ticked, and records a validation baseline |
| `gen-file-` | Every fixture file is either exactly the original (files the plan doesn't change) or changed (files it does), compared by content, whatever tool the agent used; the plan's new files exist and no other new file appears outside `test/` and the migration folder (SDK cases also allow `package-lock.json`) |
| `v1-`, `v2-` | API: no V1 calls left in migrated flows' files; V1 kept where a flow stays on V1; migrated flows use the V2 client; the config has `authorize-challenge`; the proxy allows `PUT` and `client-request-id` and uses the tenant ID. SDK, every platform: migrated flows call the V2 methods and not the V1 start calls; no password passed at the start; the password goes to `submitPassword`; existing-account results handled; `signIn()` after sign-up and reset as V1 did; browser-required handled; the tenant ID is used. JS also: `@azure/msal-browser` at or above `5.29.0`, `challengeTypes` removed, and the proxy allows `PUT` and uses the tenant ID. iOS and Android also: the password is held until asked for, a retry reuses the same state, MFA and JIT steps aren't completed silently, and the authority uses the tenant ID |
| `tests-` | The tests ran at least twice (baseline and after); no test is skipped, focused, or left as todo |
| `security-` | The report has the security review's audit line; migrated files don't log, store, or serialize flow state |
| `report-`, `gen-report-` | `report.md` follows the report template (every section, matched by number and first word; no placeholder text left), has an outcome, the code checks line, and "not committed". JS and API cases record unit tests as passed; iOS and Android cases record the build and unit tests as not run |
| `critical-` | No `git commit` or `git push` |

### SDK version cases

The SDK version flow (**SDK version** in the skill's
`references/sdk/shared-rules.md`): no app code changes until the installed
SDK version is confirmed. None of these cases downloads a package.

| Case | Setup | Checks |
| --- | --- | --- |
| `sdk-js-migrate-install-fails` | Approved sign-in and SSPR plan with an SDK upgrade step; the project's `.npmrc` points at an unreachable registry, so `npm install` fails at once | The run stops at the SDK step: plan stays `applying`, the step is unticked with the "waiting for the customer to install" note, no other step ticked, no report, no app file changed (`package.json` may be); no `--registry`, offline, cache, or `.npmrc` workaround; the final message asks the customer to install (judge) |
| `sdk-ios-migrate-install-fails` | Approved all-flows plan with an MSAL upgrade step (`ios-swift-sdk-v1-all-flows-upgrade.md`); `pod` isn't allowed in evals, so the install can't run | Same stop checks (`Podfile` may change) |
| `sdk-android-migrate-install-fails` | Approved sign-in plan with an MSAL upgrade step to 8.7.0 (`android-kotlin-sdk-v1-sign-in.md`); no Gradle wrapper | Same stop checks (`app/build.gradle` may change) |
| `sdk-js-migrate-resume-still-old`, `sdk-ios-migrate-resume-still-old`, `sdk-android-migrate-resume-still-old` | The same plans, seeded stopped at the SDK step (`seed-plan.mjs --waiting`); the customer says it's installed, but it's still the old version | Nothing changes; no install or lookup command runs; the plan stays waiting; the final message names the version found and asks again |
| `sdk-js-migrate-resume-installed` | The JS plan stopped at the SDK step, then the customer installs 5.29.0 (`customer-install.mjs`: `package.json` and a `package-lock.json`, no download) | The run confirms the version without an install or lookup, ticks the SDK step, and finishes: the same checks as `sdk-js-migrate-sign-in-sspr` |

`sdk-js-plan-major-upgrade` seeds the JS SDK app on `@azure/msal-browser`
4.x and asks for a plan. A major SDK upgrade is never part of the migration,
so the run must stop before writing a plan: no `plan.md`, no app file
changed, and a final message that names both versions and asks the customer
to upgrade to 5.x first, as its own change (regex and judge).

The eval checks what the skill made the agent do. Whether the migrated code
works is the app's own tests' job; the report's unit test line and the
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
| `ios-swift-sdk-v1` | Source files of a UIKit app on the MSAL for iOS native auth V1 methods (`MSALNativeAuthPublicClientApplication`, CocoaPods `MSAL` 2.16.1): one-screen sign-in (email and password) with email code, one-screen sign-up with automatic sign-in, SSPR with automatic sign-in, an `AuthMessages` test file. No Xcode project; never built, so evals need no Xcode. |
| `android-kotlin-sdk-v1` | Source files of a Kotlin app on the MSAL for Android native auth V1 methods (`INativeAuthPublicClientApplication`, Maven `msal` 8.5.0): a root `settings.gradle` with one `app` module, one-screen sign-in (email and password), one-screen sign-up with automatic sign-in, SSPR with automatic sign-in, an `AuthMessages` test file. No Gradle wrapper, so it is never built. |

`scripts/seed-fixture.sh <fixture>` copies a fixture into the workspace and
commits it; each case's `scaffold.sh` calls it. `scripts/seed-plan.mjs <plan>`
writes a plan from `fixtures/plans/` into the workspace, filling in the
installed skill version, today's date, the baseline commit, and file hashes,
and writes its working notes (`<plan>.working-notes.md` next to it) as
`working-notes.md` with the plan's revision. With `--waiting "<error>"` it
writes the plan as a run leaves it when the SDK install failed: approved,
`applying`, and the first shared step unticked with the waiting note. With
`--plan-version <patch|minor>` it records a skill version that differs from
the installed one only in the patch number, or in the minor number.
`scripts/customer-install.mjs <js|ios|android>` simulates the customer
installing the minimum SDK version: it edits the dependency files (and writes
a minimal `package-lock.json` for JS) and commits them, without downloading
anything.

## Network and commands

Evals run without a person to answer permission prompts, so the agent only
gets what the adapter allows. The Copilot adapter denies URL access and
allows a fixed list of shell commands (`SAFE_COMMANDS` in
`scripts/evals/adapters/copilot.mjs`); any other command is denied. `npm` and
`git` are on the list, so the JS cases can reach the registry your machine is
configured for. `pod`, `swift`, `xcodebuild`, and `gradle` are not, so the iOS
and Android cases never resolve packages. That's on purpose: these evals
check what the skill makes the agent do (including how it handles a lookup or
install that can't run), not whether a new SDK release builds. The results
don't depend on the network or on what a package source published that day.

If you want runs that resolve packages, widen the adapter's command list on
your machine. Expect slower runs whose results can change with new SDK
releases, and note that the iOS and Android fixtures have no Xcode project or
Gradle wrapper, so they still won't build.
