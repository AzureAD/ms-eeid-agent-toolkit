# V2 just-in-time method registration

Read `v2-api-core.md` first. JIT is part of the parent sign-in, sign-up, or
reset journey, triggered by `interactionRequired` / `enroll`. Confirm method
registration is in scope; otherwise apply the parent's unhandled/completion
rule. It is not a standalone journey or ordinary MFA challenge.

| Action | Request | Allowed links |
|---|---|---|
| `enroll`, email method | POST `{ continuationToken, email }` | selected method's `enroll` |
| `enroll`, phone method with SMS channel | POST `{ continuationToken, phoneNumber, channel: "sms" }` | selected method's `enroll` |
| `activate` | POST `{ continuationToken, otp }` | `activate`, optional `resend` |
| Resend offered code | POST `{ continuationToken }`; handle new `activate` | `resend` |
| `continue` or another parent-supported action | Return to parent dispatcher; finish only at `continue` | parent's allowlist |

Enrollment methods come from `_embedded.methods` and do not have `id` or
`hint`. Match types case-insensitively. A usable email method needs an
`enroll` link; a phone method also needs `"sms"` in `channels`. Skip
unsupported or unusable methods, error if none remain, and offer a choice
if multiple remain. Collect contacts in JSON bodies only.

Activation always requires a code, including registration of the email
just verified during sign-in. There is no `preverified` shortcut. Use the
returned resend link even if it happens to equal the enrollment URL.
After activation dispatch the actual parent-supported action (such as
another MFA challenge); never assume the session is complete.
Clear submitted contacts/codes from transient forms and never auto-retry
activation or expose enrollment payloads in diagnostics.
