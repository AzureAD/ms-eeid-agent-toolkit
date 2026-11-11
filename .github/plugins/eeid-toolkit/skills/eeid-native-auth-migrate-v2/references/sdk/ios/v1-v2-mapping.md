# MSAL native auth for iOS and macOS: V1 → V2 mapping

Names are from the public MSAL interface (`import MSAL`). Use only public
API; never reach into SDK internals (SDKIOS-03). How each V2 flow runs is in
[v2-flows.md](v2-flows.md); errors are in [v2-errors.md](v2-errors.md).

## Model differences

| | V1 | V2 |
| --- | --- | --- |
| Start methods | `signIn(parameters:delegate:)`, `signUp(…)`, `resetPassword(…)` | `signInV2(parameters:delegate:)`, `signUpV2(…)`, `resetPasswordV2(…)` (same app instance) |
| Delegates | A different protocol per step (`SignInStartDelegate`, `SignInVerifyCodeDelegate`, …), each with its own error callback | One base protocol, `MSALNativeAuthFlowDelegate` (`onFlowCompleted(result:scenario:)`, `onFlowError(error:scenario:)`), plus one opt-in protocol per state; every callback also gets the `scenario` |
| States | One class set per flow | Shared state classes used by all flows |
| A state the app doesn't handle | The optional callback isn't implemented; V1 reports an error | The app doesn't adopt that state's delegate; V2 calls `onFlowError` with `isNotImplemented` |
| Retry after a wrong code or password | The error callback hands back `newState` | No new state: call the method again on the state the app kept |
| Errors | One error class per step | One class, `MSALNativeAuthFlowError`, for every step |
| Password at sign-in or sign-up start | `parameters.password` | Not accepted; submitted on `MSALNativeAuthPasswordRequiredState` |
| Continuation sign-in | `signIn(parameters:delegate:)` on the completed state, with scopes | `signIn(delegate:)` on `MSALNativeAuthSignInAfterSignUpState` / `…AfterResetPasswordState`; scopes come from the start call |

All V2 callbacks run on the main actor.

## Inputs

| V1 | V2 |
| --- | --- |
| `MSALNativeAuthSignInParameters(username:)`: `password`, `scopes`, `claimsRequest`, `correlationId` | `MSALNativeAuthSignInParametersV2(username:)`: `scopes`, `claimsRequest`, `correlationId`; no `password` |
| `MSALNativeAuthSignUpParameters(username:)`: `password`, `attributes`, `correlationId` | `MSALNativeAuthSignUpParametersV2(username:)`: `attributes`, `scopes`, `claimsRequest`, `correlationId`; no `password` |
| `MSALNativeAuthResetPasswordParameters(username:)`: `correlationId` | `MSALNativeAuthResetPasswordParametersV2(username:)`: `scopes`, `claimsRequest`, `correlationId` |

- `scopes`: the scopes the V1 code requested for this flow, including the
  ones it passed to the continuation sign-in after sign-up or reset.
- `claimsRequest`: only if the V1 code passed one.
- `SignUpParametersV2.attributes`: profile attributes the V1 form collected
  before the code. The SDK keeps them and submits them when the service
  first asks for attributes. Never put `email` or `password` in them.

## Delegates, states, and callbacks

| V1 callback and state | V2 delegate protocol → callback | V2 state and continuation |
| --- | --- | --- |
| `onSignInPasswordRequired(newState:)`, `onSignUpPasswordRequired(newState:)` | `MSALNativeAuthPasswordRequiredDelegate` → `onPasswordRequired(state:scenario:)` | `MSALNativeAuthPasswordRequiredState`: `submitPassword(_:delegate:)` |
| `onSignInCodeRequired`, `onSignUpCodeRequired`, `onResetPasswordCodeRequired` (`newState`, `sentTo`, `channelTargetType`, `codeLength`) | `MSALNativeAuthCodeRequiredDelegate` → `onCodeRequired(state:scenario:)` | `MSALNativeAuthCodeRequiredState`: `sentTo`, `channel`, `codeLength`; `submitCode(_:delegate:)`, `resendCode(delegate:)` |
| `onPasswordRequired(newState:)` (reset) | `MSALNativeAuthNewPasswordRequiredDelegate` → `onNewPasswordRequired(state:scenario:)` | `MSALNativeAuthNewPasswordRequiredState`: `submitNewPassword(_:delegate:)` |
| `onSignUpAttributesRequired(attributes:newState:)` | `MSALNativeAuthAttributesRequiredDelegate` → `onAttributesRequired(state:scenario:)` | `MSALNativeAuthAttributesRequiredState`: `attributes` (`name`, `type`, `required`, `regex`); `submitAttributes(_:delegate:)` |
| `onSignInAwaitingMFA(authMethods:newState:)`, `MFARequestChallengeDelegate` | `MSALNativeAuthAuthMethodSelectionRequiredDelegate` → `onAuthMethodSelectionRequired(state:scenario:)` | `MSALNativeAuthAuthMethodSelectionRequiredState`: `authMethods`; `selectAuthMethod(_:delegate:)` |
| `onMFARequestChallengeVerificationRequired`, `MFASubmitChallengeDelegate` | `MSALNativeAuthMFAVerificationRequiredDelegate` → `onMFAVerificationRequired(state:scenario:)` | `MSALNativeAuthMFAVerificationRequiredState`: `sentTo`, `channel`, `codeLength`; `submitChallenge(_:delegate:)`, `resendChallenge(delegate:)` |
| `onSignInStrongAuthMethodRegistration(authMethods:newState:)`, `RegisterStrongAuthChallengeDelegate` | `MSALNativeAuthStrongAuthRegistrationRequiredDelegate` → `onStrongAuthRegistrationRequired(state:scenario:)` | `MSALNativeAuthStrongAuthRegistrationRequiredState`: `authMethods`; `selectAuthMethod(_:verificationContact:delegate:)` |
| `onRegisterStrongAuthVerificationRequired(result:)`, `RegisterStrongAuthSubmitChallengeDelegate` | `MSALNativeAuthStrongAuthVerificationRequiredDelegate` → `onStrongAuthVerificationRequired(state:scenario:)` | `MSALNativeAuthStrongAuthVerificationRequiredState`: `sentTo`, `channel`, `codeLength`; `submitChallenge(_:delegate:)`, `resendChallenge(delegate:)` |
| `onSignUpCompleted(newState: SignInAfterSignUpState)` | `MSALNativeAuthSignInAfterSignUpRequiredDelegate` → `onSignInAfterSignUpRequired(state:scenario:)` | `MSALNativeAuthSignInAfterSignUpState`: `signIn(delegate:)` |
| `onResetPasswordCompleted(newState: SignInAfterResetPasswordState)` | `MSALNativeAuthSignInAfterResetPasswordRequiredDelegate` → `onSignInAfterResetPasswordRequired(state:scenario:)` | `MSALNativeAuthSignInAfterResetPasswordState`: `signIn(delegate:)` |
| `onSignInCompleted(result:)` (every delegate that has it) | `MSALNativeAuthFlowDelegate` → `onFlowCompleted(result:scenario:)` | `MSALNativeAuthUserAccountResult`, unchanged |
| Every V1 error callback | `MSALNativeAuthFlowDelegate` → `onFlowError(error:scenario:)` | `MSALNativeAuthFlowError` |
| `SignUpStartError.isUserAlreadyExists` | `MSALNativeAuthExistingAccountCodeRequiredDelegate`, `MSALNativeAuthExistingAccountPasswordRequiredDelegate`, or `onAuthMethodSelectionRequired` with `scenario == .signIn` after `signUpV2` | See [v2-flows.md](v2-flows.md), "Existing account" |
| `onSignUpAttributesInvalid(attributeNames:)` | `onFlowError` with `isInvalidAttributes` (names appear only in `errorDescription`) | — |

`MSALAuthMethod` (`id`, `challengeType`, `channelTargetType`, `loginHint`)
and `MSALNativeAuthChannelType` (`isEmailType`, `isSMSType`) are the same
types in V1 and V2. Use only the method objects from the current state's
`authMethods`.

## Errors

| V1 check | V2 check on `MSALNativeAuthFlowError` |
| --- | --- |
| `SignInStartError.isUserNotFound`, `ResetPasswordStartError.isUserNotFound` | `isUserNotFound` |
| `SignInStartError.isInvalidCredentials`, `PasswordRequiredError.isInvalidPassword` (sign-in) | `isInvalidPassword` |
| `SignUpStartError.isInvalidPassword`, `PasswordRequiredError.isInvalidPassword` (sign-up, reset) | `isInvalidPassword` (on the password step) |
| `VerifyCodeError.isInvalidCode` | `isInvalidCode` (first-factor codes) |
| `MFASubmitChallengeError.isInvalidChallenge`, `RegisterStrongAuthSubmitChallengeError.isInvalidChallenge` | `isInvalidChallenge` |
| `RegisterStrongAuthChallengeError.isInvalidInput` | `isInvalidInput` |
| `…isInvalidUsername` | `isInvalidUsername` (local check only) |
| `isBrowserRequired` (any V1 error) | `isBrowserRequired` |
| `SignUpStartError.isUserAlreadyExists` | no error; a state (see above) |
| `ResetPasswordStartError.isUserDoesNotHavePassword`, `MFARequestChallengeError.isAuthMethodBlocked`, `RegisterStrongAuthChallengeError.isVerificationContactBlocked`, `RetrieveAccessTokenError` checks | no V2 flow check → the app's generic error (token errors are unchanged: token code isn't migrated) |

Detail and UI rules: [v2-errors.md](v2-errors.md).

## Configuration

- Keep the one `MSALNativeAuthPublicClientApplicationConfig` and app
  instance. V1 and V2 calls share the cache and
  `getNativeAuthUserAccount()`.
- `challengeTypes` and `capabilities` are V1 only; V2 ignores them. Keep
  them while any flow stays on V1. The initializer still needs
  `challengeTypes`, so leave it as it is even when every flow is on V2.
- `requestInterceptor`, the tenant, client ID, and redirect URI apply to
  V2 too.
- Tokens after V2 sign-in are the same as after V1:
  `MSALNativeAuthUserAccountResult` (`account`, `getAccessToken`,
  `signOut()`). Leave that code unchanged.

## Code-change patterns

- **One flow at a time.** Replace the start call and the delegate handling
  of a migrated flow; leave deferred flows' V1 delegates and screens
  untouched.
- **Delegate conformance is the step list.** The object driving a migrated
  flow adopts `MSALNativeAuthFlowDelegate` and exactly the per-state
  delegates its table in [v2-flows.md](v2-flows.md) lists. Don't adopt a
  delegate for a step the V1 UI never handled.
- **Shared objects.** If one view controller or view model drives flows on
  different versions, it can conform to both V1 and V2 protocols; keep V1
  and V2 states in separate properties, and use `scenario` plus the flow
  the app started to route V2 callbacks. Never pass a V1 state to V2 code.
- **One-screen forms.** Follow **One-screen forms** in
  [../shared-rules.md](../shared-rules.md).
- **Retry.** Keep the current state in a property; on a retryable error
  (`isInvalidCode`, `isInvalidPassword`, `isInvalidChallenge`), call the
  same method again on it. Clear it when the flow ends.
