---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying this plan.
skill-version: "{{SKILL_VERSION}}"   # a different installed major or minor version restarts the migration
app-root: .
approach: sdk            # api | sdk (sdk: JavaScript single-page apps, iOS and macOS apps)
phase: 1
status: draft            # draft | approved | applying | applied | reviewed | validated | reported
revision: 1
scope: [sign-in, sign-up, sspr]
deferred: {}
approved: null           # { revision: N, date: YYYY-MM-DD, how: "confirmed in chat" }
baseline:
  commit: {{COMMIT}}
  files:
    Podfile: {{HASH}}
    Podfile.lock: {{HASH}}
    ContosoAuth/Configuration.swift: {{HASH}}
    ContosoAuth/Auth/NativeAuthClient.swift: {{HASH}}
    ContosoAuth/Auth/AuthMessages.swift: {{HASH}}
    ContosoAuth/Auth/AuthOutcome.swift: {{HASH}}
    ContosoAuth/Auth/SignInCoordinator.swift: {{HASH}}
    ContosoAuth/Auth/SignUpCoordinator.swift: {{HASH}}
    ContosoAuth/Auth/ResetPasswordCoordinator.swift: {{HASH}}
    ContosoAuth/UI/AuthViewController.swift: {{HASH}}
    ContosoAuthTests/AuthMessagesTests.swift: {{HASH}}
dirty-files: []          # files inside app-root with uncommitted changes when planned; the migration never edits them (excluded from check A1)
validation-settings:     # you may edit these before approving
  max-fix-attempts: 5            # per failure (each failing test or error)
  command-timeout-minutes: 30    # per build/test command
validation-baseline: null  # set in the pre-apply check: { <check ID>: passed | "failed: <summary>" | "not-run: <reason>" } or skipped
---

# Native Auth V2 migration plan — Contoso sign-in iOS app (SDK), phase 1

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
| Files | 7 changed (including `Podfile.lock`), 0 new |
| Commands run on approval | none: this repo has no Xcode project, so build and tests are recorded as not run |
| Decisions needed | none |

## Decisions needed

None.

## Previous phases

None.

## 1. What we found

Check that this matches your app.

| Item | Found |
| --- | --- |
| App | iOS, Swift |
| Native auth today | MSAL native auth SDK V1 for iOS/macOS (`MSALNativeAuthPublicClientApplication`); MSAL 2.16.1 (`~> 2.16`) → latest 2.x (at least 2.18.1) |
| Flows | sign-in (one screen: email and password; email code), sign-up (one screen: email, password, display name; email code; signs in after sign-up), sspr (email code; signs in after reset) |
| Config | `ContosoAuth/Configuration.swift`, `ContosoAuth/Auth/NativeAuthClient.swift` (`challengeTypes: [.OOB, .password]`) |

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
- [ ] `Podfile`: `pod 'MSAL', '~> 2.18'`, keeping the `~>` style and the CocoaPods source; run `pod update MSAL` so `Podfile.lock` records 2.18.1 or later.
- [ ] `ContosoAuth/Configuration.swift`: add `tenantId = "00000000-0000-0000-0000-000000000001"` next to `clientId`.
- [ ] `ContosoAuth/Auth/NativeAuthClient.swift`: build the config with `init(clientId:authority:challengeTypes:)` and `MSALCIAMAuthority(url:)` for `https://contoso.ciamlogin.com/` + `Configuration.tenantId`, instead of `tenantSubdomain:`. Keep `challengeTypes`.

### sign-in
- [ ] `ContosoAuth/Auth/SignInCoordinator.swift`: `start(email:password:)` calls `signInV2` with `MSALNativeAuthSignInParametersV2(username:)` and `Configuration.scopes`, holding the password in memory. Adopt `MSALNativeAuthFlowDelegate`, `MSALNativeAuthPasswordRequiredDelegate`, `MSALNativeAuthCodeRequiredDelegate`, and `MSALNativeAuthAuthMethodSelectionRequiredDelegate`. `onPasswordRequired` submits the held password and clears it. `onCodeRequired` clears the held password, keeps the state, and reports `.codeRequired`. Method selection straight after the start → select the first usable method (password before an email code) without asking; later in the flow it is MFA → `.failed(.unknown)`. A wrong code keeps the state. Keep `submitCode`, `resendCode`, and `cancel`.

### sign-up
- [ ] `ContosoAuth/Auth/SignUpCoordinator.swift`: `start` calls `signUpV2` with `MSALNativeAuthSignUpParametersV2(username:)`, `attributes` (`displayName`), and `Configuration.scopes`, without the password, which is held in memory. Adopt `MSALNativeAuthFlowDelegate`, `MSALNativeAuthCodeRequiredDelegate`, `MSALNativeAuthPasswordRequiredDelegate`, `MSALNativeAuthAttributesRequiredDelegate`, `MSALNativeAuthExistingAccountCodeRequiredDelegate`, `MSALNativeAuthExistingAccountPasswordRequiredDelegate`, `MSALNativeAuthAuthMethodSelectionRequiredDelegate`, and `MSALNativeAuthSignInAfterSignUpRequiredDelegate`. The three existing-account callbacks report `.failed(.userAlreadyExists)` and call nothing on the state. `onPasswordRequired` submits the held password and clears it. `onAttributesRequired` submits only requested attributes the form collected; others → `.failed(.unknown)`. `onSignInAfterSignUpRequired` calls `signIn(delegate:)`; `onFlowCompleted` reports `.signedIn`.

### sspr
- [ ] `ContosoAuth/Auth/ResetPasswordCoordinator.swift`: `start` calls `resetPasswordV2` with `MSALNativeAuthResetPasswordParametersV2(username:)` and `Configuration.scopes`. Adopt `MSALNativeAuthFlowDelegate`, `MSALNativeAuthCodeRequiredDelegate`, `MSALNativeAuthNewPasswordRequiredDelegate`, `MSALNativeAuthAuthMethodSelectionRequiredDelegate`, and `MSALNativeAuthSignInAfterResetPasswordRequiredDelegate`. Method selection straight after the start → select the email code method; after the new password it is MFA → `.failed(.unknown)`. `onSignInAfterResetPasswordRequired` calls `signIn(delegate:)`; `onFlowCompleted` reports `.signedIn`.

## 5. Checks run when you approve

Run twice: before any change, and after. A failure the migration causes is
fixed up to `max-fix-attempts` times; each command may run up to
`command-timeout-minutes` (edit `validation-settings` in the front matter to
change these).

| Check | Command |
| --- | --- |
| Build | Not run — no Xcode project in this repo |
| Unit tests | Not run — no Xcode project in this repo |

Tests that need a real tenant are never run or changed (none found); the
report ends with a manual test script.

## 6. Risks and actions for you

- [ ] Build the app and run `ContosoAuthTests` in Xcode.
- After this phase no flow uses V1.

## Decisions and revisions

| # | Date | Decision or change | Customer's words | Revision |
| --- | --- | --- | --- | --- |
| 1 | {{TODAY}} | Migration requested → scope sign-in, sign-up, sspr. V2-native option for sign-up (ask for the password after the code) offered; customer keeps the one-screen form | "Migrate this app to native authentication V2." | 1 |
| 2 | {{TODAY}} | Tenant ID: the app used `tenantSubdomain`, so MSAL used the tenant domain; the customer gave the tenant ID | "The tenant ID is 00000000-0000-0000-0000-000000000001." | 1 |
