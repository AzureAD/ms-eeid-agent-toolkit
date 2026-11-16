---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying these notes.
plan-revision: 1         # always equal to `revision` in plan.md; updated in the same change
---

# Working notes — Contoso sign-in SPA (SDK), phase 1

> The assistant's notes for applying `plan.md`. You don't need to review
> them, and please don't edit them: to change the migration, edit the plan
> or tell the assistant, and these notes are updated to match.

## V1 inventory

| File | Lines | Flow | Shared with | V1 usage |
| --- | --- | --- | --- | --- |
| `package.json` | 11–13 | all | all flows | `@azure/msal-browser` `^5.20.0` |
| `src/config.js` | 2–20 | all | all flows | `customAuth.challengeTypes`, `authApiProxyUrl` |
| `src/auth/msalApp.js` | 1–11 | all | all flows | `CustomAuthPublicClientApplication.create` |
| `src/auth/errors.js` | 1–22 | all | all flows | `isRedirectRequired`, `isUserNotFound`, `isPasswordIncorrect`, `isInvalidCode`, `isUserAlreadyExists`, `isInvalidPassword`, `isMissingRequiredAttributes`, `isAttributesValidationFailed`, `isTokenExpired` |
| `src/auth/signIn.js` | 1–30 | sign-in | `toSignInOutcome` used by sign-up and sspr | `app.signIn({ username, password, scopes })`, `submitCode`, `isCompleted`, `isCodeRequired`, `getSentTo`, `getCodeLength` |
| `src/auth/signUp.js` | 1–32 | sign-up | — | `app.signUp({ username, password, attributes })`, `submitCode`, completed `state.signIn({ scopes })` |
| `src/auth/resetPassword.js` | 1–40 | sspr | — | `app.resetPassword`, `submitCode`, `submitNewPassword`, completed `state.signIn({ scopes })` |
| `src/ui/app.js` | 10–70 | all | all flows | keeps the SDK state object in memory; `browserRequired` → browser sign-in |
| `cors.js` | 14–25 | all | all flows | allows `POST, OPTIONS` only |

## Coexistence

- No flow stays on V1, so the V1 start calls, V1 result checks, and V1
  error checks are removed, and `customAuth.challengeTypes` is removed from
  the config (cleanup; V2 ignores it).
- The one app instance from `src/auth/msalApp.js` stays; every flow calls its
  V2 method.
- `src/ui/app.js` doesn't change: each flow function keeps its name,
  parameters, and outcome objects, and the V2 state object is returned in
  the outcome's `state` field, where V1 returned its state object.
- `src/auth/account.js` doesn't change: tokens and sign-out work the same
  after V2 sign-in.

## Supported steps

| Flow | Steps the V1 UI handles | Other V2 steps (unhandled outcome) |
| --- | --- | --- |
| sign-in | password (sent with the email), email OTP; no MFA, no JIT registration | SMS, MFA, JIT registration (more than one usable method: first in V1's order, no choice screen) |
| sign-up | email OTP, password, display name; signs in after sign-up | attributes the form doesn't collect, JIT registration, MFA |
| sspr | email OTP; signs in after reset (no MFA handling on that sign-in) | SMS; MFA or registration after the reset → V1's generic error |

## Error mapping

| Flow | V1 check the UI handles | V2 check | UI message (unchanged unless noted) |
| --- | --- | --- | --- |
| sign-in, sspr | `isUserNotFound()` | `isUserNotFound()` | "The email or password is incorrect." — generic |
| sign-in | `isPasswordIncorrect()` | `isInvalidPassword()` | "The email or password is incorrect." |
| all | `isInvalidCode()` | `isInvalidCode()` | "That code isn't right…" |
| sign-up, sspr | `isInvalidPassword()` | `isInvalidPassword()` | "Choose a stronger password." |
| sign-up | `isUserAlreadyExists()` | `existingAccountCodeRequired`, `existingAccountPasswordRequired`, or `authMethodSelectionRequired` from `signUpV2` | "An account with this email already exists. Sign in instead." |
| sign-up | `isMissingRequiredAttributes()`, `isAttributesValidationFailed()` | `requiredAttributes`, `isInvalidAttributes()` | "Fill in all required fields." |
| all | `isTokenExpired()` | none | generic error (behavior change) |
| all | `isRedirectRequired()` | `isBrowserRequired()` | browser sign-in (existing `browserRequired` outcome) |

## Security notes

Known pre-existing concerns seen during inventory: none.
