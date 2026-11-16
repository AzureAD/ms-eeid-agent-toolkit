# MSAL JS native auth: V1 → V2 mapping

Names are from the public exports of `@azure/msal-browser/custom-auth`
(written against 5.29.0). Use only public exports; never read or set SDK internals (SDKJS-03).
How each V2 flow runs is in [v2-flows.md](v2-flows.md); errors are in
[v2-errors.md](v2-errors.md).

## Model differences

| | V1 | V2 |
| --- | --- | --- |
| Start methods | `signIn`, `signUp`, `resetPassword` | `signInV2`, `signUpV2`, `resetPasswordV2` (same app instance) |
| Result | One result class per call, with `isCodeRequired()`, `isCompleted()`, … | One generic `CustomAuthResultV2`: `isState("<stateType>")`, `isFailed()`, `isPasswordRequired()`; `state`, `data` (account when completed), `error` |
| States | One class set per flow (`SignIn…State`, `SignUp…State`, `ResetPassword…State`) | Shared state classes used by all flows, told apart by `stateType` |
| Errors | One error class per call, with flow-specific checks | One error class, `AuthFlowErrorV2`, for every call |
| Method choice | The SDK chose the challenge from `challengeTypes` | The service returns methods; with more than one, the app shows the choice (`authMethodSelectionRequired`) |
| Password at sign-in start | `signIn({ username, password })` | Not accepted: `signInV2({ username })`, then `submitPassword` on `passwordRequired` |
| Sign-up order | Password and attributes at start or after the code | Email first; password and attributes only after the code |
| Continuation sign-in | `state.signIn({ scopes?, claims? })` on the completed state | `signInContinuation` state, `signIn()` with no parameters; scopes come from the start call |

V2 results never throw for flow errors: a failure comes back as
`result.isFailed()` with `result.error`. Keep the V1 code's own
`try`/`catch` for unexpected exceptions.

## Inputs

| V1 | V2 |
| --- | --- |
| `SignInInputs { username, password?, scopes?, claims?, correlationId? }` | `SignInInputsV2 { username, scopes?, claims?, correlationId? }`, no `password` |
| `SignUpInputs { username, password?, attributes?, correlationId? }` | `SignUpInputsV2 { username, attributes?, scopes?, claims?, correlationId? }`, no `password` |
| `ResetPasswordInputs { username, correlationId? }` | `ResetPasswordInputsV2 { username, scopes?, claims?, correlationId? }` |

- `scopes`: the scopes the V1 code requested for this flow, including the
  ones it passed to the continuation `signIn(…)` after sign-up or reset.
  The SDK adds the required OpenID scopes itself.
- `claims`: a JSON string, passed only if the V1 code passed claims.
- `SignUpInputsV2.attributes`: profile attributes the V1 form collected
  before the code. The SDK keeps them in memory and submits them when the
  service first asks for attributes. Never put `email` or `password` in
  them; the SDK drops those names with a warning. The flat username (alias) attribute is
  `flatusername` in V1 and `username` in V2: rename the key. It is a
  profile attribute, not the sign-in identifier.

## States and getters

| V1 | V2 `stateType` | V2 class |
| --- | --- | --- |
| `SignInPasswordRequiredState`, `SignUpPasswordRequiredState` | `passwordRequired` | `PasswordRequiredStateV2` (`submitPassword`, `requestedPasswordAttribute` in sign-up) |
| `SignInCodeRequiredState`, `SignUpCodeRequiredState`, `ResetPasswordCodeRequiredState` | `codeRequired` | `CodeRequiredStateV2` (`submitCode`, `resendCode`) |
| `ResetPasswordPasswordRequiredState` (`submitNewPassword`) | `newPasswordRequired` | `NewPasswordRequiredStateV2` (`submitNewPassword`) |
| `SignUpAttributesRequiredState` (`submitAttributes`) | `attributesRequired` | `AttributesRequiredStateV2` (`submitAttributes`, `attributes`) |
| `MfaAwaitingState` (`getAuthMethods()`, `requestChallenge(authMethodId)`) | `authMethodSelectionRequired` | `AuthMethodSelectionRequiredStateV2` (`methods`, `selectAuthMethod(method)`) |
| `MfaVerificationRequiredState` (`submitChallenge`) | `mfaVerificationRequired` | `MFAVerificationRequiredStateV2` (`submitChallenge`, `resendChallenge`) |
| `AuthMethodRegistrationRequiredState` (`getAuthMethods()`, `challengeAuthMethod({ authMethodType, verificationContact })`) | `authMethodRegistrationRequired` | `AuthMethodRegistrationRequiredStateV2` (`methods`, `selectAuthMethod(method, verificationContact)`) |
| `AuthMethodVerificationRequiredState` (`submitChallenge`) | `authMethodVerificationRequired` | `AuthMethodVerificationRequiredStateV2` (`submitChallenge`, `resendChallenge`, `type`, `sentTo`, `codeLength`) |
| `SignUpCompletedState`, `ResetPasswordCompletedState` (`signIn(…)`) | `signInContinuation` | `SignInContinuationStateV2` (`signIn()`) |
| `SignInCompletedState`, `MfaCompletedState`, `AuthMethodRegistrationCompletedState` | `completed` | `CompletedStateV2`; the account is `result.data` |
| `…FailedState` | `failed` | `FailedStateV2`; the error is `result.error` |
| `SignUpError.isUserAlreadyExists()` | `existingAccountCodeRequired`, `existingAccountPasswordRequired`, or `authMethodSelectionRequired` from `signUpV2` | See [v2-flows.md](v2-flows.md), "Existing account" |

| V1 getter | V2 |
| --- | --- |
| `getSentTo()` | `sentTo` (may be `undefined`) |
| `getCodeLength()` | `codeLength` (`0` = unknown → don't restrict the input length) |
| `getChannel()` | `channel` (code states); `type` (registration verification) |
| `getRequiredAttributes()` | `attributes` (`SignUpAttributeV2`: `attributeId`, `inputType`, `required`, `canChange`, `label`, `regex`, `confirmationInput`) |
| `getAuthMethods()` (`AuthenticationMethod`) | `methods`: `AuthenticationMethodV2` (`id`, `type`, `hint`) for selection, `AuthenticationMethodRegistrationV2` (`type`, `channels`) for registration |
| `getCodeResendInterval()` | none; keep the V1 UI's own resend timer, or none if it used this value |
| `getScopes()` | none; scopes are fixed at the start call |

Narrow a result with `result.isState("…")`, `result.isFailed()`, or
`result.isPasswordRequired()`. `instanceof` checks on the V2 classes also
work; use one style per file, following the code around it.

## Errors

| V1 check | V2 check on `result.error` (`AuthFlowErrorV2`) |
| --- | --- |
| `isUserNotFound()` | `isUserNotFound()` |
| `isPasswordIncorrect()` | `isInvalidPassword()` at sign-in |
| `isInvalidPassword()` (sign-up, reset) | `isInvalidPassword()` |
| `isInvalidCode()` | `isInvalidCode()` (first-factor codes only) |
| `MfaSubmitChallengeError.isIncorrectChallenge()`, `AuthMethodRegistrationSubmitChallengeError` | `isInvalidChallenge()` (MFA and registration codes) |
| `isInvalidUsername()` | `isInvalidUsername()` (only the SDK's local check of the username) |
| `isMissingRequiredAttributes()` | `requiredAttributes` (non-empty) |
| `isAttributesValidationFailed()` | `isInvalidAttributes()`, `invalidAttributes` |
| `isUserAlreadyExists()` | no error; a state (see above) |
| `isRedirectRequired()` | `isBrowserRequired()` |
| `isPasswordResetRequired()`, `isTokenExpired()`, `isUnsupportedChallengeType()`, `isPasswordResetFailed()`, `isVerificationContactBlocked()` | no V2 check → the V1 fallback for that call |
| `UserAlreadySignedInError` from a start call | same: V2 start calls also fail while a user is signed in |

Detail and UI rules: [v2-errors.md](v2-errors.md).

## Configuration

- Keep the one `CustomAuthConfiguration` and app instance. V1 and V2 calls
  share the cache and `getCurrentAccount()`.
- `auth.authority`, `auth.clientId`, `customAuth.authApiProxyUrl`,
  `customAuth.requestInterceptor`, `customAuth.customAuthApiQueryParams`,
  `cache`, and `system` apply to V2 too.
- **Tenant ID** (**Tenant ID in the service path** in
  [../../flows-and-scope.md](../../flows-and-scope.md)): the SDK sends every
  request to `authApiProxyUrl`, so the service sees the proxy's target, not
  `auth.authority`. Check the target of the dev proxy in the repo; if it
  isn't the tenant ID, change it there, set the way the proxy sets it today
  (for example the tenant value in `proxy.config.js`, or the target path in
  `cors.js`). Leave `auth.authority` as it is. The repo's proxy is usually
  only for local testing, so always add the "Risks and actions for you"
  item for the proxy or gateway the app uses outside local development.
- `customAuth.challengeTypes` and `customAuth.capabilities` are V1 only. V2
  ignores them. Keep them while any flow stays on V1; when every flow is on
  V2, the plan may remove them (record it as a cleanup step, not required).
  `authApiProxyUrl` stays required.
- Tokens after V2 sign-in are the same as after V1: `CustomAuthAccountData`
  (`getAccount()`, `getIdToken()`, `getClaims()`, `getAccessToken(…)`,
  `signOut()`). Leave that code unchanged.

## Proxy

V2 calls go through the same `authApiProxyUrl`. Compared with V1 they add:

- `POST …/oauth2/v2.0/authorize-challenge` and JSON calls to paths under
  `…/api/…` that the service returns, appended to the proxy URL's path.
- `PUT` (password reset) and `Content-Type: application/json`.

Check that the proxy forwards every path under its local prefix to the
tenant host (not an allowlist of V1 paths) and allows `PUT` and the same
headers as V1 (`client-request-id`, `x-client-*`, and any `x-` headers a
`requestInterceptor` adds). Change only what is missing (SDKJS-05).

## Code-change patterns

- **One flow at a time.** Replace the start call and the state handling of
  a migrated flow; leave deferred flows' V1 code, imports, and components
  untouched.
- **Shared components.** A code-entry or MFA component used by flows on
  different versions takes the state object and branches on its class, or
  is split in two, as the plan says. Never pass a V1 state to V2 code or the
  reverse.
- **One-screen forms.** Follow **One-screen forms** in
  [../shared-rules.md](../shared-rules.md).
- **State handling.** Each handler accepts only the states the flow's table
  in [v2-flows.md](v2-flows.md) lists for that step and sends every other
  state to the unhandled outcome; no `default` branch that continues the
  flow.
- **Imports.** Import V2 names from `@azure/msal-browser/custom-auth`, the
  same entry point as V1.
