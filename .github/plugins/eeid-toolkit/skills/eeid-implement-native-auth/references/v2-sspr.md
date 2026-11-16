# V2 self-service password reset

Read `v2-api-core.md` first. Require password reset enabled on the preview
tenant. Confirm whether reset ends at confirmation or automatically signs in.

| Response/action | Request or UI | Allowed links |
|---|---|---|
| Entry token and flat `reset_password` | POST `{ continuationToken, username }` | `reset_password` |
| `challenge` | Select supported email/SMS method and POST `{ continuationToken }` | methods' `challenge` |
| `verify`, type email/SMS | POST `{ continuationToken, otp }`; optional resend | `verify`, `resend` |
| `update` | **PUT** `{ continuationToken, newPassword }` | `update` |
| `poll` | POST `{ continuationToken }` using latest token/link | `poll` |
| `continue` | Reset complete; tokens only for confirmed automatic sign-in | none |
| Post-poll `challenge` with `multiFactor`, or `enroll` | Password already reset; MFA/JIT only for confirmed automatic sign-in | MFA/JIT allowlists |

Action rows require `interactionRequired`; `continue` is a state. Dispatch
handled actions by response, not a fixed call index. Reject password-type
`verify`, malformed methods, missing factors/links, or unsupported actions.

Poll after update, replacing token and link after each response. Keep an
existing positive delay and bounded attempt/timeout policy when applicable;
otherwise wait **1.5 seconds** between polls, at most **5 attempts**.
V2 does not provide `poll_interval`. Never busy-loop or poll indefinitely.
Exhaustion or a poll error stops with the generic reset error; never resubmit
the password. A non-poll supported result after polling means reset has
completed, even if MFA or enrollment is still required for sign-in.

For reset-only journeys, show completion and discard flow state without
running post-reset MFA/JIT or exchanging tokens. For automatic sign-in, use
the sign-in/JIT references, then finish at `continue`. Unsupported follow-up
blocks sign-in, not the already completed reset. Never introduce an
unapproved fallback or repeat the update after password reset.
