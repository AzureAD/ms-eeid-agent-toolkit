# Validation for the MSAL JS native auth SDK (`approach: sdk`, `platform: js`)

Shared rules, the fix loop, settings, and the check order are in
`references/validation-strategy.md`. This file adds what is specific to
MSAL JS SDK migrations.

## A3: V1 left in migrated flows

Search the migrated flows' files and call chains for V1 SDK usage: the
start calls `signIn(`, `signUp(`, `resetPassword(` on the app instance
(not `signInV2(` and so on), V1 state classes and checks from
[v1-v2-mapping.md](v1-v2-mapping.md) (for example `SignInCodeRequiredState`,
`isCodeRequired()`, `isUserAlreadyExists()`, `MfaAwaitingState`), and V1
error classes (`SignInError`, `SignUpError`, `ResetPasswordError`, …). Any
hit reached from a migrated flow is a failure. V1 hits used only by deferred
flows are expected. `CustomAuthAccountData` methods (`getAccessToken`,
`signOut`, …) and `getCurrentAccount()` are shared, not V1.

## A5: V2 contract checklist

Check **Checks for every SDK** in [../shared-rules.md](../shared-rules.md), and:

- `@azure/msal-browser` is the approved version, at or above the minimum,
  and the lockfile matches (unless the install failed and the report says so); no
  other new packages; no registry override (`--registry`, `.npmrc` change).
- Start calls pass `username` and the V1 scopes and claims; `signInV2` and
  `signUpV2` never get a password; `signUpV2` `attributes` never contain
  `email` or `password`.
- Each handler accepts only the states its step lists in
  [v2-flows.md](v2-flows.md); every other state, and `isBrowserRequired()`,
  leads to the unhandled outcome (V1 redirect handling or generic error),
  not a crash, a hang, or a silent continue.
- The existing-account states are `existingAccountCodeRequired`,
  `existingAccountPasswordRequired`, and `authMethodSelectionRequired` from the
  start; the V1 handling is `isUserAlreadyExists()`.
- `signIn()` is called only on `signInContinuation`.
- Errors come from [v2-errors.md](v2-errors.md).
- Config keeps `authApiProxyUrl`; `challengeTypes` and `capabilities` are
  kept while any flow is on V1; the proxy forwards V2 paths and `PUT`.

## Required tests

Mock the SDK at the app's boundary: a fake app instance whose `signInV2`,
`signUpV2`, and `resetPasswordV2` return results built from fake state
objects with the `stateType`, properties, and methods listed in
[v1-v2-mapping.md](v1-v2-mapping.md). Use `isState`, `isFailed`, and
`isPasswordRequired` on the fake results the same way the SDK does, and
fake `AuthFlowErrorV2` checks. Don't call the real service.

**Per migrated flow**, plus the required tests in **Checks for every SDK** in the
shared rules:

| Flow | Tests |
| --- | --- |
| `sign-in` | Password success (start → `passwordRequired` → `completed`), with a one-screen form submitting the held password; email code success; wrong password; wrong code; unknown user gets the V1 message; more than one usable method with no V1 choice screen selects the first without asking; MFA after password (where V1 had MFA); JIT after sign-in (where V1 had JIT) or unhandled; method choice with a type the V1 UI never handled → unhandled; `isBrowserRequired()` → V1 redirect handling; an unexpected state → unhandled |
| `sign-up` | Email code → `attributesRequired` / `passwordRequired` (repeated) → `signInContinuation` → `signIn()` or end, per V1; start `attributes` passed and the password not passed at start; existing account (each of the three start states) → V1 `isUserAlreadyExists()` handling with no further call; JIT after the account exists → registration then sign-in, or V1's error handling, or end, per V1; password policy error; invalid attributes marked; wrong code; resend |
| `sspr` | Code → `newPasswordRequired` → `signInContinuation` → `signIn()` or end, per V1; MFA or JIT after the new password → MFA/JIT then sign-in, or V1's error handling, or end as "password reset", with no added browser fallback; unknown user gets the V1 message; wrong code; password policy error |
| JIT (if handled) | Email and phone registration; activation → `completed` or `signInContinuation`; wrong activation code (`isInvalidChallenge()`); resend |
