---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying these notes.
plan-revision: 1         # always equal to `revision` in plan.md; updated in the same change
---

# Working notes — Contoso sign-in iOS app (SDK), phase 1

> The assistant's notes for applying `plan.md`. You don't need to review
> them, and please don't edit them: to change the migration, edit the plan
> or tell the assistant, and these notes are updated to match.

## V1 inventory

| File | Lines | Flow | Shared with | V1 usage |
| --- | --- | --- | --- | --- |
| `Podfile` | 5 | all | all flows | `pod 'MSAL', '~> 2.16'` |
| `ContosoAuth/Auth/NativeAuthClient.swift` | 6–11 | all | all flows | `MSALNativeAuthPublicClientApplicationConfig`, `challengeTypes` |
| `ContosoAuth/Auth/SignInCoordinator.swift` | 1–90 | sign-in | — | `signIn(parameters:delegate:)` with `parameters.password`; `SignInStartDelegate`, `SignInVerifyCodeDelegate`, `SignInResendCodeDelegate`; `SignInCodeRequiredState` |
| `ContosoAuth/Auth/SignUpCoordinator.swift` | 1–82 | sign-up | — | `signUp(parameters:delegate:)` with `parameters.password` and `attributes`; `SignUpStartDelegate`, `SignUpVerifyCodeDelegate`, `SignInAfterSignUpDelegate` |
| `ContosoAuth/Auth/ResetPasswordCoordinator.swift` | 1–99 | sspr | — | `resetPassword(parameters:delegate:)`; `ResetPasswordStartDelegate`, `ResetPasswordVerifyCodeDelegate`, `ResetPasswordRequiredDelegate`, `SignInAfterResetPasswordDelegate` |
| `ContosoAuth/UI/AuthViewController.swift` | 15–19 | all | all flows | creates the three coordinators and renders `AuthOutcome` |

## Coexistence

- No flow stays on V1, so the V1 parameters, delegates, states, and error
  checks are removed from the three coordinators.
- `ContosoAuth/Auth/NativeAuthClient.swift` doesn't change: the one app
  instance stays, and its initializer still needs `challengeTypes`.
- `ContosoAuth/UI/AuthViewController.swift`, `AuthOutcome.swift`, and
  `AuthMessages.swift` don't change: each coordinator keeps its methods and
  reports the same `AuthOutcome` values.
- `Podfile.lock` is updated by `pod update MSAL` in the SDK step.

## Supported steps

| Flow | Steps the V1 UI handles | Other V2 steps (unhandled outcome) |
| --- | --- | --- |
| sign-in | password (sent with the email), email code; no MFA, no JIT registration | SMS, MFA, JIT registration (more than one usable method: first in V1's order, no choice screen) |
| sign-up | email code, password, display name; signs in after sign-up | attributes the form doesn't collect, JIT registration |
| sspr | email code; signs in after reset (no MFA handling on that sign-in) | SMS; MFA or registration after the reset → V1's generic error |

## Error mapping

| Flow | V1 check the UI handles | V2 check on `MSALNativeAuthFlowError` | UI message (unchanged unless noted) |
| --- | --- | --- | --- |
| sign-in, sspr | `isUserNotFound` | `isUserNotFound` | `.invalidCredentials` — generic |
| sign-in | `isInvalidCredentials` | `isInvalidPassword` | `.invalidCredentials` |
| sign-in, sign-up | `isInvalidUsername` | `isInvalidUsername` | `.invalidUsername` |
| all | `isInvalidCode` | `isInvalidCode` | `.invalidCode`; retry on the same state |
| sign-up, sspr | `isInvalidPassword` | `isInvalidPassword` | `.invalidPassword` |
| sign-up | `isUserAlreadyExists` | `onExistingAccountCodeRequired`, `onExistingAccountPasswordRequired`, or `onAuthMethodSelectionRequired` with `scenario == .signIn` from `signUpV2` | `.userAlreadyExists` |
| all | `isBrowserRequired` | `isBrowserRequired` | `.browserRequired` |
| all | anything else, including `isNotImplemented` | none of the above | `.unknown` |

## Security notes

Known pre-existing concerns seen during inventory: none.
