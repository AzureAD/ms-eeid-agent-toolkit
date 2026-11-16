# MSAL native auth V2 errors on Android

Every V2 failure is returned as one `NativeAuthErrorV2`, which is a
`NativeAuthResultV2`. Branch only on its checks, never on `errorMessage` text.
**Errors** in [../shared-rules.md](../shared-rules.md) has the rules for
retrying and showing errors.

## Checks

| Check | Means | UI (keep the V1 message for the matching V1 check) |
| --- | --- | --- |
| `isBrowserRequired()` | The service wants the browser | The V1 `isBrowserRequired()` handling; otherwise the generic error |
| `isUserNotFound()` | No account for the username (sign-in, reset) | V1 `isUserNotFound()` message and screen; report it (SEC-06) |
| `isInvalidPassword()` | Wrong password at sign-in, or a password that fails policy at sign-up or reset | Sign-in: V1 `isInvalidCredentials()` message. Sign-up and reset: V1 password-policy message. Retry on the same state |
| `isInvalidCode()` | Wrong or expired first-factor code (sign-in, sign-up email, reset) | V1 `isInvalidCode()` message; retry or resend on the same state |
| `isInvalidChallenge()` | Wrong or expired MFA or registration code | V1 MFA / registration code message; retry or resend |
| `isInvalidAttributes()`, `isMissingRequiredAttributes()` | The service rejected attributes, or required ones are missing (no attribute-name list to rely on) | V1 attribute-validation message |
| `isInvalidInput()` | Registration input was invalid (unoffered method, blank contact) | V1 `isInvalidInput()` message |
| `isInvalidUsername()` | The SDK's local check rejected the username | V1 invalid-username message |
| `isAuthNotSupported()` | The requested authentication mechanism isn't supported | V1 `isAuthNotSupported()` handling; otherwise the generic error |
| `isPasswordResetFailed()` | The reset failed after the new password was sent | V1 `isPasswordResetFailed()` handling; otherwise the generic error |
| `isNotImplemented()` | The SDK doesn't implement this step | Generic error; the step isn't supported |
| `isGeneralError()`, or none of the above | Expired flow, locked account, wrong state, an account already signed in, service or network error | The fallback the V1 code has for that call; see **Retrying and restarting** |

Report any SEC-06 disclosure V1 already has as pre-existing.

## Retrying and restarting

Follow **Errors** in the shared file. The error doesn't carry a new state, so a
retry or resend uses the state the app kept.

An account that is already signed in comes back as an error result. Keep any
`getCurrentAccount()` check the V1 code makes before starting a flow.

## Showing errors

Follow **Errors** in the shared file. The error's description is
`errorMessage`. Never log states, parameters, passwords, codes, or the error's
message together with user input (SEC-01).

## V1 checks with no V2 equivalent

`MFARequestChallengeError.isAuthMethodBlocked()` and
`RegisterStrongAuthChallengeError.isVerificationContactBlocked()` have no V2
check; handle them as **Errors** in the shared file says.
`SignUpError.isUserAlreadyExists()` isn't an error in V2; see
[v2-flows.md](v2-flows.md), "Existing account".
