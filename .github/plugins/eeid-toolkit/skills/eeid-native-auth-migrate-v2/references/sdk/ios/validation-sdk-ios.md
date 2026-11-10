# Validation for the MSAL native auth SDK on iOS and macOS (`approach: sdk`, `platform: ios`)

Shared rules, the fix loop, settings, and the check order are in
`references/validation-strategy.md`. This file adds what is specific to
MSAL iOS and macOS migrations.

## Build and tests

- Build and tests use the app's own commands: an `xcodebuild` build and
  `xcodebuild test` with the app's scheme and an available simulator
  destination (or `swift test` for a Swift package), as the repo or its
  README defines them.
- They need macOS with Xcode selected (`xcode-select -p`), its licence
  accepted, and a simulator runtime for iOS targets. If any is missing, or
  the repo has no project or package to build, record B and C as not run
  with the reason; never install Xcode, runtimes, or certificates, and never
  run `sudo`.
- A failure caused only by an unresolved package (the version couldn't be
  resolved here) is recorded as failed for that reason, not fixed.

## A3: V1 left in migrated flows

Search the migrated flows' files for V1 SDK usage: the start calls
`signIn(parameters:`, `signUp(parameters:`, `resetPassword(parameters:`
with V1 parameter types (`MSALNativeAuthSignInParameters`, not `…V2`), V1
delegates and callbacks from [v1-v2-mapping.md](v1-v2-mapping.md) (for
example `SignInStartDelegate`, `onSignInCodeRequired`,
`onSignUpStartError`, `AwaitingMFAState`), and V1 error classes
(`SignInStartError`, `VerifyCodeError`, …). Any hit reached from a migrated
flow is a failure. V1 hits used only by deferred flows are expected.
`MSALNativeAuthUserAccountResult` methods (`getAccessToken`, `signOut`) and
`getNativeAuthUserAccount()` are shared, not V1.

## A5: V2 contract checklist

Check **Checks for every SDK** in [../shared-rules.md](../shared-rules.md), and:

- MSAL is the approved version, at or above the V2 release, from the project's own sources; no
  other new packages.
- Start calls use the `…ParametersV2` types with the username and the V1
  scopes and claims; no password in sign-in or sign-up start parameters;
  sign-up `attributes` never contain `email` or `password`.
- The object driving each migrated flow adopts `MSALNativeAuthFlowDelegate`
  and exactly the per-state delegates its table in
  [v2-flows.md](v2-flows.md) lists; `isNotImplemented` and other unhandled
  errors lead to the generic error, and `isBrowserRequired` to the V1
  browser handling.
- The existing-account callbacks are the two existing-account callbacks, or
  method selection with `scenario == .signIn` after `signUpV2`; the V1 handling
  is `isUserAlreadyExists`.
- `signIn(delegate:)` is called only on the after-sign-up or after-reset state.
- Errors come from [v2-errors.md](v2-errors.md); retries reuse the kept state.

## Required tests

Unit tests need no service and no SDK internals. V2 states can't be created
outside the SDK, so test the app's own logic around them:

- Keep the decisions in plain functions or small types the tests can call
  (for example the error-to-message map, the "which step is this selection"
  logic, and "sign in after sign-up or not"), and test those.
- Where the app already tests delegate callbacks with its own fakes or
  protocols, extend those tests to the V2 callbacks.
- Don't add a mocking framework or make SDK types mockable by changing the
  SDK.

Each migrated flow also needs the required tests in **Checks for every SDK** in
the shared rules.

| Flow | Tests |
| --- | --- |
| `sign-in` | Error map: unknown user gets the V1 message; wrong code; browser required → V1 browser handling; `isNotImplemented` → generic error; the held password is submitted on the password step and cleared |
| `sign-up` | Error map: password policy error, invalid attributes, wrong code; existing account (each of the three callbacks) → V1 `isUserAlreadyExists` handling; sign in after sign-up only where V1 did |
| `sspr` | Error map: unknown user gets the V1 message, wrong code, password policy error; MFA or JIT after the new password → V1 behavior per the **Finish** table |
