---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying these notes.
plan-revision: 1         # always equal to `revision` in plan.md; updated in the same change
---

# Working notes — Contoso sign-in Android app (SDK), phase 1

> The assistant's notes for applying `plan.md`. You don't need to review
> them, and please don't edit them: to change the migration, edit the plan
> or tell the assistant, and these notes are updated to match.

## V1 inventory

| File | Lines | Flow | Shared with | V1 usage |
| --- | --- | --- | --- | --- |
| `app/build.gradle` | 20 | all | all flows | `com.microsoft.identity.client:msal:8.7.0` |
| `app/src/main/java/com/contoso/auth/NativeAuthClient.kt` | 8–13 | all | all flows | `createNativeAuthPublicClientApplication` |
| `app/src/main/res/raw/auth_config_native_auth.json` | 1–15 | all | all flows | `authority_url` with the tenant domain; `challenge_types: ["oob", "password"]` |
| `app/src/main/java/com/contoso/auth/SignInRepository.kt` | 1–64 | sign-in | — | `signIn(NativeAuthSignInParameters)` with `password`; `SignInResult.Complete`, `SignInResult.CodeRequired`; `SignInCodeRequiredState`; `SignInError`, `SubmitCodeError` |
| `app/src/main/java/com/contoso/auth/SignUpRepository.kt` | 1–66 | sign-up | — | `signUp(NativeAuthSignUpParameters)` with `password` and `attributes`; `SignUpResult.CodeRequired`, `SignUpResult.Complete`; continuation `signIn(NativeAuthSignInContinuationParameters)`; `SignUpError`, `SubmitCodeError` |
| `app/src/main/java/com/contoso/auth/ResetPasswordRepository.kt` | 1–86 | sspr | — | `resetPassword(NativeAuthResetPasswordParameters)`; `ResetPasswordStartResult.CodeRequired`, `ResetPasswordSubmitCodeResult.PasswordRequired`, `ResetPasswordResult.Complete`; continuation `signIn`; `ResetPasswordError`, `ResetPasswordSubmitPasswordError`, `SubmitCodeError` |
| `app/src/main/java/com/contoso/auth/ui/AuthViewModel.kt` | 14–45 | all | all flows | creates the three repositories and renders `AuthOutcome` |

## Coexistence

- No flow stays on V1, so the V1 parameters, results, states, and error
  checks are removed from the three repositories.
- The configuration JSON's `authority_url` changes to the tenant ID (plan
  section 4); `challenge_types` and the logging settings stay as they are.
- `NativeAuthClient.kt`, `AuthViewModel.kt`, `AuthOutcome.kt`, and
  `AuthMessages.kt` don't change: each repository keeps its functions and
  reports the same `AuthOutcome` values.
- `app/build.gradle` doesn't change: MSAL 8.7.0 is already installed.

## Supported steps

| Flow | Steps the V1 UI handles | Other V2 steps (unhandled outcome) |
| --- | --- | --- |
| sign-in | password (sent with the email), email code; no MFA, no JIT registration | SMS, MFA, JIT registration (more than one usable method: first in V1's order, no choice screen) |
| sign-up | email code, password, display name; signs in after sign-up | attributes the form doesn't collect, JIT registration |
| sspr | email code; signs in after reset (no MFA handling on that sign-in) | SMS; MFA or registration after the reset → V1's generic error |

## Error mapping

| Flow | V1 check the UI handles | V2 check on `NativeAuthErrorV2` | UI message (unchanged unless noted) |
| --- | --- | --- | --- |
| sign-in, sspr | `isUserNotFound()` | `isUserNotFound()` | `INVALID_CREDENTIALS` — generic |
| sign-in | `isInvalidCredentials()` | `isInvalidPassword()` | `INVALID_CREDENTIALS` |
| sign-in, sign-up | `isInvalidUsername()` | `isInvalidUsername()` | `INVALID_USERNAME` |
| all | `isInvalidCode()` | `isInvalidCode()` | `INVALID_CODE`; retry on the same state |
| sign-up, sspr | `isInvalidPassword()` | `isInvalidPassword()` | `INVALID_PASSWORD` |
| sign-up | `isUserAlreadyExists()` | `ExistingAccountCodeRequired`, `ExistingAccountPasswordRequired`, or `AuthMethodSelectionRequired` with the sign-in scenario from `signUpV2` | `USER_ALREADY_EXISTS` |
| all | `isBrowserRequired()` | `isBrowserRequired()` | `BrowserRequired` |
| all | anything else, including `isNotImplemented()` | none of the above | `UNKNOWN` |

## Security notes

Known pre-existing concerns seen during inventory: none.
