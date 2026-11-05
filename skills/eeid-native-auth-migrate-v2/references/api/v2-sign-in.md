# V2 sign-in

Read `v2-api-core.md` first: it defines the HAL handler, the link
allowlist, challenge/verify, finishing, and unhandled responses.

## Step table

The table is the complete list of what the migrated code handles. A
response or link not listed for the current step → unhandled response.

| Step | Request | Handled responses | Allowed links |
| --- | --- | --- | --- |
| 1. Entry | Start authorization | 401 with `continuation_token` | `sign_in` (flat) |
| 2. Start | `POST sign_in` `{ continuationToken, username }` | `challenge`, `authenticationFactor: singleFactor`, `_embedded.methods` | each method's `challenge` |
| 3. Challenge | `POST challenge` `{ continuationToken }` | `verify` (`password`, `email`, `sms`); `riskverify` (SMS) | `verify`, `resend` (code types); `riskverify` |
| 4. Risk check (SMS) | `POST riskverify` `{ continuationToken }` | `verify` with `type: sms` | `verify`, `resend` |
| 5. Verify | `POST verify` `{ continuationToken, password }` or `{ continuationToken, otp }` | `state: continue`; `challenge` with `multiFactor` (MFA); `enroll` (JIT) | MFA: each method's `challenge`; JIT: see `v2-jit-registration.md` |
| 6. MFA challenge | `POST challenge` (second-factor method) | `verify` (`email`, `sms`); `riskverify` | `verify`, `resend`; `riskverify` |
| 7. MFA verify | `POST verify` `{ continuationToken, otp }` | `state: continue`; `enroll` (JIT) | JIT: see `v2-jit-registration.md` |
| 8. Finish | Resume authorization → `code` → `/token` | tokens | none |

Resend (steps 3–4 and 6): `POST resend` `{ continuationToken }` and handle
the response like a challenge response.

## Choosing a method

Apply the parity rule (`references/flows-and-scope.md`): only method types
the V1 sign-in UI handled are **usable**.

- Start (step 2):
  - One usable method → challenge it without asking the user.
  - More than one, and the V1 UI let the user choose (for example a "send me
    a code instead" option) → show that choice with the masked `hint`s.
  - More than one, and the V1 UI had no choice → use the first usable type
    in the order of the `challenge_type` list the V1 code sent (for example
    `password oob redirect` → `password`).
  - None usable → unhandled response.
- MFA (step 5 → 6): the same rules, with the V1 MFA UI (V1 `introspect`
  method list). A V1 app that had no MFA handling → unhandled response.
- `enroll` at step 5 or 7: the app's V1 code handled
  `registration_required` → follow `v2-jit-registration.md`. Otherwise →
  unhandled response.

## Example (password, no MFA)

```text
POST sign_in  { "continuationToken": "ct1", "username": "user@contoso.com" }
→ { "continuationToken": "ct2", "state": "interactionRequired", "action": "challenge",
    "challengeContext": { "authenticationFactor": "singleFactor" },
    "_embedded": { "methods": [ { "id": "pwd", "type": "password",
        "_links": { "challenge": { "href": "/{tenant}/api/v2.0/auth/methods/pwd/challenge" } } } ] } }

POST …/pwd/challenge  { "continuationToken": "ct2" }
→ { "continuationToken": "ct3", "state": "interactionRequired", "action": "verify", "type": "password",
    "_links": { "verify": { "href": "/{tenant}/api/v2.0/auth/methods/pwd/verify" } } }

POST …/pwd/verify  { "continuationToken": "ct3", "password": "…" }
→ { "continuationToken": "ct4", "state": "continue", "_links": { "continue": { … } } }
   (don't follow _links.continue; finish with the configured authorize-challenge)
```

## Notes

- Use the same UI path for an unknown username and a wrong password. The
  service returns different codes (`v2-errors.md`); the UI must not show
  the difference (SEC-06).
- Verification isn't idempotent. Never retry verify automatically.
- Errors and their V1 equivalents: `v2-errors.md`.
