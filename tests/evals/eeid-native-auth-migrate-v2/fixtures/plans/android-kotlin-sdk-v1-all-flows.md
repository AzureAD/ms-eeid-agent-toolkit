---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "{{SKILL_VERSION}}"   # a different installed version restarts the migration
app-root: .
approach: sdk            # api | sdk
phase: 1
status: draft            # draft | approved | applying | applied | reviewed | validated | reported
revision: 1
scope: [sign-in, sign-up, sspr]
deferred: {}
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
    app/src/main/java/com/contoso/auth/SignUpRepository.kt: {{HASH}}
    app/src/main/java/com/contoso/auth/ResetPasswordRepository.kt: {{HASH}}
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
| Migrate now | sign-in, sign-up, sspr |
| Stay on V1 | none |
| Users will notice | 2 changes — section 3 |
| Files | 4 changed, 0 new |
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
| Native auth today | MSAL native auth SDK V1 for Android (`INativeAuthPublicClientApplication`); MSAL 8.7.0 (`app/build.gradle`, pinned), installed by the customer while planning → no change |
| Flows | sign-in (one screen: email and password; email code), sign-up (one screen: email, password, display name; email code; signs in after sign-up), sspr (email code; signs in after reset) |
| Config | `app/src/main/res/raw/auth_config_native_auth.json` (`challenge_types: ["oob", "password"]`) |

## 2. Scope

| Flow | Decision | Reason |
| --- | --- | --- |
| sign-in | Migrate | requested |
| sign-up | Migrate | requested |
| sspr | Migrate | requested |

## 3. What users will notice

**1. A weak password is rejected after the email code** (sign-up)
- *Example:* a user signs up with a password that's too weak.
- *Today:* "Choose a stronger password." as soon as they submit the form.
- *After:* they enter the email code first, then see "Choose a stronger
  password." and start sign-up again.

**2. Signing up with an existing account may send an email** (sign-up)
- *Example:* someone signs up with an email that already has an account.
- *Today:* "An account with this email already exists."
- *After:* the same message, but that account may also get a sign-in code
  email it can't use.

## 4. Files that will change

Ticked as they're applied. A deviation is noted under its item.

### Shared
MSAL 8.7.0 is already installed (`app/build.gradle`), at the minimum; it brings the common library 25.1.0 itself.
- [ ] `app/src/main/res/raw/auth_config_native_auth.json`: `authority_url` → `https://contoso.ciamlogin.com/00000000-0000-0000-0000-000000000001/`, the tenant ID instead of the tenant domain.

### sign-in
- [ ] `app/src/main/java/com/contoso/auth/SignInRepository.kt`: `start(email, password)` calls `signInV2(NativeAuthSignInParametersV2(username = email))` with `Configuration.scopes`, holding the password in memory. `PasswordRequired` submits the held password and clears it. `CodeRequired` clears the held password, keeps the state, and reports `CodeRequired`. `AuthMethodSelectionRequired` straight after the start → select the first usable method (password before an email code) without asking. `MFARequired` reaches `else` → `UNKNOWN`. A wrong code keeps the state. Keep `submitCode` and `cancel`; `else` branches go to `UNKNOWN`.

### sign-up
- [ ] `app/src/main/java/com/contoso/auth/SignUpRepository.kt`: `start` calls `signUpV2(NativeAuthSignUpParametersV2(username = email))` with `attributes` (`displayName`) and `Configuration.scopes`, without the password, which is held in memory. `CodeRequired` keeps the state. `ExistingAccountCodeRequired`, `ExistingAccountPasswordRequired`, and `AuthMethodSelectionRequired` (sign-in scenario) report `USER_ALREADY_EXISTS` and call nothing on the state. After the code, `PasswordRequired` submits the held password and clears it; `AttributesRequired` submits only requested attributes the form collected (others → `UNKNOWN`); `SignInAfterSignUpRequired` calls `signIn()` and `Complete` reports `SignedIn`. `else` branches go to `UNKNOWN`.

### sspr
- [ ] `app/src/main/java/com/contoso/auth/ResetPasswordRepository.kt`: `start` calls `resetPasswordV2(NativeAuthResetPasswordParametersV2(username = email))` with `Configuration.scopes`. `AuthMethodSelectionRequired` straight after the start → select the email code method. `CodeRequired` keeps the state; `submitCode` handles `NewPasswordRequired`; `submitNewPassword` handles `SignInAfterResetPasswordRequired` by calling `signIn()`, and `Complete` reports `SignedIn`. `MFARequired` or registration after the new password reaches `else` → `UNKNOWN`.

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
- After this phase no flow uses V1.

## Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | {{TODAY}} | Migration requested → scope sign-in, sign-up, sspr. V2-native option for sign-up (ask for the password after the code) offered; customer keeps the one-screen form | "Migrate this app to native authentication V2." | 1 |
| 2 | {{TODAY}} | SDK install: MSAL 8.5.0 was below the 8.7.0 minimum; the customer installed it, and `app/build.gradle` shows 8.7.0 | "Done, I updated MSAL to 8.7.0." | 1 |
| 3 | {{TODAY}} | Tenant ID: `authority_url` used the tenant domain; the customer gave the tenant ID | "The tenant ID is 00000000-0000-0000-0000-000000000001." | 1 |
