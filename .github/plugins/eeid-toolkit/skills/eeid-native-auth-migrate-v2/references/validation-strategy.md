# Validation strategy

Shared validation rules for every approach. Approach-specific checks and
required tests are in the approach's validation reference (raw API:
[api/validation-api.md](api/validation-api.md)).

Use this file in four places: planning (pick commands and tests), the
pre-apply check (record a baseline), applying (add tests), and the
validation step (run every check and record the results). The strategy is
the same on every platform. Only the way you find build and test commands
differs, and the table in group B/C gives examples.

## Rules

1. **Report only what you ran.** Every result is `Passed`, `Failed`, or
   `Not run` with a reason. Never write an expected or assumed result.
   Record the exact command, its exit code, and a one-line summary of the
   output (counts, first error). Never paste secrets or tokens from the output.
2. **Run only what the plan lists.** The plan's validation section names the
   commands, so approving the plan approves running them. Don't add commands
   that install, download, or deploy anything (`npm install`, `pod install`,
   `gradle --refresh-dependencies`, publish, deploy) unless the plan lists
   them. If a check can't run because dependencies are missing, mark it
   `Not run` and tell the customer which command would fix it.
3. **Never create build or test commands.** Use only the commands the
   project already defines. Don't add or change scripts, Gradle tasks,
   Xcode schemes, or CI config. The one exception: the customer chose in
   the plan to introduce a test framework (see "Adding tests").
4. **Never make a check pass by weakening it.** Don't delete, skip, or loosen
   tests, add `@ts-ignore`/`eslint-disable`/`@Suppress`/`// swiftlint:disable`,
   change compiler or lint settings, or upgrade dependencies to get a pass.
5. **Never call a real tenant.** Validation is offline. Don't run, add, or
   change tests that need a real tenant (end-to-end, UI, device, or emulator
   tests). List the existing ones in the report instead.
6. **Compare with the baseline.** A failure that also failed at baseline is
   pre-existing: report it, don't fix it. A new failure is caused by the
   migration: fix it.

## Settings

Read these from the plan's front matter, never from memory. The customer may
have edited them before approving.

```yaml
validation-settings:
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
```

Run long commands in the background if your client supports it; a client's
own foreground limit is often shorter than the plan's timeout. A command
still running at the timeout → stop it and mark `Not run (timed out after N
minutes)`.

## Fix loop

For a failure caused by the migration (a new failure, in code you changed,
code that calls it, or a test you added):

1. Fix it within the approved scope, then re-run that check. One fix and
   one re-run is one attempt.
2. At most `max-fix-attempts` attempts **per failure**: each failing test,
   build or type error, or lint error counts separately, so several
   failing tests in one command each get their own attempts.
3. Still failing at the limit → stop fixing it, mark the check `Failed`,
   explain the cause and what you tried, and carry on with the rest of
   validation and the report. **Don't raise `max-fix-attempts` or make a
   plan revision to get more attempts.** After the report, the customer can
   ask you to continue fixing (**Continue fixing** in
   [migration-lifecycle.md](migration-lifecycle.md)).
4. If the fix would need a file or flow outside the plan, don't make it.
   Mark `Failed` and propose the plan change in the report (**Changing the
   plan after apply started** in the lifecycle reference).
5. Record `Passed after N fixes` so the report shows what happened.

## Adding tests

Don't assume existing tests cover the V1 scenarios. During planning, compare
the project's tests with the approach's required test list and plan the
missing ones.

**Allowed test types:** unit and component tests that mock the service
boundary (the HTTP layer for raw API), using response shapes from the
approach's V2 references. **Never add** end-to-end, UI, device, or emulator
tests, or anything that needs a real tenant. Use made-up
values only: no real tenant IDs, client IDs, accounts, or tokens.

| Project state | What to do |
| --- | --- |
| Test framework present (with or without existing tests) | Add the missing tests using that framework, its folder layout, and its naming and mocking conventions. List each new test file in the plan. |
| No test framework | Don't add tests. In the plan, list the tests you would add and ask the customer to decide: **introduce a test framework** (the framework, its dependencies, and the test command become plan items they approve) or **skip tests** (recorded in the plan and report). |

Treat a framework as present when the project already declares it (for
example `jest`/`vitest` in `package.json`, an XCTest target, JUnit or
Robolectric dependencies in Gradle).

### Required tests

Each approach defines its required tests (for raw API:
[api/validation-api.md](api/validation-api.md)). Add the ones the project
doesn't already cover.

## Check list

Run the groups in this order. Group A needs no tools beyond search and git.

### A. Scope and contract checks (always)

| ID | Check | How |
| --- | --- | --- |
| A1 | Only planned files changed | `git status --porcelain` and `git diff --name-only <baseline commit>`. Every changed or new file, including new tests, must appear in the plan. Excluded: files listed in the plan's `dirty-files`, and the `.native-auth-v2-migration/` folder itself. |
| A2 | Deferred flows unchanged | Files used only by deferred flows: no diff. Shared files: the diff contains only changes the plan lists, and V1 code paths the deferred flows call are still present and unchanged. |
| A3 | No V1 left in migrated flows | Search the migrated flows' files and call chains with [v1-detection-patterns.md](v1-detection-patterns.md), as the approach's validation reference describes. V1 usage reached from a migrated flow is a failure; V1 usage only deferred flows reach is expected. |
| A4 | No version mixing inside a flow | Trace each migrated flow from its UI entry point to token handling. Every call must go through the V2 client, including MFA. No V1 continuation token or V1 response object may reach V2 code, and no V2 state may reach V1 code. |
| A5 | V2 contract | For each migrated flow, confirm every item in the approach's contract checklist (raw API: [api/validation-api.md](api/validation-api.md)). |
| A6 | Config | V2 calls use the app's existing base URL (tenant domain or GUID form) in every environment. V1 constants remain while any flow stays on V1; if no V1 flow remains, they are removed. |
| A7 | Tests updated and added as planned | Tests that asserted V1 behavior for migrated flows were updated to V2, not deleted or skipped. Every test the plan lists was added. Tests of deferred flows and tenant-dependent tests are untouched. |

### B. Build and static analysis, C. Unit tests

**Rule:** use the build, type-check, lint, and unit test commands the
project already defines, on any platform. Prefer the project's own scripts
or tasks over raw tool calls. The table shows where to look on common
platforms; for anything else (Makefile, Bazel, Nx, Turborepo, a CI workflow),
use the commands it already defines.

| Platform | Where to look | B: build / type-check / lint | C: unit tests |
| --- | --- | --- | --- |
| JavaScript / TypeScript (browser apps, React Native, Electron, Node) | `package.json` scripts; package manager from lock file (`package-lock.json` → npm, `yarn.lock` → yarn, `pnpm-lock.yaml` → pnpm, `bun.lock*` → bun) | Scripts such as `typecheck`, `lint`, `build`; `npx tsc --noEmit` only if `tsconfig.json` and TypeScript are already present | `test` script in non-watch mode (`CI=true`; Vitest `vitest run`; Jest `--watchAll=false`) |
| Web dev proxy | `cors.js`, `proxy.config.js`, `vite.config.*` proxy | `node --check <proxy file>` | — |
| iOS / macOS | `*.xcworkspace` (use it if present) or `*.xcodeproj`; `Package.swift` | `xcodebuild -list` to find the existing scheme, then `xcodebuild build -scheme <S> -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO` (macOS: `-destination 'platform=macOS'`); `swift build` for a Swift package | The scheme's unit test target: `xcodebuild test -scheme <S> -destination 'platform=iOS Simulator,name=<available simulator>' -only-testing:<UnitTestTarget>` (`xcrun simctl list devices available`); `swift test` |
| Android | `gradlew`, `build.gradle(.kts)` | `./gradlew assembleDebug` (add `lintDebug` only if the project already runs lint) | `./gradlew testDebugUnitTest` |
| Flutter | `pubspec.yaml` | `flutter analyze` | `flutter test` |
| .NET (MAUI, ASP.NET) | `*.sln`, `*.csproj` | `dotnet build` | `dotnet test` on the existing unit test projects |

- Use the Gradle wrapper, never a global `gradle`.
- Exclude tenant-dependent tests from C (UI test targets, `connectedAndroidTest`, E2E suites). If the project's only test command also runs them, mark C `Not run` and explain; don't change the command.
- No build or test commands found → mark B/C `Not run (no build/test command found)` and recommend adding them in the report. Group A still runs.

### D. Tests that need a real tenant (never run by you)

1. **List existing tenant-dependent tests** for migrated flows (E2E, UI,
   device, emulator) by file in the report. They likely still drive V1
   behavior and need the customer's update.
2. **Write a manual test script** into the report for the customer to run
   against a **test tenant**. For each migrated
   flow, include steps and expected results for:

| Flow | Scenarios |
| --- | --- |
| `sign-in` | Password success; email OTP success; wrong password; wrong OTP then correct; OTP resend; MFA second factor; user without an MFA method (JIT registration, or web fallback if the app had none in V1); unknown username shows the V1 message |
| `sign-up` | Success with all fields on one screen (email code first, then the rest); extra attributes requested by the service; existing email behaves as it did in V1; password policy failure; wrong OTP; resend; signed in at the end only if V1 did that |
| `sspr` | Success, and signed in at the end only if V1 did that; unknown username shows the V1 message; wrong OTP; resend; weak new password |
| All | Web fallback shown when the service requires a browser; tokens and continuation tokens absent from the console, logs, and URLs; each deferred flow still works on V1 |

## Validation run (Step 8)

1. Run group A for every migrated flow.
2. Run the plan's group B and group C commands (including the new tests),
   in the background if your client supports it, within
   `command-timeout-minutes`. Compare failures with `validation-baseline`.
3. For each new failure caused by the migration, follow the **Fix loop**.
4. **Re-review fixes.** If this step changed code, review only the changed
   hunks against the security rules (Step 7). If that review changes code,
   re-run only the checks those changes affect. Repeat while a round changes
   code, at most `max-fix-attempts` rounds; anything still open is reported
   as a failed check or an unresolved introduced finding.
5. Group D: list the existing tenant-dependent tests for migrated flows and
   write the manual test script for each migrated flow.
6. Keep every result for the report (see **Recording results**).
7. Set `status: validated`, even if some checks failed. Failures are
   reported, not hidden.

## Baseline (pre-apply check)

Run the plan's B and C commands once before changing any code and record
each result in the plan's front matter under `validation-baseline`
(`passed`, `failed: <count or first error>`, or `not-run: <reason>`). If the
customer declines, write `validation-baseline: skipped`; then every
validation failure is reported as "cause not confirmed" instead of being
labeled pre-existing or new. Tests added by the migration have no baseline;
their failures are always caused by the migration.

## Recording results

Add each result to the report's validation table:

| ID | Check | Command | Result | Notes |
| --- | --- | --- | --- | --- |
| A3 | No V1 left in migrated flows | search | Passed | 0 hits in sign-in, sspr |
| B1 | Type-check | `npm run typecheck` (exit 0) | Passed after 1 fix | Missing `codeLength` type |
| C1 | Unit tests | `npm test -- --watchAll=false` (exit 1) | Failed | 1 failure, also failing at baseline (pre-existing); 12 new tests passed |
| D | Tenant-dependent tests | — | Not run | 2 existing E2E specs listed; manual script in section 5 |
