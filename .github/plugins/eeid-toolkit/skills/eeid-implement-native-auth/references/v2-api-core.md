# Native V2 API contract

V2 is a public preview. These language-neutral references adapt the
`eeid-native-auth-migrate-v2\references\api\v2-*.md` contracts for new
implementations, not migration parity. They are bundled here so implementation
does not depend on another checkout. Do not replace them with public V1
examples or unverified SDK signatures.

## Endpoints and encodings

Use the configured HTTPS base
`https://{subdomain}.ciamlogin.com/{tenant}`, where tenant is the existing
`{subdomain}.onmicrosoft.com` domain or tenant GUID; preserve either form.

| Operation | Method and target | Encoding |
|---|---|---|
| Start/resume authorization | POST configured `{base}/oauth2/v2.0/authorize-challenge` | form URL encoded |
| Exchange code or refresh tokens | POST configured `{base}/oauth2/v2.0/token` | form URL encoded |
| Journey and action requests | POST latest allowed link; PUT for password `update` | JSON |

Send one `client-request-id` GUID per flow. Do not send an
`Accept: application/hal+json` header. OAuth uses `continuation_token`;
every linked JSON request requires the latest `continuationToken`.
Do not add fields beyond the journey's request contract.

## Start

POST `authorize-challenge` with `client_id`, confirmed `scope`, and optional
`claims` only. Do not send `response_type`, V1 `challenge_type`, or capabilities.
Request `offline_access` initially only when refresh tokens are required.

A normal entry is HTTP 401 with `error: InsufficientAuthorization`,
`continuation_token`, and flat journey strings `sign_in`, `sign_up`,
`reset_password`. Check browser-required fallback first, then accept the
continuation token irrespective of HTTP status; do not reject this normal
401 as an HTTP exception. Use only the selected journey's flat link.
A missing token or journey link means the journey is unavailable.

## Shared response handler

1. Parse JSON, including non-2xx bodies. Non-JSON is an unhandled response.
2. Check for OAuth `error: invalid_grant` and
   `suberror: web_redirect_required` on every endpoint, including both
   authorization calls. This pair is the only explicit service fallback signal.
3. Replace the active token and link set whenever the response supplies new
   ones, including failures. Do not merge old links into a new set or reuse
   stale links. A failure without replacements retains the latest state for
   a permitted user-driven correction, never an automatic replay.
4. Detect errors by body shape: object `error` is HAL; string `error` is
   OAuth, except the expected entry response above. See the errors reference.
5. Dispatch case-sensitive `state` and `action` through the active journey's
   allowlist. Handle a supported action even after a different request than
   expected; tenant policy controls order. Unknown properties are ignored.
6. Require the current token, required data, and links before another call.
   Missing/malformed data, unknown states/actions, or unsupported steps stop
   the flow. Never guess a URL or skip a step.

Read `x-ms-request-id` for support correlation, falling back to the request's
`client-request-id`. Never log or retain raw request/response bodies.

## Link resolver and allowlists

Only follow relations the current journey/action table permits. Ignore
unlisted relations, `self`, and `_links.continue`, even if valid elsewhere.
Each required `href` must be a non-empty string.

Links must be relative, including forms without a leading slash or with a
`{tenant}` placeholder. Keep the path from the first `/api/` or `/oauth2/`
segment and its exact query string; discard preceding tenant material and
append to the configured base (or approved browser proxy base). For example:

```text
/{tenant-guid}/api/v2.0/auth/methods/m1/verify?dc=X
  -> {base}/api/v2.0/auth/methods/m1/verify?dc=X
{tenant}/api/v2.0/auth/methods/m1/challenge
  -> {base}/api/v2.0/auth/methods/m1/challenge
```

Reject any scheme-bearing or `//` absolute link, including the configured
tenant host; never request or rebase it. Reject relative links without the
required segment. Never construct method URLs or match on returned path
names to decide the UI action.

## Challenge, verify, and resend

`interactionRequired` with `action: challenge` returns `_embedded.methods`.
Match `password`, `email`, and `sms` types case-insensitively and use only
methods supported by the confirmed UI/factors that have a `challenge` link.
Skip unusable methods; no usable method is an unhandled response. One usable
method proceeds directly; multiple methods require a user choice.

Require `challengeContext.authenticationFactor` to be `singleFactor` or
`multiFactor`; choose first-factor/MFA UI from this value, not call order.
Show masked `hint` only, never method IDs.

| Action | Request | Allowed relations |
|---|---|---|
| Challenge | POST selected method link `{ continuationToken }` | method `challenge` |
| Verify password | POST `{ continuationToken, password }` | `verify` |
| Verify email/SMS | POST `{ continuationToken, otp }` | `verify`, optional `resend` |
| Resend, when offered | POST `{ continuationToken }`; replace verify/resend links from response | `resend` |

For code input use integer `codeLength`, or `payload.codeLength` only when
the top-level field is absent. Otherwise leave length unrestricted and
disable length-based auto-submit. Never equate `enroll` with MFA verification.

## Finish

At `state: continue`, only when the confirmed journey signs the user in:

1. POST configured `authorize-challenge` with only `continuation_token`.
   Do not follow `_links.continue`; check fallback here too.
2. Require `code`, then POST configured `token` with `client_id`,
   `grant_type=authorization_code`, and `code`.
3. Require `access_token`. A missing code/token or exchange failure restarts
   authorization with a generic error; never retry the single-use code.

`scope` can be absent in token responses. Keep existing
`grant_type=refresh_token` support; do not use V1 `grant_type=continuation_token`.
Do not send `client_id`, `scope`, or `claims` on linked JSON calls or resume
(`client_id` is also required on token exchange).

## Unhandled outcomes and secrets

Stop and show an explicit generic error for unhandled responses, or use
previously approved browser fallback. Browser fallback restarts authentication;
never forward a native continuation token to a redirect or another endpoint.
Do not silently enable fallback, V1, BYOUX, or unsupported methods.

Use HTTPS only; never put identifiers, passwords, OTPs, continuation tokens,
authorization codes, or tokens in URLs, logs, analytics, or exceptions.
Keep active flows and collected credentials in memory, isolated per user;
clear credentials after submission and flows on cancellation/completion.
Store completed-session tokens only through approved secure storage.
Use non-enumerating messages and accessible forms/live error announcements.
Disable duplicate submissions; respect throttling and do not automatically
replay verification, attribute submission, activation, or password updates.
