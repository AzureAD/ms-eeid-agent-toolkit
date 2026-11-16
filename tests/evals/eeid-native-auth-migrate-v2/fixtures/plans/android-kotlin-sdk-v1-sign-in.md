---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "{{SKILL_VERSION}}"   # a different installed version restarts the migration
app-root: .
approach: sdk            # api | sdk
phase: 1
status: draft            # draft | approved | applying | applied | reviewed | validated | reported
revision: 1
scope: [sign-in]
deferred: { sign-up: "customer asked to keep it on V1 for now", sspr: "customer asked to keep it on V1 for now" }
approved: null           # { revision: N, date: YYYY-MM-DD, how: "confirmed in chat" }
baseline:
  commit: {{COMMIT}}
  files:
    app/build.gradle: {{HASH}}
    app/src/main/java/com/contoso/auth/Configuration.kt: {{HASH}}
    app/src/main/res/raw/auth_config_native_auth.json: {{HASH}}
    app/src/main/java/com/contoso/auth/NativeAuthClient.kt: {{HASH}}
    app/src/main/java/com/contoso/auth/AuthMessages.kt: {{HASH}}
    app/src/main/java/com/contoso/auth/AuthOutcome.kt: {{HASH}}
    app/src/main/java/com/contoso/auth/SignInRepository.kt: {{HASH}}
    app/src/main/java/com/contoso/auth/ui/AuthViewModel.kt: {{HASH}}
dirty-files: []          # files inside app-root with uncommitted changes when planned; the migration never edits them (excluded from check A1)
validation-settings:     # you may edit these before approving
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
validation-baseline: null  # set in the pre-apply check: { <check ID>: passed | "failed: <summary>" | "not-run: <reason>" } or skipped
---

# Native Auth V2 migration plan — Contoso sign-in Android app (SDK), phase 1

> Review this plan. Reply **"approved"** to apply it, or tell the assistant
> what to change. Code is not changed until you approve this revision, and
> the plan can't be approved while "Decisions needed" has open items. The
> assistant's notes for applying it are in `working-notes.md`; you don't need
> to review them.

## At a glance

| Item | Value |
| --- | --- |
| Migrate now | sign-in |
| Stay on V1 | sign-up, sspr — customer asked to keep them on V1 for now |
| Users will notice | nothing |
| Files | 3 changed, 0 new |
| Commands run on approval | none: this repo has no Gradle wrapper, so build and tests are recorded as not run |
| Decisions needed | none |

## Decisions needed

None.

## Previous phases

None.

## 1. What we found

Check that this matches your app.

| Item | Found |
| --- | --- |
| App | Android, Kotlin |
| Native auth today | MSAL native auth SDK V1 for Android (`INativeAuthPublicClientApplication`); MSAL 8.5.0 (`app/build.gradle`, pinned) → 8.7.0, the V2 release |
| Flows | sign-in (one screen: email and password; email code), sign-up (one screen: email, password, display name; email code), sspr (email code) |
| Config | `app/src/main/res/raw/auth_config_native_auth.json` (`challenge_types: ["oob", "password"]`) |

## 2. Scope

| Flow | Decision | Reason |
| --- | --- | --- |
| sign-in | Migrate | requested |
| sign-up | Defer | customer asked to keep it on V1 for now |
| sspr | Defer | customer asked to keep it on V1 for now |

## 3. What users will notice

None.

## 4. Files that will change

Ticked as they're applied. A deviation is noted under its item.

### Shared
- [ ] `app/build.gradle`: `com.microsoft.identity.client:msal:8.7.0`, keeping the pinned style and the project's repositories; resolve it with the project's Gradle tooling.
- [ ] `app/src/main/res/raw/auth_config_native_auth.json`: `authority_url` → `https://contoso.ciamlogin.com/00000000-0000-0000-0000-000000000001/`, the tenant ID instead of the tenant domain.

### sign-in
- [ ] `app/src/main/java/com/contoso/auth/SignInRepository.kt`: `start(email, password)` calls `signInV2(NativeAuthSignInParametersV2(username = email))` with `Configuration.scopes`, holding the password in memory. `PasswordRequired` submits the held password and clears it. `CodeRequired` clears the held password, keeps the state, and reports `CodeRequired`. `AuthMethodSelectionRequired` straight after the start → select the first usable method (password before an email code) without asking. `MFARequired` reaches `else` → `UNKNOWN`. A wrong code keeps the state. Keep `submitCode` and `cancel`; `else` branches go to `UNKNOWN`.

sign-up and sspr stay on V1: their repositories don't change.

## 5. Checks run when you approve

Run twice: before any change, and after. A failure the migration causes is
fixed up to `max-fix-attempts` times; each command may run up to
`command-timeout-minutes` (edit `validation-settings` in the front matter to
change these).

| Check | Command |
| --- | --- |
| Build | Not run — no Gradle wrapper in this repo |
| Unit tests | Not run — no Gradle wrapper in this repo |

Tests that need a real tenant are never run or changed (none found); the
report ends with a manual test script.

## 6. Risks and actions for you

- [ ] Build the app and run `./gradlew testDebugUnitTest` in the full project.

## Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | {{TODAY}} | Migration requested → scope sign-in; sign-up and sspr deferred. The project's Maven repository lists MSAL 8.7.0 with the V2 names | "Move sign-in to native auth V2; leave sign-up and password reset for now." | 1 |
| 2 | {{TODAY}} | Tenant ID: `authority_url` used the tenant domain; the customer gave the tenant ID | "The tenant ID is 00000000-0000-0000-0000-000000000001." | 1 |
