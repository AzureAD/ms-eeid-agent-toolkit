# Validation for the raw API approach (`approach: api`)

Shared rules, the fix loop, settings, and the check order are in
`references/validation-strategy.md`. This file adds what is specific to raw
API migrations.

## A3: V1 left in migrated flows

Search the migrated flows' files and call chains with the raw API patterns
in `references/v1-detection-patterns.md`. Any V1 endpoint, V1 `grant_type`
(`password`, `oob`, `mfa_oob`, `continuation_token`), or V1 response field
reached from a migrated flow is a failure. V1 hits used only by deferred
flows are expected. Token refresh (`grant_type=refresh_token`) isn't V1
usage; it must be present and unchanged.

## A5: V2 contract checklist

- Starts with `authorize-challenge` and treats HTTP 401 `InsufficientAuthorization` as the normal result.
- `client_id`, `scope`, `claims` are sent only on the first `authorize-challenge` request. The scopes match what the V1 code requested.
- Follows returned links (validated with `resolveLink` or equivalent); doesn't build method URLs.
- Replaces the stored continuation token and links after every response; uses the right field name per endpoint (`continuation_token` for OAuth, `continuationToken` for JSON).
- Native auth calls send `Content-Type: application/json`, `Accept: application/hal+json`, and one `client-request-id` per flow.
- Branches on `state`/`action`; an unknown state, unknown action, missing required field, or `web_redirect_required` leads to web fallback, not a crash or a hang.
- OTP submitted as `otp`; UI uses `hint` and `codeLength`.
- `sign-in`: handles a second `action: challenge` after the first verify (MFA).
- `sign-up`: handles repeated `collectAttributes` responses.
- `sspr`: uses `PUT` for `update` and polls with a delay until `state: continue`.
- Ends with resume `authorize-challenge` → `code` → `/token` with `grant_type=authorization_code`.
- Never retries verify, attribute submission, or password update automatically.

## Required tests

Mock the HTTP layer with response shapes from the `v2-*.md` references.

**V2 client (once, shared by all migrated flows):**

- Returned links are resolved; a link to another host or tenant path is rejected.
- The continuation token and links are replaced after every response.
- The right token field name is sent per endpoint (`continuation_token` for
  OAuth, `continuationToken` for JSON).
- 401 `InsufficientAuthorization` from `authorize-challenge` is handled as success.
- An unknown `state`/`action`, a missing required field, or
  `web_redirect_required` leads to web fallback.
- Error objects keep `code`, `traceId`, `correlationId` and contain no tokens
  or request bodies.

**Per migrated flow:**

| Flow | Tests |
| --- | --- |
| `sign-in` | Password success through code exchange; email OTP success; wrong password; wrong OTP; MFA second `action: challenge` after the first verify; unknown user gets the same error path as a wrong password |
| `sign-up` | Success through code exchange; extra `collectAttributes` response; existing user; password policy error; wrong OTP |
| `sspr` | Success through polling and code exchange (`PUT` for `update`); unknown user gets a generic error; wrong OTP |
| All | Verify, attribute submission, and password update are never retried automatically |
