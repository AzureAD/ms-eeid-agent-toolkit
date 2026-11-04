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

- Starts with the configured `authorize-challenge` (`client_id`, `scope`,
  optional `claims`; no `response_type`) and treats a body with
  `continuation_token` (HTTP 401 `InsufficientAuthorization`) as success.
- `client_id`, `scope`, `claims` are sent only on that first request
  (`client_id` also on `/token`). The scopes match what the V1 code requested.
- One HAL response handler: errors detected by the body, continuation token
  read per endpoint, web fallback on any of `suberror: web_redirect_required`,
  `error.code: redirect_to_web`, or `state: webFallbackRequired` (every
  endpoint, including both `authorize-challenge` calls), no body logging.
- Each flow handles only its step table: the listed responses per step and
  the allowed links. Other links are ignored; an unknown `state`/`action`,
  a missing token or required link, or a step the V1 UI didn't handle leads
  to the unhandled outcome (web fallback or generic error), not a crash or a
  hang.
- Links go through the resolver: relative links (with or without a leading
  `/`, including `{tenant}` templated links) rebased from `/api/` or
  `/oauth2/` with the query string kept; any absolute link is an error and
  is never requested. No method URLs are built by hand.
- Replaces the stored continuation token and links after every response;
  uses `continuation_token` for OAuth and `continuationToken` for JSON.
- JSON calls send `Content-Type: application/json` and one
  `client-request-id` per flow; no `Accept` header.
- `state: continue` resumes at the configured `authorize-challenge`, never
  `_links.continue`, then `/token` with `grant_type=authorization_code`,
  only where the V1 flow ended with tokens.
- OTP submitted as `otp`; UI uses `hint` and the code-length rule
  (non-integer → unrestricted input).
- `sign-in`: `challengeContext.authenticationFactor` checked
  (`singleFactor` at start, `multiFactor` for MFA); SMS `riskverify`
  handled where the V1 UI used SMS.
- `sign-up`: start sends only `{continuationToken, username}`; existing
  account (`action: challenge`) maps to the V1 `user_already_exists`
  handling and its links aren't followed; repeated `collectAttributes`;
  only requested attributes submitted; `email` never submitted as an
  attribute.
- `sspr`: `PUT` for `update`; polls with the V1 app's own interval and
  limit, or 1.5 s apart and at most 5 attempts, never without a delay, then
  the generic error.
- JIT (only where V1 handled `registration_required`): `enroll` →
  `activate` with the right body per method.
- Never retries verify, attribute submission, password update, or
  activation automatically.

## Required tests

Mock the HTTP layer with response shapes from the `v2-*.md` references.

**V2 client (once, shared by all migrated flows):**

- Links are resolved: a relative link is rebased and keeps its query
  string, including one without a leading `/` and a `{tenant}/api/…`
  templated link; an absolute link (including one on the tenant host, and a
  `//host/…` link) and a relative link without `/api/` or `/oauth2/` are
  rejected, and no request is sent to them.
- A response with an extra link not in the step table: the link is ignored
  and the flow continues normally.
- An unknown `state`/`action`, a missing continuation token, and a missing
  required link each lead to the unhandled outcome.
- The continuation token and links are replaced after every response.
- The right token field name is sent per endpoint (`continuation_token` for
  OAuth, `continuationToken` for JSON).
- The entry 401 `InsufficientAuthorization` with `continuation_token` is
  handled as success; an entry response without the flow's journey link is
  handled as unavailable.
- `state: continue` resumes at the configured `authorize-challenge`, even
  when `_links.continue` points elsewhere.
- HAL and OAuth error bodies are both normalized; each web fallback signal
  (`suberror: web_redirect_required`, `error.code: redirect_to_web`,
  `state: webFallbackRequired`) leads to web fallback, including on the
  `authorize-challenge` start and resume; error objects keep codes and `correlationId` and
  contain no tokens or request bodies.
- Code length: a non-integer `codeLength` leaves the input unrestricted.
- Method types are matched without regard to case (`"SMS"` works like
  `"sms"`).

**Per migrated flow:**

| Flow | Tests |
| --- | --- |
| `sign-in` | Password success through code exchange; email OTP success; wrong password; wrong OTP; unknown user (`userNotFound`, and AADSTS50034 in the message) gets the same UI as a wrong password; MFA `challenge` with `multiFactor` after verify (where V1 had MFA); wrong `authenticationFactor` → unhandled; SMS `riskverify` then `verify` (where V1 used SMS); a method type the V1 UI never handled → unhandled; `enroll` → JIT or unhandled, per the plan |
| `sign-up` | Email code → `collectAttributes` (password and attributes) → `continue` → tokens or end, per V1; `enroll` after verify or attribute submission → JIT then tokens (V1 automatic sign-in handled `registration_required`), or V1's error handling, or end as "sign-up complete" (no V1 automatic sign-in), with no added web fallback; repeated `collectAttributes`; existing account (`action: challenge` at start) → V1 `user_already_exists` handling, no further request sent; `collectAttributes` requesting `email` → unhandled; password policy errors (an inner code such as `passwordTooShort`, and `attributeValidationError` with `password` in `attributeIds`); wrong OTP; resend |
| `sspr` | Success through `PUT update`, polling, and `continue` (tokens or end, per V1); MFA `challenge` or `enroll` after polling → MFA or JIT then tokens (V1 automatic sign-in handled `mfa_required` / `registration_required`), or V1's error handling, or end as "password reset" (no V1 automatic sign-in), with no added web fallback; poll still running after the last attempt (V1 app's limit, or 5) → generic error; unknown user gets a generic error; wrong OTP; SMS `riskverify` (where V1 used SMS) |
| JIT (if handled) | Email and phone (`channels: ["sms"]`) registration bodies; `activate` → `continue`; resend; unsupported method only → unhandled; no `preverified` branch left (registering the sign-in email still goes through `activate`) |
| All | Verify, attribute submission, password update, and activation are never retried automatically |
