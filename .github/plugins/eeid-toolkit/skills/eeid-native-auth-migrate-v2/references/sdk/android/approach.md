# Approach guide: MSAL native auth SDK for Android (`approach: sdk`, `platform: android`)

The app uses the native auth surface of MSAL for Android
(`INativeAuthPublicClientApplication`) and calls its V1 methods `signIn`,
`signUp`, and `resetPassword`. The migration moves each in-scope flow to the
V2 methods `signInV2`, `signUpV2`, and `resetPasswordV2` of the **same SDK**.
The app never calls the native auth endpoints itself; the SDK does.

This file lists everything that is specific to this approach. The workflow
and gates stay in `SKILL.md`; shared procedures are in
[../../migration-lifecycle.md](../../migration-lifecycle.md),
[../../security-guardrails.md](../../security-guardrails.md), and
[../../validation-strategy.md](../../validation-strategy.md).

## Where this approach applies

- **Native Android apps** using MSAL from Kotlin or Java, with any UI layer:
  Fragments, Activities, or Jetpack Compose. Every V2 method has a `suspend`
  form and a callback form. Keep the form the V1 code uses.
- **Not** cross-platform apps that call native auth from JavaScript or Dart
  (React Native, Flutter, .NET MAUI): their SDKs aren't covered by this guide.
  Report what you found and **stop**.

## SDK version

Follow **SDK version** in [../shared-rules.md](../shared-rules.md). The
details for this platform:

- **Minimum: MSAL for Android 8.7.0** (12 November 2026), the first release
  with the complete V2 surface used here (sign-in without a password
  parameter, sign-up email first, existing-account sign-up, MFA and JIT
  resend, and one error type). This guide was written against it. V1 and V2
  methods live in the same package and the same app instance.
- **Common library:** MSAL 8.7.0 depends on `com.microsoft.identity:common`
  25.1.0 (which brings `common4j` 25.1.0), and Gradle resolves it with MSAL;
  most apps never name it. If the app declares `common` or `common4j` itself,
  or pins it (a version catalog entry, `constraints`, or
  `resolutionStrategy.force`), the SDK step raises that to 25.1.0 or later
  too. Never pin it lower than MSAL needs.
- **Installed version:** the MSAL dependency
  `com.microsoft.identity.client:msal` in `build.gradle`,
  `build.gradle.kts`, `gradle/libs.versions.toml`, or a shared versions file,
  and any `gradle.lockfile`. Keep the requirement style the app uses (a
  pinned version, a version catalog entry, or a range).
- **Lookup:** the Maven repository the project already declares, or `git
  ls-remote --tags` on the MSAL repository (SDKANDROID-01).
- **Install:** set the version in the build file and resolve it with the
  project's Gradle wrapper (for example `./gradlew dependencies`); a Gradle
  sync in Android Studio is the customer's way to do it. Update a
  `gradle.lockfile` if the project uses one.
- **Minimum OS:** the SDK's minimum is `minSdkVersion` in the MSAL
  repository at the version's tag (`gradle/versions.gradle`; 24 in 8.7.0).
  The app's is `minSdk` / `minSdkVersion` in the app module's
  `defaultConfig`, a version catalog, or a shared versions file. Raising it
  changes that value. A lower app `minSdk` also fails the build at the
  manifest merge.
- **V2 names:** in the resolved MSAL artifact in the Gradle cache. If you
  can't find it, record "V2 names not checked"; the build in validation
  shows a missing name.
- **Major version:** 8. An app on 7.x or earlier → **stop** (step 4 of
  **SDK version** in the shared rules).

## References for this approach

| File | Load when |
| --- | --- |
| [../shared-rules.md](../shared-rules.md) | Planning, applying, security review, and validating (always; read it first) |
| [v1-v2-mapping.md](v1-v2-mapping.md) | Inventory, planning, and applying (always) |
| [v2-flows.md](v2-flows.md) | Planning, applying, and validating (always) |
| [v2-errors.md](v2-errors.md) | Planning (error mapping), applying, and validating (always) |
| [validation-sdk-android.md](validation-sdk-android.md) | Planning (tests to add) and validating |
| [security-sdk-android.md](security-sdk-android.md) | Applying (rules for the code you write) and the security review |

If files disagree, `v2-flows.md` and `v2-errors.md` win over the mapping. The
shared rules say what the app does; on an exact API or a stated platform
difference, this folder's files win over them.

## Inventory (Step 2)

Find the V1 SDK usage:

- `INativeAuthPublicClientApplication` and
  `PublicClientApplication.createNativeAuthPublicClientApplication`. Usually
  there is one instance, created at startup or in an auth service.
- Calls of `signIn`, `signUp`, and `resetPassword` on that instance, in both
  forms: with `NativeAuthSignInParameters` (and the sign-up and reset
  equivalents), or with positional `username` and `password` arguments.
- The V1 results the code branches on (`SignInResult.Complete`,
  `SignInResult.CodeRequired`, `SignInResult.MFARequired`,
  `SignUpResult.CodeRequired`, `ResetPasswordStartResult.CodeRequired`, and
  the others in [v1-v2-mapping.md](v1-v2-mapping.md)).
- The V1 states the screens hold between steps (`SignInCodeRequiredState`,
  `SignUpCodeRequiredState`, `ResetPasswordCodeRequiredState`,
  `AwaitingMFAState`, `RegisterStrongAuthState`, …) and where they are kept (a
  ViewModel, a repository, a Fragment argument, an Intent extra, saved
  instance state).
- V1 error checks the UI branches on (for example `isUserNotFound()`,
  `isInvalidCredentials()`, `isInvalidCode()`, `isUserAlreadyExists()`,
  `isInvalidPassword()`, `isBrowserRequired()`).
- The configuration: the raw JSON resource passed at creation, with its client
  ID, authority, `challenge_types`, and `capabilities`.
- What the app does on `isBrowserRequired()` (for example an interactive MSAL
  sign-in, a message, or nothing). V2 reuses it.
- Scopes and claims: what the V1 code passes to `signIn` and to the
  continuation `signIn` after sign-up or reset
  (`NativeAuthSignInContinuationParameters`), and to `getAccessToken`.
- Per flow, which steps the V1 UI handles (parity rule in
  `references/flows-and-scope.md`): password, email code, SMS code, MFA
  (`SignInResult.MFARequired`), JIT registration
  (`SignInResult.StrongAuthMethodRegistrationRequired`), dynamic sign-up
  attributes (`SignUpResult.AttributesRequired`), automatic sign-in after
  sign-up or reset (`signIn` on `SignInContinuationState`), what the UI does on
  `isUserAlreadyExists()`, and whether sign-in and sign-up collect the password
  on the first screen.
- The build file and the installed MSAL version; the unit test task and how it
  runs (`./gradlew testDebugUnitTest` or the app's own variant), if any.

## Planning (Step 3)

- **What we found:** App = language (Kotlin or Java) and UI layer; Native
  auth today = "MSAL native auth SDK V1 for Android" with the API form
  (`suspend` or callback) and the SDK version (installed → planned).
- **Shared files to change:** SDK version (see **SDK version**); no new
  client or HTTP code; configuration stays the same except the tenant ID in
  `authority_url` (see [v1-v2-mapping.md](v1-v2-mapping.md),
  "Configuration").
- **Scopes, supported steps, behavior changes, and the error mapping:**
  follow **Planning** in the shared rules. Details for this platform:
  - Supported steps: the V2 results the migrated flow handles (parity rule).
    Any other result goes to the `else` branch, which is the unhandled outcome.
- **Validation commands:** the app's own Gradle build and unit test commands
  if the repo has them. Without a Gradle wrapper or an Android SDK, they are
  recorded as not run.
- **Risks and actions for you:** the SDK install if the customer does it
  (**SDK version** in the shared rules).

## Applying (Step 6)

Follow "Code-change patterns" in [v1-v2-mapping.md](v1-v2-mapping.md):

1. The SDK step, as **While applying** under **SDK version** in the shared
   rules says: install from the project's repositories (SDKANDROID-01), and stop before any other change if
   the install fails.
2. Keep the one `INativeAuthPublicClientApplication` and its configuration.
   Deferred flows keep calling the V1 methods on it.
3. Replace each migrated flow's V1 start call with the V2 start call, in the
   same `suspend` or callback form, and branch on `NativeAuthResultV2` as
   [v2-flows.md](v2-flows.md) lists, with an `else` branch for the unhandled
   outcome.
4. Keep the current V2 state as **Keeping state** in the shared rules says
   (SDKANDROID-02). V2 errors don't hand back a new state: keep the last state
   to retry on it.
5. Keep the UI, screens, and navigation; map V1 result fields to V2 result
   fields (`sentTo`, `codeLength`, `channel`, `requiredAttributes`,
   `authMethods`). Map only what
   the V1 code read; a field it didn't use (for example the code length)
   stays unused (**No improvements** in [../../flows-and-scope.md](../../flows-and-scope.md)).
6. Replace V1 error checks with the V2 checks from the error mapping.

## Security review (Step 7)

Apply the rules in [security-sdk-android.md](security-sdk-android.md) together
with the shared guardrails.

## Validating (Step 8)

Use the approach-specific checks and required tests in
[validation-sdk-android.md](validation-sdk-android.md).

## Report rows

- SDK version installed (**SDK version** in the shared rules).
- Actions for you: run the app's tests if they couldn't run here.
