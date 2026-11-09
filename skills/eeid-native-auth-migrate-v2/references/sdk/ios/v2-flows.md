# MSAL native auth V2 flows on iOS and macOS

Each table is the complete list of per-state delegates the migrated flow
adopts at each step. The SDK delivers a state only through its delegate
protocol; a state whose delegate the app doesn't adopt arrives as
`onFlowError` with `isNotImplemented`. That is how the parity rule
(`references/flows-and-scope.md`) is kept: adopt the delegates for the
steps the V1 UI handled, and no others.

The flow's **unhandled outcome** is: the app's V1 handling of
`isBrowserRequired` if the error is browser-required, otherwise the app's
existing generic error. `isNotImplemented` always goes to the generic error.
Discard the flow's state either way.

The behavior rules in [../shared-rules.md](../shared-rules.md) apply to every step; this file adds the iOS and macOS API for them.

`onFlowError(error:scenario:)` can follow every call; handle it with
[v2-errors.md](v2-errors.md). `onFlowCompleted(result:scenario:)` delivers
the signed-in `MSALNativeAuthUserAccountResult`.

## Common rules

**Flow rules** in the shared file apply. For iOS and macOS:

- Keep the latest state in a property: a wrong code, password, or challenge
  arrives as an error without a new state, and the user retries on the same
  state. Replace it with each newly delivered state.
- Resend: `resendCode(delegate:)` / `resendChallenge(delegate:)` deliver a new
  state of the same kind (MFA resend can also deliver a registration state).
- **Method selection** is `onAuthMethodSelectionRequired`. Check usable types
  with `channelTargetType.isEmailType` and `.isSMSType`, in the order of the V1
  challenge types. Show `loginHint`, and pass the object from `authMethods` to
  `selectAuthMethod`. An existing account also has `scenario == .signIn`.

## Sign-in

| Step | Call | Delegates adopted |
| --- | --- | --- |
| 1. Start | `signInV2(parameters: MSALNativeAuthSignInParametersV2(username:), delegate:)` with V1's scopes and claims | `PasswordRequired`; `CodeRequired` (code already sent, single email or SMS method); `AuthMethodSelectionRequired` (first factor, only if V1 offered a method choice) |
| 2a. Password | `state.submitPassword(_:delegate:)` | → `onFlowCompleted`; `AuthMethodSelectionRequired` (MFA, only if V1 had MFA); `StrongAuthRegistrationRequired` (only if V1 had JIT) |
| 2b. Method choice | `state.selectAuthMethod(_:delegate:)` | `CodeRequired`; `PasswordRequired` |
| 2c. Code | `state.submitCode(_:delegate:)` | → `onFlowCompleted`; MFA; JIT, as in 2a |
| 3. MFA | see **MFA** | → `onFlowCompleted` |
| 3. JIT | see **JIT registration** | → `onFlowCompleted` |

One-screen V1 sign-in (`parameters.password` set): follow **One-screen forms**
in the shared file. The password is requested by `onPasswordRequired`. If the
start delivers `onCodeRequired` instead, the V1 behavior to keep is
`onSignInCodeRequired`.

## Sign-up

| Step | Call | Delegates adopted |
| --- | --- | --- |
| 1. Start | `signUpV2(parameters: MSALNativeAuthSignUpParametersV2(username:), delegate:)` with `attributes`, scopes, claims | `CodeRequired` (email code sent); existing account: `ExistingAccountCodeRequired`, `ExistingAccountPasswordRequired`, `AuthMethodSelectionRequired` |
| 2. Verify email | `state.submitCode(_:delegate:)` | `AttributesRequired`; `PasswordRequired`; `SignInAfterSignUpRequired`; `StrongAuthRegistrationRequired` (only if V1's automatic sign-in handled JIT) |
| 3. Attributes (repeats) | `state.submitAttributes(_:delegate:)` | same as step 2 |
| 3. Password | `state.submitPassword(_:delegate:)` | same as step 2 |
| 4. Finish | see **Finish after sign-up or reset** | |

- **One-screen forms** and **Sign-up attributes** in the shared file apply. The
  password is requested by `onPasswordRequired`, and attributes by
  `onAttributesRequired`, which lists them in `state.attributes`.
- Never submit `email` as an attribute. It is the sign-up username, and the SDK
  reports an error if the service asks for it.
- To render an attribute dynamically, use `name`, `type`, `required`, and
  `regex`.

### Existing account

Follow **Existing account at sign-up** in the shared file. `signUpV2` delivers
`onExistingAccountCodeRequired`, `onExistingAccountPasswordRequired`, or
`onAuthMethodSelectionRequired`, each with `scenario == .signIn`, and the V1
error is `isUserAlreadyExists`.

The sign-up flow must adopt these delegates: without them the SDK reports
`isNotImplemented`, which can't be told apart from other errors.

## Password reset (SSPR)

| Step | Call | Delegates adopted |
| --- | --- | --- |
| 1. Start | `resetPasswordV2(parameters: MSALNativeAuthResetPasswordParametersV2(username:), delegate:)` with scopes and claims | `CodeRequired` (code sent); `AuthMethodSelectionRequired` (first factor, only if V1 offered a method choice) |
| 2. Method choice | `state.selectAuthMethod(_:delegate:)` | `CodeRequired` |
| 3. Code | `state.submitCode(_:delegate:)` | `NewPasswordRequired` |
| 4. New password | `state.submitNewPassword(_:delegate:)` | `SignInAfterResetPasswordRequired`; `AuthMethodSelectionRequired` (MFA); `StrongAuthRegistrationRequired` (JIT), per **Finish** |
| 5. Finish | see **Finish after sign-up or reset** | |

**Password reset** in the shared file applies: every step-4 result except an
error means the password is already reset.

## Finish after sign-up or reset

Follow **Finish after sign-up or reset** in the shared file. For iOS and macOS:

- The after-flow state arrives through `onSignInAfterSignUpRequired` or
  `onSignInAfterResetPasswordRequired`; `signIn(delegate:)` on it leads to
  `onFlowCompleted`.
- JIT arrives through `onStrongAuthRegistrationRequired`, and MFA (reset only)
  through `onAuthMethodSelectionRequired`.

Which delegates to adopt depends on the row of the shared table:

| V1 app after the flow | Delegates |
| --- | --- |
| Signs in automatically (`signIn` on the V1 after-sign-up or after-reset state), and handles MFA and registration there | Adopt the MFA (reset only) and JIT delegates, and the after-flow delegate |
| Signs in automatically, but doesn't handle MFA or registration there | Don't adopt the MFA or JIT delegates; the step arrives as an error, which you handle as that row says |
| Doesn't sign in automatically | Adopt the after-flow delegate (`…SignInAfterSignUpRequiredDelegate` / `…SignInAfterResetPasswordRequiredDelegate`) only to end the flow, and never call `signIn`. Don't adopt MFA or JIT; their error after the reset or sign-up ends the flow the same way. |

## MFA

Only where the V1 flow handled MFA (`onSignInAwaitingMFA`).

| Step | Call | Delegates adopted |
| --- | --- | --- |
| 1. Choose method | `state.selectAuthMethod(_:delegate:)` on the MFA selection state | `MFAVerificationRequired` (challenge sent) |
| 2. Verify | `state.submitChallenge(_:delegate:)` | → `onFlowCompleted` (sign-in); `SignInAfterResetPasswordRequired` (reset) |
| Resend | `state.resendChallenge(delegate:)` | `MFAVerificationRequired`; `StrongAuthRegistrationRequired` if JIT is adopted |

## JIT registration

Only where the V1 flow handled registration
(`onSignInStrongAuthMethodRegistration`).

| Step | Call | Delegates adopted |
| --- | --- | --- |
| 1. Register | `state.selectAuthMethod(_:verificationContact:delegate:)` | `StrongAuthVerificationRequired` (code sent to the contact) |
| 2. Activate | `state.submitChallenge(_:delegate:)` | → `onFlowCompleted`; the after-flow state for sign-up or reset; MFA if adopted |
| Resend | `state.resendChallenge(delegate:)` | `StrongAuthVerificationRequired` |

- Usable methods are the V1-handled types (email; SMS). The contact is an
  email address or a phone number with its country calling code, as the V1
  UI collected it; a blank contact is an `isInvalidInput` error.
- V1's `preverified` shortcut is gone (**Registration and browser required**
  in the shared file).

## Browser required

`error.isBrowserRequired` at any step: follow **Registration and browser
required** in the shared file. The V1 handling to reuse is its
`isBrowserRequired` handling.
