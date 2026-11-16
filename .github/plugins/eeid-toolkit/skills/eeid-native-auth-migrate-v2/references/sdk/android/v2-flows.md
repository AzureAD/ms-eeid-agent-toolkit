# MSAL native auth V2 flows on Android

Each table is the complete list of results the migrated flow handles at each
step. Every call returns one `NativeAuthResultV2`, so a result the V1 UI didn't
handle reaches the `when`'s `else` branch. That is how the parity rule
(`references/flows-and-scope.md`) is kept: handle the results for the steps the
V1 UI handled, and no others.

The flow's **unhandled outcome** is: the app's V1 handling of
`isBrowserRequired()` if the result is a browser-required error, otherwise the
app's existing generic error. Discard the flow's state either way.

The behavior rules in [../shared-rules.md](../shared-rules.md) apply to every step; this file adds the Android API for them.

`NativeAuthErrorV2` can follow every call; handle it with
[v2-errors.md](v2-errors.md). `NativeAuthResultV2.Complete` delivers the
signed-in `AccountState` in `resultValue`.

## Common rules

**Flow rules** in the shared file apply. For Android:

- Keep the latest state in a property: a wrong code, password, or challenge
  arrives as an error without a new state, and the user retries on the same
  state. Replace it with each `result.nextState`.
- Resend: `resendCode()` / `resendChallenge()` return a new result of the same
  kind (MFA resend can also return a registration result).
- **Method selection** is `AuthMethodSelectionRequired`. Check usable types with
  `challengeType` and `challengeChannel` (`email`, `sms`), in the order of the
  V1 challenge types. Show `loginHint`, and pass the object from `authMethods`
  to `selectAuthMethod`. An existing account also has
  `scenario == NativeAuthFlowScenarioV2.SIGN_IN`.
- Handle `AuthMethodSelectionRequired` for the first factor even if the V1 UI
  had no method choice: an account with more than one method gets this result.
  It comes only straight after a start call (the first factor, or an existing
  account after `signUpV2`).
- MFA is its own result, `MFARequired`, with `authMethods` and
  `MFARequiredStateV2.selectAuthMethod(method)`. In a flow whose V1 UI had no
  MFA, it reaches `else`: the unhandled outcome.
- `suspend` calls can be made from any dispatcher. Callback-form results don't
  arrive on the main thread, so keep the V1 code's switch to it before touching
  the UI.

## Sign-in

| Step | Call | Results handled |
| --- | --- | --- |
| 1. Start | `signInV2(NativeAuthSignInParametersV2(username))` with V1's scopes and claims | `PasswordRequired`; `CodeRequired` (code already sent, single email or SMS method); `AuthMethodSelectionRequired` (first factor; follow **Method selection** in the shared file) |
| 2a. Password | `state.submitPassword(password)` | `Complete`; `MFARequired` (only if V1 had MFA); `StrongAuthRegistrationRequired` (only if V1 had JIT) |
| 2b. Method choice | `state.selectAuthMethod(method)` | `CodeRequired`; `PasswordRequired` |
| 2c. Code | `state.submitCode(code)` | `Complete`; MFA; JIT, as in 2a |
| 3. MFA | see **MFA** | `Complete` |
| 3. JIT | see **JIT registration** | `Complete` |

One-screen V1 sign-in (a password passed to `signIn`): follow **One-screen
forms** in the shared file. The password is requested by `PasswordRequired`. If
the start returns `CodeRequired` instead, the V1 behavior to keep is
`SignInResult.CodeRequired`.

## Sign-up

| Step | Call | Results handled |
| --- | --- | --- |
| 1. Start | `signUpV2(NativeAuthSignUpParametersV2(username))` with `attributes`, scopes, claims | `CodeRequired` (email code sent); existing account: `ExistingAccountCodeRequired`, `ExistingAccountPasswordRequired`, `AuthMethodSelectionRequired` |
| 2. Verify email | `state.submitCode(code)` | `AttributesRequired`; `PasswordRequired`; `SignInAfterSignUpRequired`; `StrongAuthRegistrationRequired` (only if V1's automatic sign-in handled JIT) |
| 3. Attributes (repeats) | `state.submitAttributes(attributes)` | same as step 2 |
| 3. Password | `state.submitPassword(password)` | same as step 2 |
| 4. Finish | see **Finish after sign-up or reset** | |

- **One-screen forms** and **Sign-up attributes** in the shared file apply. The
  password is requested by `PasswordRequired`, and attributes by
  `AttributesRequired`, which lists them in `requiredAttributes`.
- Never submit `email` as an attribute. It is the sign-up username, and the SDK
  rejects it.
- To render an attribute dynamically, use `attributeName`, `type`, `required`,
  and `options`.

### Existing account

Follow **Existing account at sign-up** in the shared file. `signUpV2` returns
`ExistingAccountCodeRequired`, `ExistingAccountPasswordRequired`, or
`AuthMethodSelectionRequired` with
`scenario == NativeAuthFlowScenarioV2.SIGN_IN`, and the V1 error is
`isUserAlreadyExists()`.

The sign-up flow must branch on these results explicitly: they would otherwise
reach `else` and show the generic error instead of the V1 message.

## Password reset (SSPR)

| Step | Call | Results handled |
| --- | --- | --- |
| 1. Start | `resetPasswordV2(NativeAuthResetPasswordParametersV2(username))` with scopes and claims | `CodeRequired` (code sent); `AuthMethodSelectionRequired` (first factor; follow **Method selection** in the shared file) |
| 2. Method choice | `state.selectAuthMethod(method)` | `CodeRequired` |
| 3. Code | `state.submitCode(code)` | `NewPasswordRequired` |
| 4. New password | `state.submitNewPassword(password)` | `SignInAfterResetPasswordRequired`; `MFARequired` (MFA); `StrongAuthRegistrationRequired` (JIT), per **Finish** |
| 5. Finish | see **Finish after sign-up or reset** | |

**Password reset** in the shared file applies: every step-4 result except an
error means the password is already reset.

## Finish after sign-up or reset

Follow **Finish after sign-up or reset** in the shared file. For Android:

- The after-flow state arrives through `SignInAfterSignUpRequired` or
  `SignInAfterResetPasswordRequired`; `signIn()` on it returns `Complete`.
- JIT arrives through `StrongAuthRegistrationRequired`, and MFA (reset only)
  through `MFARequired`.

Which results to handle depends on the row of the shared table:

| V1 app after the flow | Results |
| --- | --- |
| Signs in automatically (`signIn` on `SignInContinuationState`), and handles MFA and registration there | Handle the MFA (reset only) and JIT results, and the after-flow result |
| Signs in automatically, but doesn't handle MFA or registration there | Don't handle them; they reach `else`, which you handle as that row says |
| Doesn't sign in automatically | Handle the after-flow result only to end the flow, and never call `signIn()`. MFA or JIT results end the flow the same way. |

## MFA

Only where the V1 flow handled MFA (`SignInResult.MFARequired`).

| Step | Call | Results handled |
| --- | --- | --- |
| 1. Choose method | `state.selectAuthMethod(method)` on `MFARequiredStateV2` | `MFAVerificationRequired` (challenge sent) |
| 2. Verify | `state.submitChallenge(challenge)` | `Complete` (sign-in); `SignInAfterResetPasswordRequired` (reset) |
| Resend | `state.resendChallenge()` | `MFAVerificationRequired`; `StrongAuthRegistrationRequired` if JIT is handled |

## JIT registration

Only where the V1 flow handled registration
(`SignInResult.StrongAuthMethodRegistrationRequired`).

| Step | Call | Results handled |
| --- | --- | --- |
| 1. Register | `state.selectAuthMethod(method, verificationContact)` | `StrongAuthVerificationRequired` (code sent to the contact) |
| 2. Activate | `state.submitChallenge(challenge)` | `Complete`; the after-flow result for sign-up or reset; MFA if handled |
| Resend | `state.resendChallenge()` | `StrongAuthVerificationRequired` |

- Usable methods are the V1-handled types (email; SMS). The contact is an email
  address or a phone number with its country calling code, as the V1 UI
  collected it; a blank contact is an `isInvalidInput()` error.
- V1's `preverified` shortcut is gone (**Registration and browser required** in
  the shared file).

## Browser required

`error.isBrowserRequired()` at any step: follow **Registration and browser
required** in the shared file. The V1 handling to reuse is its
`isBrowserRequired()` handling.
