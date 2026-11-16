# V2 sign-up

Read `v2-api-core.md` first. Confirm whether sign-up should automatically
sign in or end at account-created confirmation before implementation.
Prefer the V2 email-first form; do not collect passwords before verifying
email in a new implementation.

| Response/action | Request or UI | Allowed links |
|---|---|---|
| Entry token and flat `sign_up` | POST `{ continuationToken, username }` only | `sign_up` |
| Start returns `verify`, type email | Email code already sent; POST `{ continuationToken, otp }` | `verify`, `resend` |
| Start returns `challenge` | Account already exists; stop this flow (see below) | none |
| `collectAttributes` | POST `{ continuationToken, attributes: { requestedId: "value" } }` | `submitAttributes` |
| `enroll` | Account exists; JIT only if automatic sign-in and registration are confirmed | methods' `enroll`, then JIT allowlist |
| `continue` | Account created; tokens only if automatic sign-in is confirmed | none |

Action rows require `interactionRequired`; `continue` is a state. Handle
supported actions independently of which call produced them, except
`challenge` at sign-up start is the existing-account outcome, not MFA.
Start `verify` with any type other than email is unhandled.

## Attributes

Require an `attributes` array with non-empty string `attributeId` values.
Render requested descriptors (`inputType`, `required`, `canChange`, `label`,
`validation`, `confirmationInput`) using accessible controls and local
validation. Treat server regex as a hint only; never execute it without
HTML decoding and protection against invalid/slow expressions.

Submit only attributes requested by the latest response, with string values.
Password is an attribute, never a start-request field. For requested `email`,
reuse the verified sign-up username without asking again. Keep custom
attribute IDs unchanged. Support repeated `collectAttributes` for new fields;
after a successful submission a repeated password or already submitted
attribute is an unhandled loop, not a reason to resend the password.
Rejected values can be corrected explicitly; never replay automatically.

## Existing account and completion

For `challenge` directly from start, discard its continuation token; never
follow challenge links or show returned method hints. Show the approved
non-enumerating sign-up outcome with a sign-in option. A chosen sign-in
starts a new authorization flow, not a continuation of this sign-up.

At `continue` or `enroll` the account exists. Show any confirmed account-created
screen before registration/automatic sign-in. If sign-up does not sign in,
end successfully and discard flow state; registration occurs on the next
sign-in. If automatic sign-in is confirmed, handle JIT when supported, then
finish through authorization code exchange. Unsupported enrollment blocks
sign-in but must not claim account creation failed or recreate the account.
Do not add a new browser fallback after creation without prior approval.
