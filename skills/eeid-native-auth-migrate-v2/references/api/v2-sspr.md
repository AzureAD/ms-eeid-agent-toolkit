# V2 password recovery (SSPR)

Email OTP only in the preview (SMS is a work in progress). Prerequisites:
tenant enrolled in the V2 preview, public client, native auth enabled,
password reset enabled for the tenant.

1. Start authorization → follow the `reset_password` link.
2. `POST {reset_password link}` (`/{tenant}/api/v0.1/auth/resetpassword`):
   `{ "username": "…", "continuationToken": "…" }`
   → `action: challenge`, `_embedded.methods[]` with an `email` method + masked `hint`.
3. `POST` the method's `challenge` link `{ "continuationToken": "…" }`
   → `action: verify`, `hint`, `codeLength`, `_links.verify`, `_links.resend`.
4. `POST` the `verify` link `{ "otp": "…", "continuationToken": "…" }`
   → `action: update`, `type: password`, `_links.update`
   (the password method ID differs from the email method ID).
5. `PUT` the `update` link `{ "newPassword": "…", "continuationToken": "…" }`
   → `action: poll`, `_links.poll`.
6. `POST` the `poll` link `{ "continuationToken": "…" }` every 1–2 s with
   exponential backoff while `action: poll`; stop at `state: continue`.
7. Follow `_links.continue` → resume authorization → code → token (the user
   is signed in after reset).

| Scenario | Expected |
| --- | --- |
| Unknown username | Rejected without starting recovery (show generic message) |
| Wrong passcode | Rejected; transaction doesn't advance |
| Resend | Follow `resend` link |
| Expired continuation token | Rejected; restart |

V1 → V2 field renames: `new_password` → `newPassword`, `oob` → `otp`,
`poll_completion` status polling → `action: poll` / `state: continue`.
