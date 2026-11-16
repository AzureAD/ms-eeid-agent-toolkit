---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying these notes.
plan-revision: 1         # always equal to `revision` in plan.md; updated in the same change
---

# Working notes — Contoso sign-in SPA, phase 1

> The assistant's notes for applying `plan.md`. You don't need to review
> them, and please don't edit them: to change the migration, edit the plan
> or tell the assistant, and these notes are updated to match.

## V1 inventory

| File | Lines | Flow | Shared with | V1 usage |
| --- | --- | --- | --- | --- |
| `src/config.js` | 14–33 | all | all flows | `CHALLENGE_TYPES`, V1 `ENDPOINTS` |
| `src/api/nativeAuthClient.js` | 19–35 | all | all flows | form-encoded `postRequest`, `challenge_type: redirect` → `RedirectRequiredError` |
| `src/auth/errors.js` | 14–28 | all | all flows | `user_not_found`, `user_already_exists`, `invalid_grant` + suberrors, AADSTS50126 |
| `src/auth/signIn.js` | 9–74 | sign-in | `signInWithContinuationToken` used by sign-up and sspr | `initiate`, `challenge`, `token` (`password`, `oob`, `continuation_token`) |
| `src/auth/resetPassword.js` | 7–77 | sspr | — | `resetpassword/v1.0/*`, `poll_completion`, `poll_interval` |
| `src/auth/signUp.js` | 7–49 | sign-up | — | `signup/v1.0/*`; signs in through `signInWithContinuationToken` |
| `src/ui/app.js` | 9–50 | all | all flows | keeps the continuation token in memory; `browserRequired` → browser sign-in |
| `cors.js` | 13–15 | all | all flows | allows `POST, OPTIONS` and `Content-Type` only |

## Coexistence

- No flow stays on V1, so the V1 client, V1 config, V1 error mappings, and
  `signInWithContinuationToken` are removed (cleanup step).
- Every flow uses the new V2 client; no flow mixes V1 and V2.
- `src/ui/app.js` doesn't change: each flow function keeps its name,
  parameters, and outcome objects, and the V2 flow state (latest
  continuation token and allowed links) is returned in the outcome's
  `continuationToken` field, where V1 returned its continuation token.

## Supported steps

| Flow | Steps the V1 UI handles | Other V2 steps (unhandled outcome) |
| --- | --- | --- |
| sign-in | password, email OTP; no MFA, no JIT registration | MFA, JIT registration, SMS |
| sign-up | email OTP, password, display name; signs in after sign-up | JIT registration; attributes the form doesn't collect |
| sspr | email OTP; signs in after reset (no MFA handling on that sign-in) | SMS; MFA or registration after the reset → V1's generic error |

## Error mapping

| Flow | V1 error the UI handles | V2 condition | UI message (unchanged unless noted) |
| --- | --- | --- | --- |
| sign-in, sspr | `user_not_found` | `invalidRequest` + `userNotFound` / AADSTS50034 | "The email or password is incorrect." — generic |
| sign-in | `invalid_grant` + AADSTS50126 | `invalidGrant` + `invalidUserNameOrPassword` | "The email or password is incorrect." |
| sign-in, sspr | `invalid_grant` + `invalid_oob_value` | `invalidGrant` + `invalidOneTimeCode` | "That code isn't right…" |
| sign-up, sspr | `invalid_grant` + password suberrors | `invalidRequest` + `passwordTooWeak` (and the other password inner codes); sign-up also `attributeValidationError` with `password` in `attributeIds` | "Choose a stronger password." |
| sign-up | `user_already_exists` | sign-up start returns `action: challenge` | "An account with this email already exists. Sign in instead." |
| sign-up | `attributes_required` | detail `attributeRequired` | "Fill in all required fields." |
| sspr | `poll_completion` `status: failed` | error body from `poll` | "We couldn't reset your password…" |
| sspr | polling limit reached | still `poll` after 10 attempts | "Resetting your password is taking too long…" |
| all | `challenge_type: redirect` | web fallback signals, or any unhandled response | browser sign-in (existing `browserRequired` outcome) |

## Security notes

Known pre-existing concerns seen during inventory: none.
