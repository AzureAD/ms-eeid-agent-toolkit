# V2 password recovery (SSPR)

Read `v2-api-core.md` first: it defines the HAL handler, the link
allowlist, challenge/verify, finishing, and unhandled responses.

Prerequisites: public client, native auth
enabled, password reset enabled for the tenant.

## Step table

The table is the complete list of what the migrated code handles, in the
order it usually happens. Handle each response by its `state` and `action`
(see "Model" in `v2-api-core.md`): an action this table doesn't list →
unhandled response; a listed action after a different request than shown is
handled the same way. Only the links listed for that action are followed.

| Step | Request | Handled responses | Allowed links |
| --- | --- | --- | --- |
| 1. Entry | Start authorization | 401 with `continuation_token` | `reset_password` (flat) |
| 2. Start | `POST reset_password` `{ continuationToken, username }` | `challenge`, `authenticationFactor: singleFactor`, `email` and/or `sms` methods | each method's `challenge` |
| 3. Challenge | `POST challenge` `{ continuationToken }` | `verify` (`email`, `sms`) | `verify`, `resend` |
| 4. Verify | `POST verify` `{ continuationToken, otp }` | `update` | `update` |
| 5. New password | **`PUT`** `update` `{ continuationToken, newPassword }` | response with a `poll` link | `poll` |
| 6. Poll | `POST poll` `{ continuationToken }` | `poll` (new token and link); `state: continue`; `challenge` with `multiFactor` (MFA after reset); `enroll` | `poll`; for `challenge` and `enroll`, see "Finish" |
| 7. Finish | Resume authorization → `code` → `/token` (only if V1 signed in after reset) | tokens | none |

Resend (step 3): `POST resend` `{ continuationToken }` and handle the
response like a challenge response. A `verify` with `type: password` at
step 3 → unhandled response. Offer it only where the V1 UI offered resend.

## Choosing a method

Apply the parity rule (`references/flows-and-scope.md`): only method types
the V1 reset UI handled are usable (V1 reset used email codes). One usable
method → challenge it without asking. More than one, and the V1 UI offered a
choice → show it with the masked `hint`s. None usable (for example only
`sms` for an email-only V1 app) → unhandled response.

## Polling

- Poll with the token and link from the latest response (`update`, then
  each `poll`).
- Interval and limit: V2 doesn't return a polling interval (V1's
  `poll_interval` has no V2 equivalent).
  - The V1 code uses its own hard-coded interval, attempt limit, or timeout
    → keep those values.
  - The V1 code uses the server's `poll_interval`, or has no setting → wait
    1.5 seconds between polls, at most 5 attempts.
  - Never poll without a delay, even if the V1 value is 0.
- Still `poll` after the last attempt → stop and show the app's existing
  generic reset error. Don't poll forever and don't resubmit the password.
- Replace the token and `poll` link after every poll response.

## Finish

Every step-6 outcome except `poll` means the password **is already reset**.

- `state: continue`:
  - The V1 app signed the user in after reset (`/token` with
    `grant_type=continuation_token`) → finish with tokens
    (`v2-api-core.md`).
  - The V1 app didn't → end the flow the way V1 did (for example "password
    reset, please sign in") and discard the continuation token.
- `challenge` with `multiFactor` (the service wants MFA before signing the
  user in) or `enroll` (it wants a strong-auth method registered). In V1
  these came from the automatic sign-in after the reset (`mfa_required` or
  `registration_required` from `/token`); in V2 the service asks for them
  inside the reset flow. Follow what the V1 app did:

| V1 app after reset | V2 behavior |
| --- | --- |
| Signs in automatically (`/token` with `grant_type=continuation_token`), and that path handles `mfa_required` / `registration_required` | Run the same steps and UI as V2 sign-in: MFA = `v2-sign-in.md` steps 5–6 (pick a method, POST its `challenge` link, POST `verify` with the code); `enroll` = `v2-jit-registration.md`. Then `state: continue` → finish with tokens |
| Signs in automatically, but that path doesn't handle `mfa_required` / `registration_required` | Do what V1 did on that error (its error message, or its web fallback for `challenge_type: redirect`), after the password-reset confirmation |
| Doesn't sign in automatically | End the flow the way V1 did (for example "password reset, please sign in") and discard the continuation token. The user's next sign-in handles MFA or registration. |

Never add a web fallback the V1 app didn't have after a reset: the
password is already changed.

## Notes

- Unknown username: show the same message V1 showed for `user_not_found`
  and report it (SEC-06). Detection: `v2-errors.md`.
- Don't retry the password update automatically.
- V1 → V2 field renames: `new_password` → `newPassword`, `oob` → `otp`,
  `poll_completion` `status` → `poll` / `state: continue`.
- Errors and their V1 equivalents: `v2-errors.md`.
