# MSAL JS native auth V2 flows

Each table is the complete list of states the migrated code handles at each
step. Any other state, and a state the V1 UI never handled (parity rule in
`references/flows-and-scope.md`), goes to the flow's **unhandled outcome**:
the app's V1 handling of `isRedirectRequired()` if `result.error` is
browser-required, otherwise the app's existing generic error. Discard the
state object either way.

The behavior rules in [../shared-rules.md](../shared-rules.md) apply to every step; this file adds the JavaScript API for them.

`failed` can follow every call; handle it with [v2-errors.md](v2-errors.md).
`completed` carries the signed-in account in `result.data`.

## Common rules

**Flow rules** in the shared file apply. For JavaScript:

- After a call that returns a new state, keep only that state; the previous
  one is spent. A failure returns no new state: see **Retrying and restarting**
  in [v2-errors.md](v2-errors.md).
- Resend: `resendCode()` / `resendChallenge()` return a new state of the same
  type; replace the current one with it.
- **Method selection** is `authMethodSelectionRequired`. Usable types come from
  each method's `type` (match it without regard to case), in the order of the
  V1 `challengeTypes` config. Show `hint`s, and pass the object from `methods`
  to `selectAuthMethod`.

## Sign-in

| Step | Call | Handled states |
| --- | --- | --- |
| 1. Start | `app.signInV2({ username, scopes, claims })` | `passwordRequired`; `codeRequired` (code already sent, single email or SMS method); `authMethodSelectionRequired` (first factor) |
| 2a. Password | `state.submitPassword(password)` | `completed`; `authMethodSelectionRequired` (MFA); `authMethodRegistrationRequired` (JIT) |
| 2b. Method choice | `state.selectAuthMethod(method)` | `codeRequired`; `passwordRequired` |
| 2c. Code | `state.submitCode(code)` | `completed`; `authMethodSelectionRequired` (MFA); `authMethodRegistrationRequired` (JIT) |
| 3. MFA | see **MFA** | `completed` |
| 3. JIT | see **JIT registration** | `completed` |

One-screen V1 sign-in (`signIn({ username, password })`): follow **One-screen
forms** in the shared file. The password is requested by `passwordRequired`.

## Sign-up

| Step | Call | Handled states |
| --- | --- | --- |
| 1. Start | `app.signUpV2({ username, attributes, scopes, claims })` | `codeRequired` (email code sent); existing account: `existingAccountCodeRequired`, `existingAccountPasswordRequired`, `authMethodSelectionRequired` |
| 2. Verify email | `state.submitCode(code)` | `attributesRequired`; `passwordRequired`; `signInContinuation`; `authMethodRegistrationRequired` |
| 3. Attributes (repeats) | `state.submitAttributes(attributes)` | same as step 2 |
| 3. Password | `state.submitPassword(password)` | same as step 2 |
| 4. Finish | see **Finish after sign-up or reset** | |

- **One-screen forms** and **Sign-up attributes** in the shared file apply. The
  password is requested by `passwordRequired`, and attributes by
  `attributesRequired`, which lists them in `attributes`.
- If `attributes` lists `email`, submit the sign-up email (the username already
  verified by the code) automatically; don't ask the user again.
- To render an attribute dynamically, use `label`, `inputType`, `required`, and
  the validation pattern only as a hint, as in `references/api/v2-sign-up.md`.
- `passwordRequired` in sign-up may carry `requestedPasswordAttribute`
  (`label`, `regex`); use them only where the V1 UI used the V1 equivalents.

### Existing account

Follow **Existing account at sign-up** in the shared file. The states are
`existingAccountCodeRequired`, `existingAccountPasswordRequired`, and
`authMethodSelectionRequired`, and the V1 error is `isUserAlreadyExists()`.

## Password reset (SSPR)

| Step | Call | Handled states |
| --- | --- | --- |
| 1. Start | `app.resetPasswordV2({ username, scopes, claims })` | `codeRequired` (code sent); `authMethodSelectionRequired` (first factor) |
| 2. Method choice | `state.selectAuthMethod(method)` | `codeRequired` |
| 3. Code | `state.submitCode(code)` | `newPasswordRequired` |
| 4. New password | `state.submitNewPassword(password)` | `signInContinuation`; `authMethodSelectionRequired` (MFA); `authMethodRegistrationRequired` (JIT) |
| 5. Finish | see **Finish after sign-up or reset** | |

**Password reset** in the shared file applies: every step-4 result except
`failed` means the password is already reset.

## Finish after sign-up or reset

Follow **Finish after sign-up or reset** in the shared file. For JavaScript:

- The after-flow state is `signInContinuation`; `signIn()` on it leads to
  `completed`.
- JIT arrives as `authMethodRegistrationRequired`, and MFA (reset only) as
  `authMethodSelectionRequired`.
- V1's automatic sign-in was `state.signIn(…)` on the completed state, and its
  browser handling was `isRedirectRequired()`.

## MFA

Runs inside sign-in or reset, only where the V1 flow handled MFA.

| Step | Call | Handled states |
| --- | --- | --- |
| 1. Choose method | `state.selectAuthMethod(method)` on `authMethodSelectionRequired` | `mfaVerificationRequired` (challenge sent) |
| 2. Verify | `state.submitChallenge(code)` | `completed`; `signInContinuation` (reset → `signIn()` per **Finish**) |
| Resend | `state.resendChallenge()` | `mfaVerificationRequired` |

## JIT registration

Runs inside sign-in, sign-up, or reset, only where the V1 flow handled
registration (V1 `isAuthMethodRegistrationRequired()`). Otherwise
`authMethodRegistrationRequired` goes to the unhandled outcome (or the
**Finish** table after sign-up or reset).

| Step | Call | Handled states |
| --- | --- | --- |
| 1. Register | `state.selectAuthMethod(method, verificationContact)` on `authMethodRegistrationRequired` | `authMethodVerificationRequired` (code sent to the contact) |
| 2. Activate | `state.submitChallenge(code)` | `completed`; `signInContinuation` |
| Resend | `state.resendChallenge()` | `authMethodVerificationRequired` |

- Usable methods are the V1-handled types (`email`; `phone` with
  `channels` containing `sms`). The contact is an email address or a phone
  number, as the V1 UI collected it.
- V1's `preverified` shortcut is gone (**Registration and browser required**
  in the shared file).

## Browser required

`result.error.isBrowserRequired()` at any step: follow **Registration and
browser required** in the shared file. The V1 handling to reuse is
`isRedirectRequired()`.
