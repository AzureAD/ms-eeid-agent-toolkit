# MSAL native auth for Android: V1 → V2 mapping

Names are from the public classes in `com.microsoft.identity.nativeauth`. Use
only public API; never reach into SDK internals (SDKANDROID-03). How each V2
flow runs is in [v2-flows.md](v2-flows.md); errors are in
[v2-errors.md](v2-errors.md). The behavior rules are in
[../shared-rules.md](../shared-rules.md).

## Model differences

| | V1 | V2 |
| --- | --- | --- |
| Start methods | `signIn(parameters)` or `signIn(username, password, scopes)`, `signUp(…)`, `resetPassword(…)` | `signInV2(parameters)`, `signUpV2(parameters)`, `resetPasswordV2(parameters)` (same app instance) |
| API forms | `suspend`, or a per-flow callback (`SignInCallback`, …) | `suspend`, or `NativeAuthPublicClientApplication.NativeAuthV2Callback`; state methods have their own callback interfaces |
| Results | One result interface per step (`SignInResult`, `SignInSubmitCodeResult`, `ResetPasswordStartResult`, …) | One interface for every step: `NativeAuthResultV2`. It isn't sealed, so a `when` needs an `else` |
| States | One class set per flow | Shared `…StateV2` classes used by all flows |
| Retry after a wrong code or password | Call the method again on the state the app kept | The same; an error has no `nextState` |
| Errors | One error class per step | One class, `NativeAuthErrorV2`, for every step. It is a `NativeAuthResultV2`, returned like any other result |
| Password at sign-in or sign-up start | `parameters.password` or the `password` argument | Not accepted; submitted on `PasswordRequiredStateV2` |
| Continuation sign-in | `signIn(scopes)` or `signIn(parameters)` on `SignInContinuationState` | `signIn()` on `SignInAfterSignUpStateV2` / `SignInAfterResetPasswordStateV2`, with no arguments; scopes and claims come from the start call |

Unexpected SDK failures can still reach the callback form's `onError`, or be
thrown from a `suspend` call. Keep the V1 handling of those.

## Inputs

| V1 | V2 |
| --- | --- |
| `NativeAuthSignInParameters(username)`: `password`, `scopes`, `claimsRequest` | `NativeAuthSignInParametersV2(username)`: `scopes`, `claimsRequest`; no `password` |
| `NativeAuthSignUpParameters(username)`: `password`, `attributes`, `scopes`, `claimsRequest` | `NativeAuthSignUpParametersV2(username)`: `attributes`, `scopes`, `claimsRequest`; no `password` |
| `NativeAuthResetPasswordParameters(username)` | `NativeAuthResetPasswordParametersV2(username)`: `scopes`, `claimsRequest` |

- `scopes`: the scopes the V1 code requested for this flow, including the
  ones it passed to the continuation sign-in after sign-up or reset.
- `claimsRequest`: only if the V1 code passed one.
- `attributes`: a `UserAttributes` with the profile attributes the V1 form
  collected before the code. The SDK keeps them and submits them when the
  service first asks for attributes. Never put `email` or `password` in them.
  The flat username (alias) attribute is
  `flatusername` in V1 and `username` in V2: rename the key. It is a
  profile attribute, not the sign-in identifier. `UserAttributes.Builder`'s
  `flatUsername()` still writes `flatusername`, so set it with
  `customAttribute("username", value)`, and match a requested attribute by
  `attributeName == "username"`.
- Passwords stay `CharArray`, as in V1.

## Results and states

Every result below is `NativeAuthResultV2.<name>`. Its next state is
`result.nextState`.

| V1 result | V2 result | Next state and methods |
| --- | --- | --- |
| `SignInResult.PasswordRequired`, `SignUpResult.PasswordRequired` | `PasswordRequired` | `PasswordRequiredStateV2`: `submitPassword(CharArray)` |
| `SignInResult.CodeRequired`, `SignUpResult.CodeRequired`, `ResetPasswordStartResult.CodeRequired` (`codeLength`, `sentTo`, `channel`) | `CodeRequired` (`codeLength`, `sentTo`, `channel`) | `CodeRequiredStateV2`: `submitCode(String)`, `resendCode()` |
| `ResetPasswordSubmitCodeResult.PasswordRequired` | `NewPasswordRequired` | `NewPasswordRequiredStateV2`: `submitNewPassword(CharArray)` |
| `SignUpResult.AttributesRequired` (`requiredAttributes`) | `AttributesRequired` (`requiredAttributes`: `attributeName`, `type`, `required`, `options`) | `AttributesRequiredStateV2`: `submitAttributes(UserAttributes)` |
| `SignInResult.MFARequired` (`authMethods`) | `MFARequired` (`authMethods`) | `MFARequiredStateV2`: `selectAuthMethod(AuthMethod)` |
| — (first-factor method choice) | `AuthMethodSelectionRequired` (`authMethods`) | `AuthMethodSelectionRequiredStateV2`: `selectAuthMethod(AuthMethod)` |
| `MFARequiredResult.VerificationRequired` (`codeLength`, `sentTo`, `channel`) | `MFAVerificationRequired` (`codeLength`, `sentTo`, `channel`) | `MFAVerificationRequiredStateV2`: `submitChallenge(String)`, `resendChallenge()` |
| `SignInResult.StrongAuthMethodRegistrationRequired` (`authMethods`) | `StrongAuthRegistrationRequired` (`authMethods`) | `StrongAuthRegistrationRequiredStateV2`: `selectAuthMethod(AuthMethod, verificationContact)` |
| `RegisterStrongAuthChallengeResult.VerificationRequired` | `StrongAuthVerificationRequired` (`codeLength`, `sentTo`, `channel`) | `StrongAuthVerificationRequiredStateV2`: `submitChallenge(String)`, `resendChallenge()` |
| `SignUpResult.Complete` (`SignInContinuationState`) | `SignInAfterSignUpRequired` | `SignInAfterSignUpStateV2`: `signIn()` |
| `ResetPasswordResult.Complete` (`SignInContinuationState`) | `SignInAfterResetPasswordRequired` | `SignInAfterResetPasswordStateV2`: `signIn()` |
| `SignInResult.Complete` (`resultValue`) | `Complete` (`resultValue`) | `AccountState`, unchanged |
| Every V1 error class | `NativeAuthErrorV2` | Keep the current state where the error is retryable |
| `SignUpError.isUserAlreadyExists()` | `ExistingAccountCodeRequired`, `ExistingAccountPasswordRequired`, or `AuthMethodSelectionRequired` with `scenario == NativeAuthFlowScenarioV2.SIGN_IN` after `signUpV2` | See [v2-flows.md](v2-flows.md), "Existing account" |

`AuthMethod` (`id`, `challengeType`, `loginHint`, `challengeChannel`) is the
same type in V1 and V2. Use only the method objects from the current state's
`authMethods`.

## Errors

| V1 check | V2 check on `NativeAuthErrorV2` |
| --- | --- |
| `SignInError.isUserNotFound()`, `ResetPasswordError.isUserNotFound()` | `isUserNotFound()` |
| `SignInError.isInvalidCredentials()`, `SignInSubmitPasswordError.isInvalidCredentials()` | `isInvalidPassword()` |
| `SignUpError.isInvalidPassword()`, `SignUpSubmitPasswordError.isInvalidPassword()`, `ResetPasswordSubmitPasswordError.isInvalidPassword()` | `isInvalidPassword()` (on the password step) |
| `SubmitCodeError.isInvalidCode()` | `isInvalidCode()` (first-factor codes) |
| `MFASubmitChallengeError.isInvalidChallenge()`, `RegisterStrongAuthSubmitChallengeError.isInvalidChallenge()` | `isInvalidChallenge()` |
| `RegisterStrongAuthChallengeError.isInvalidInput()` | `isInvalidInput()` |
| `SignUpError.isInvalidAttributes()`, `SignUpSubmitAttributesError.isInvalidAttributes()` | `isInvalidAttributes()` |
| `…isInvalidUsername()` | `isInvalidUsername()` (local check only) |
| `SignUpError.isAuthNotSupported()` | `isAuthNotSupported()` |
| `ResetPasswordSubmitPasswordError.isPasswordResetFailed()` | `isPasswordResetFailed()` |
| `isBrowserRequired()` (any V1 error) | `isBrowserRequired()` |
| `SignUpError.isUserAlreadyExists()` | no error; a result (see above) |
| `MFARequestChallengeError.isAuthMethodBlocked()`, `RegisterStrongAuthChallengeError.isVerificationContactBlocked()` | no V2 check → the app's generic error |

Detail and UI rules: [v2-errors.md](v2-errors.md).

## Configuration

- Keep the one `INativeAuthPublicClientApplication` and its raw JSON
  configuration. V1 and V2 calls share the cache and `getCurrentAccount()`.
- **Tenant ID** (**Tenant ID in the service path** in
  [../../flows-and-scope.md](../../flows-and-scope.md)): check the CIAM
  `authority_url` in every JSON configuration the app has (one per build
  variant or flavor, if it has several). A bare host
  (`https://{subdomain}.ciamlogin.com/`) has no tenant ID. The tenant ID goes
  in that URL: `https://{subdomain}.ciamlogin.com/{tenant-id}/`. Don't add a
  separate constant.
- `challenge_types` and `capabilities` are V1 only; V2 doesn't use them. Keep
  them while any flow stays on V1, and leave them in place when every flow is
  on V2: removing them is outside this migration.
- Tokens after V2 sign-in are the same as after V1: `AccountState`
  (`getAccount`, `getAccessToken`, `signOut`). Leave that code unchanged.

## Code-change patterns

- **One flow at a time.** Replace the start call and the result handling of a
  migrated flow; leave deferred flows' V1 code and screens untouched.
- **The `when` is the step list.** Each migrated call branches only on the
  results its table in [v2-flows.md](v2-flows.md) lists, plus `else` for the
  unhandled outcome. Don't add a branch for a step the V1 UI never handled.
- **Shared objects.** If one ViewModel or repository drives flows on different
  versions, keep V1 and V2 states in separate properties. Never pass a V1
  state to V2 code.
- **One-screen forms.** Follow **One-screen forms** in
  [../shared-rules.md](../shared-rules.md).
- **Retry.** Keep the current state in a property; on a retryable error
  (`isInvalidCode()`, `isInvalidPassword()`, `isInvalidChallenge()`), call the
  same method again on it. Clear it when the flow ends.
