# MSAL native auth V2 errors on iOS and macOS

Every V2 failure arrives in `onFlowError(error:scenario:)` as one
`MSALNativeAuthFlowError`. Branch only on its checks, never on
`errorDescription` text. **Errors** in [../shared-rules.md](../shared-rules.md)
has the rules for retrying and showing errors.

## Checks

| Check | Means | UI (keep the V1 message for the matching V1 check) |
| --- | --- | --- |
| `isBrowserRequired` | The service wants the browser | The V1 `isBrowserRequired` handling; otherwise the generic error |
| `isUserNotFound` | No account for the username (sign-in, reset) | V1 `isUserNotFound` message and screen; report it (SEC-06) |
| `isInvalidPassword` | Wrong password at sign-in, or a password that fails policy at sign-up or reset | Sign-in: V1 `isInvalidCredentials` / wrong-password message. Sign-up and reset: V1 password-policy message. Retry on the same state |
| `isInvalidCode` | Wrong or expired first-factor code (sign-in, sign-up email, reset) | V1 `isInvalidCode` message; retry or resend on the same state |
| `isInvalidChallenge` | Wrong or expired MFA or registration code | V1 MFA / registration code message; retry or resend |
| `isInvalidAttributes` | The service rejected non-password attributes (names appear only in `errorDescription`; don't parse it) | V1 attribute-validation message |
| `isInvalidInput` | Registration input was invalid (unoffered method, blank contact) | V1 `RegisterStrongAuthChallengeError.isInvalidInput` message |
| `isInvalidUsername` | The SDK's local check rejected the username | V1 invalid-username message |
| `isNotImplemented` | The service asked for a step whose delegate the app didn't adopt | Generic error; the step isn't supported (parity) |
| `isGeneralError`, or none of the above | Expired flow, locked account, wrong state, service or network error | The fallback the V1 code has for that call (its generic message, or the `errorDescription` it showed); see **Retrying and restarting** |

Report any SEC-06 disclosure V1 already has as pre-existing.

## Retrying and restarting

Follow **Errors** in the shared file. The error doesn't carry a new state, so a
retry or resend uses the state the app kept.

## Showing errors

Follow **Errors** in the shared file. Never log states, parameters, passwords,
codes, or the error's description together with user input (SEC-01).

## V1 checks with no V2 equivalent

`ResetPasswordStartError.isUserDoesNotHavePassword`,
`MFARequestChallengeError.isAuthMethodBlocked`, and
`RegisterStrongAuthChallengeError.isVerificationContactBlocked` have no V2
check; handle them as **Errors** in the shared file says.
`SignUpStartError.isUserAlreadyExists` isn't an error in V2; see
[v2-flows.md](v2-flows.md), "Existing account".
