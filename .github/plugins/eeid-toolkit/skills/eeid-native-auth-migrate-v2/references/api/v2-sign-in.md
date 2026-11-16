# V2 sign-in

Read `v2-api-core.md` first: it defines the HAL handler, the link
allowlist, challenge/verify, finishing, and unhandled responses.

## Step table

The table is the complete list of what the migrated code handles, in the
order it usually happens. Handle each response by its `state` and `action`
(see "Model" in `v2-api-core.md`): an action this table doesn't list →
unhandled response; a listed action after a different request than shown is
handled the same way. Only the links listed for that action are followed.

| Step | Request | Handled responses | Allowed links |
| --- | --- | --- | --- |
| 1. Entry | Start authorization | 401 with `continuation_token` | `sign_in` (flat) |
| 2. Start | `POST sign_in` `{ continuationToken, username }` | `challenge`, `authenticationFactor: singleFactor`, `_embedded.methods` | each method's `challenge` |
| 3. Challenge | `POST challenge` `{ continuationToken }` | `verify` (`password`, `email`, `sms`) | `verify`, `resend` (code types) |
| 4. Verify | `POST verify` `{ continuationToken, password }` or `{ continuationToken, otp }` | `state: continue`; `challenge` with `multiFactor` (MFA); `enroll` (JIT) | MFA: each method's `challenge`; JIT: see `v2-jit-registration.md` |
| 5. MFA challenge | `POST challenge` (second-factor method) | `verify` (`email`, `sms`) | `verify`, `resend` |
| 6. MFA verify | `POST verify` `{ continuationToken, otp }` | `state: continue`; `enroll` (JIT) | JIT: see `v2-jit-registration.md` |
| 7. Finish | Resume authorization → `code` → `/token` | tokens | none |

Resend (steps 3 and 5): `POST resend` `{ continuationToken }` and handle
the response like a challenge response. Offer it only where the V1 UI offered resend.

## Choosing a method

Apply the parity rule (`references/flows-and-scope.md`): only method types
the V1 sign-in UI handled are **usable**.

- Start (step 2):
  - One usable method → do what the V1 UI did: if it showed its choice even
    for one method, show it; otherwise challenge it without asking.
  - More than one, and the V1 UI let the user choose (for example a "send me
    a code instead" option) → show that choice with the masked `hint`s.
  - More than one, and the V1 UI had no choice → use the first usable type
    in the order of the `challenge_type` list the V1 code sent (for example
    `password oob redirect` → `password`).
  - None usable → unhandled response.
- MFA (step 4 → 5): the same rules, with the V1 MFA UI (V1 `introspect`
  method list). A V1 app that had no MFA handling → unhandled response.
- `enroll` at step 4 or 6: the app's V1 code handled
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

- Keep V1's message and screen for an unknown username and for a wrong
  password, and report it (SEC-06); detection is in `v2-errors.md`.
- Verification isn't idempotent. Never retry verify automatically.
- Errors and their V1 equivalents: `v2-errors.md`.
