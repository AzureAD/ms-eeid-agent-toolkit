# Validation for the MSAL native auth SDK on Android (`approach: sdk`, `platform: android`)

Shared rules, the fix loop, settings, and the check order are in
`references/validation-strategy.md`. This file adds what is specific to MSAL
Android migrations.

## Build and tests

- Build and tests use the app's own commands: the Gradle wrapper's build and
  unit test tasks (for example `./gradlew assembleDebug` and
  `./gradlew testDebugUnitTest`, or the app's own variant), as the repo or its
  README defines them.
- They need the Gradle wrapper, a JDK, and an Android SDK. Many machines have
  them only through Android Studio, so look in these places, in order, before
  calling one missing:
  - **JDK:** `JAVA_HOME`; `/usr/libexec/java_home` on macOS; Android Studio's
    bundled JDK (`Android Studio.app/Contents/jbr/Contents/Home` on macOS, the
    `jbr` folder in the Android Studio install folder on Windows and Linux).
  - **Android SDK:** `ANDROID_HOME`; `sdk.dir` in the project's
    `local.properties`; the default folder (`~/Library/Android/sdk` on macOS,
    `%LOCALAPPDATA%\Android\Sdk` on Windows, `~/Android/Sdk` on Linux).
- Found outside the environment → set `JAVA_HOME` and `ANDROID_HOME` in the
  planned commands, and record where each came from in the plan. Don't edit
  `local.properties`, the shell profile, or other machine settings.
- Still missing, or the repo has no Gradle project to build → record B and C
  as not run with the reason; never install them, and never run `sudo`.
- Device and emulator tests (`connectedAndroidTest`) need a real tenant: never
  run them.

## A3: V1 left in migrated flows

Search the migrated flows' files for V1 SDK usage: `signIn(`, `signUp(`,
`resetPassword(` start calls on the app instance with V1 parameter types or
positional arguments (`NativeAuthSignInParameters`, not `…V2`), V1 results and
states from [v1-v2-mapping.md](v1-v2-mapping.md) (for example
`SignInResult.CodeRequired`, `SignUpCodeRequiredState`, `AwaitingMFAState`),
and V1 error classes (`SignInError`, `SubmitCodeError`, …). Any hit reached from
a migrated flow is a failure. V1 hits used only by deferred flows are expected.
`AccountState`, `getCurrentAccount()`, and `UserAttributes` are shared, not V1.

## A5: V2 contract checklist

Check **Checks for every SDK** in [../shared-rules.md](../shared-rules.md), and:

- MSAL is the approved version, at or above the 8.7.0 minimum, from the project's
  own sources; no other new packages.
- Start calls use the `…ParametersV2` types with the username and the V1
  scopes and claims; no password in sign-in or sign-up start parameters;
  sign-up `attributes` never contain `email` or `password`.
- Each migrated call handles exactly the results its table in
  [v2-flows.md](v2-flows.md) lists, and has an `else` that leads to the generic
  error; `isBrowserRequired()` leads to the V1 browser handling.
- The existing-account handling is `ExistingAccountCodeRequired`,
  `ExistingAccountPasswordRequired`, or method selection with the sign-in
  scenario after `signUpV2`; the V1 handling is `isUserAlreadyExists()`.
- `signIn()` is called only on the after-sign-up or after-reset state.
- Errors come from [v2-errors.md](v2-errors.md); retries reuse the kept state.

## Required tests

Unit tests need no service and no SDK internals. V2 states can't be created
outside the SDK, so test the app's own logic around them:

- Keep the decisions in plain functions or small types the tests can call (for
  example the error-to-message map, the "which step is this selection" logic,
  and "sign in after sign-up or not"), and test those.
- Where the app already fakes the SDK's results with its own wrappers or mocks,
  extend those tests to the V2 results.
- Don't add a mocking framework the project doesn't use.

Each migrated flow also needs the required tests in **Checks for every SDK** in
the shared rules.

| Flow | Tests |
| --- | --- |
| `sign-in` | Error map: unknown user gets the V1 message; wrong code; browser required → V1 browser handling; an unhandled result → generic error; the held password is submitted on the password step and cleared |
| `sign-up` | Error map: password policy error, invalid attributes, wrong code; existing account (each of the three results) → V1 `isUserAlreadyExists()` handling; sign in after sign-up only where V1 did |
| `sspr` | Error map: unknown user gets the V1 message, wrong code, password policy error; MFA or JIT after the new password → V1 behavior per the **Finish** table |
