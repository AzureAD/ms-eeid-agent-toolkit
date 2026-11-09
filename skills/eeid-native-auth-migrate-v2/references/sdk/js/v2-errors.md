# MSAL JS native auth V2 errors

A failed V2 call returns a result with `isFailed()` true and
`result.error`, an `AuthFlowErrorV2`. Every flow and step uses this one
class. Branch only on its checks and codes, never on message text. **Errors**
in [../shared-rules.md](../shared-rules.md) has the rules for retrying and showing errors.

## Checks

| Check | Means | UI (keep the V1 message for the matching V1 check) |
| --- | --- | --- |
| `isBrowserRequired()` | The service wants the browser (`invalid_grant` + `web_redirect_required`) | The V1 `isRedirectRequired()` handling; otherwise the generic error |
| `isUserNotFound()` | No account for the username (sign-in, reset) | V1 `isUserNotFound()` message and screen; report it (SEC-06) |
| `isInvalidPassword()` | Wrong password at sign-in, or a password that fails policy at sign-up or reset (including an attribute check on `password`) | Sign-in: V1 `isPasswordIncorrect()` message. Sign-up and reset: V1 password-policy message. The user may retry on the same state |
| `isInvalidCode()` | Wrong or expired first-factor code (sign-in, sign-up email, reset) | V1 `isInvalidCode()` message; the user may retry or resend |
| `isInvalidChallenge()` | Wrong or expired MFA or registration code | V1 MFA / registration code message; retry or resend |
| `isInvalidAttributes()`, `invalidAttributes` | The service rejected these non-password attributes | Mark those fields, as V1 `isAttributesValidationFailed()` |
| `requiredAttributes` | The service wants these attributes | As V1 `isMissingRequiredAttributes()` |
| `isInvalidUsername()` | The SDK's local check rejected the username (empty) | V1 invalid-username message |
| `isInvalidInput()` | Any argument failed the SDK's local check | Generic error; this is a code bug, not a user error |
| none of the above | Expired flow, locked account, wrong state, service or network error | The fallback the V1 code has for that call (its generic message, or the `errorDescription` it showed); see **Retrying and restarting** |

`isInvalidCode()` is false for MFA and registration codes, and
`isInvalidChallenge()` is false for first-factor codes. Use the one that
matches the step.

## Retrying and restarting

Follow **Errors** in the shared file. A retry stays on the **same state
object**; the SDK accepts a new attempt on it.

## Showing errors

Follow **Errors** in the shared file. Never show `innerErrorCode`, and report
existing disclosure rather than fixing it. Don't log the error object as a
whole, and never log the state or result objects (SEC-01, SDKJS-02).

## V1 checks with no V2 equivalent

`isPasswordResetRequired()`, `isTokenExpired()`,
`isUnsupportedChallengeType()`, `isPasswordResetFailed()`, and
`isVerificationContactBlocked()` have no V2 check; handle them as **Errors** in
the shared file says. `isUserAlreadyExists()` isn't an error in V2; see
[v2-flows.md](v2-flows.md), "Existing account".
