# V2 sign-in

Possible sequence (policy can change it — stay response-driven):

1. Start authorization → follow the `sign_in` link.
2. `POST {sign_in link}` (`/{tenant}/api/v0.1/signin/start`), JSON:
   `{ "continuationToken": "…", "username": "user@contoso.com" }`
3. Response: `state: interactionRequired`, `action: challenge`,
   `_embedded.methods[]` (e.g. `password`, `email`) — or a single method if
   policy already chose one.
4. Pick a method (match the app's existing UX, e.g. password for a password
   form) → `POST` its `challenge` link with `{ "continuationToken": "…" }`.
   - Password: response `action: verify`, `type: password`, `_links.verify` (no code sent).
   - Email/SMS OTP: response `action: verify`, `hint`, `codeLength`,
     `_links.verify`, `_links.resend`.
5. Verify: `POST` the `verify` link with
   `{ "continuationToken": "…", "password": "…" }` or
   `{ "continuationToken": "…", "otp": "…" }`.
6. Response is one of:
   - `state: continue` + `_links.continue` → resume authorization → code → token.
   - `state: interactionRequired`, `action: challenge` + `_embedded.methods`
     → **MFA**: pick a second-factor method, repeat challenge + verify.
7. Resume authorization and exchange the code (see v2-api-core.md).

Notes:

- Inline MFA registration (JIT) isn't supported in the preview; a user with
  no MFA method gets an error (see the gap list).
- Use the same client behavior for existing and nonexistent identifiers.
- Use `codeLength` to size OTP input; show only the masked `hint`.

| Condition | Status | Client action |
| --- | --- | --- |
| Missing username/token | `400` | Fix request |
| User discovery failure | `400`/`401` | Generic failure, no account-existence leak |
| Sign-in unavailable | `403`/`404` | Use another flow |
| Bad method/ID/state | `400`/`410` | Follow latest link or restart |
| Bad credential | `400`/`401` | Allow policy-compliant retry |
| Attempts exceeded / throttled | `423`/`429` | Stop auto-retry |
| OTP delivery failure | `5xx` | Generic failure; offer another method |

Verification isn't idempotent — never auto-retry after an ambiguous failure.
