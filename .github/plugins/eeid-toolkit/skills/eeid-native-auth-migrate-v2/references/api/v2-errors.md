# V2 errors and the V1 → V2 error map

## Error shapes

The HAL handler (`v2-api-core.md`) finds errors by the body, whatever the
HTTP status.

**HAL error** (links, JSON endpoints) — `error` is an object:

```json
{ "error": {
    "code": "invalidRequest",
    "message": "…",
    "correlationId": "…", "traceId": "…", "timestamp": "…",
    "innerError": {
      "code": "attributeValidationError",
      "details": [ { "code": "…", "attributeIds": ["password"], "message": "…" } ]
    } } }
```

**OAuth error** (`authorize-challenge`, `token`) — `error` is a string:
`error`, `error_description`, `error_codes` (numbers), `suberror`,
`trace_id`, `correlation_id`, `timestamp`.

## Branching rules

- Branch on codes: `error.code`, `error.innerError.code`,
  `innerError.details[].code`, `error`, `suberror`, and AADSTS numbers.
- AADSTS numbers are stable service codes. Look for them in `error_codes`
  first, then as `AADSTS<number>` in `message` / `error_description`. Read
  message text only for that; never branch on other wording.
- Keep the V1 app's messages (the V1-conflict rule in `references/security-guardrails.md`). Where the V1 UI showed the service's
  text, show V2's `message` or `error_description` in the same place; show
  service text nowhere else. Existing disclosure is reported, not fixed.
- Keep `correlationId`, `traceId`, `timestamp`, and `client-request-id` for
  support. Never put request bodies, tokens, or codes in error objects.

## Service errors

| Condition | Detection | Client action |
| --- | --- | --- |
| Browser required | OAuth error `error: invalid_grant` with `suberror: web_redirect_required` (any endpoint) | Web fallback |
| User not found (sign-in, sspr start) | `error.code: invalidRequest` and (`innerError.code: userNotFound`, or AADSTS50034) | Same message and screen as V1 `user_not_found` |
| Username format invalid | `invalidRequest` and AADSTS90100 | Same UI as V1 invalid username |
| Wrong password | `error.code: invalidGrant`, `innerError.code: invalidUserNameOrPassword` | Same UI as V1 wrong password; user may retry |
| Wrong or expired code | `invalidGrant`, `innerError.code: invalidOneTimeCode` | Same UI as V1 `invalid_oob_value`; user may retry, or resend where the V1 UI offered it |
| Invalid password (sign-up, sspr) | `invalidRequest` and `innerError.code` is `passwordTooWeak`, `passwordTooShort`, `passwordTooLong`, `passwordIsInvalid`, `passwordRecentlyUsed`, or `passwordBanned` | Same UI as the matching V1 password error |
| Invalid password (attribute check) | `invalidRequest`, `innerError.code: attributeValidationError`, and any detail's `attributeIds` contains `password` (ignore the detail's own `code`) | Same UI as V1 password policy errors |
| Attribute invalid | detail `attributeValidationFailed`, `attributeIds` | Mark those fields, as V1 `attribute_validation_failed` |
| Attribute missing | detail `attributeRequired`, `attributeIds` | As V1 `attributes_required` |
| Any other `invalidRequest` / `invalidGrant` (expired or bad continuation token, wrong state) | — | Do what the V1 code did for that call: if it stays on the form, show its error there and keep the latest continuation token and links, so the user can try again; if the token is no longer valid, that try just fails with an error too. If V1 goes back or restarts, do the same |
| OAuth errors on resume or `/token` (`invalid_grant`, `invalid_client`, `invalid_scope`, …) | `error` string | Generic error; restart authorization; never reuse the code |
| Failure while polling after the new password (SSPR) | Error body from `poll` | App's generic reset error; stop polling and never resubmit the password |
| Any other error | — | The fallback the V1 code has for that call; same screen rule as the row for any other `invalidRequest` / `invalidGrant` |

## Client-side conditions

These are detected by the migrated code, not returned as service errors.

| Condition | Client action |
| --- | --- |
| No `continuation_token` in the entry response, no journey link for the flow | Flow unavailable → unhandled response |
| Missing continuation token, required link, or field; malformed methods or attributes; unknown `state`/`action`; rejected link | Unhandled response (`v2-api-core.md`) |
| Step the app doesn't support (parity rule) | Unhandled response |
| SSPR poll still running after the last attempt | App's generic reset error |
| Resume without `code`, token response without `access_token` | Generic error; restart |
| Network failure, non-JSON body | Generic error; don't replay verify, attribute submission, or password update |

## V1 → V2 error map

| V1 | V2 |
| --- | --- |
| `user_not_found` | `invalidRequest` + `userNotFound` / AADSTS50034 |
| `invalid_grant` (wrong password, AADSTS50126) | `invalidGrant` + `invalidUserNameOrPassword` |
| `invalid_grant` + `invalid_oob_value` | `invalidGrant` + `invalidOneTimeCode` |
| `invalid_grant` + `password_too_weak` | `invalidRequest` + `passwordTooWeak` |
| `invalid_grant` + `password_too_short` | `invalidRequest` + `passwordTooShort` |
| `invalid_grant` + `password_too_long` | `invalidRequest` + `passwordTooLong` |
| `invalid_grant` + `password_is_invalid` | `invalidRequest` + `passwordIsInvalid` |
| `invalid_grant` + `password_recently_used` | `invalidRequest` + `passwordRecentlyUsed` |
| `invalid_grant` + `password_banned` | `invalidRequest` + `passwordBanned` |
| Any of the password errors above, during sign-up attribute submission | also `invalidRequest` + `attributeValidationError` with `password` in a detail's `attributeIds` |
| `user_already_exists` | sign-up start returns `action: challenge` (not an error; V2 has no "user already exists" error) |
| `attributes_required` + `required_attributes` | `collectAttributes` response (not an error), or detail `attributeRequired` |
| `attribute_validation_failed` + `invalid_attributes` | detail `attributeValidationFailed` + `attributeIds` |
| `credential_required` | `collectAttributes` requesting `password` (not an error) |
| `invalid_grant` + `mfa_required` | `challenge` with `multiFactor` after verify (not an error) |
| `invalid_grant` + `registration_required` | `enroll` (not an error) |
| `challenge_type: redirect` | `invalid_grant` + `suberror: web_redirect_required`, or any unhandled response |
| `expired_token`, other `invalid_request` | other `invalidRequest` / `invalidGrant` → restart |
| `unsupported_challenge_type` | no equivalent; method choice comes from `_embedded.methods` |
| SSPR `poll_completion` `status: failed` | an error body from `poll` → the app's generic reset error |
| Throttling waits, sign-up `interval` | no equivalent field; any throttling error → the app's generic error, no automatic retry |
