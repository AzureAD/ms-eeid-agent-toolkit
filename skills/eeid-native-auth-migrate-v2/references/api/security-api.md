# Security rules for the raw API approach (`approach: api`)

These rules add to the shared rules in `references/security-guardrails.md`
(severity, classification, review method, and recording). When the app calls
the native auth endpoints itself, it takes on work an SDK would otherwise do,
so these rules matter most.

### API-01 Follow only validated links

- Send requests only to the two configured OAuth endpoints and to links
  the service returned, after the link resolver in `v2-api-core.md`:
  relative links (with or without a leading `/`, including `{tenant}`
  templated links) are rebased onto the configured base from their `/api/`
  or `/oauth2/` segment. An absolute link (any scheme, or `//host`) is
  an error: the service never returns one. Reject it, and anything else
  the resolver can't map, as an unhandled response. Never follow it.
- Never build a link from user input or from a different response.
- A URL used for web fallback must also be validated before it is opened, and
  opened in the system browser or the app's existing browser sign-in, never
  in a web view that can read what the user types.

Severity if broken: High.

### API-02 Keep each continuation token in its transaction

- Send a continuation token only with a link from the same response, and
  always use the latest one. Discard the previous token after every response.
- Never send a token from one flow to another flow, from V1 to V2, or from V2
  to V1. Keep V1 and V2 flow state in separate variables or objects.
- Discard the token when the flow ends, fails, or is cancelled.

Severity if broken: High.

### API-03 Handle the authorization code once

- Exchange the authorization code at the token endpoint immediately after
  receiving it, once. Never store, log, or reuse it, and never pass it
  between screens.
- If the exchange fails, restart authorization; don't retry with the same
  code.

Severity if broken: High (Critical if the code leaves the device).

### API-04 Send credentials only where the contract says

- Send `client_id`, `scope`, and `claims` only on the first
  `authorize-challenge` request (plus `client_id` on `/token`), and the
  scopes the V1 code requested (SEC-12).
- Send passwords, OTPs, new passwords, and registration contacts only in
  the JSON body of the allowed `verify`, `update`, `submitAttributes`,
  `enroll`, or `activate` link. Never in a URL or header.
- Use `client-request-id` as a random per-flow GUID. Never put user data in
  it.

Severity if broken: High.

### API-05 Don't add PKCE or sender constraints

V2 `authorize-challenge` doesn't support PKCE (`code_challenge`) or DPoP
yet. Don't send these parameters or headers, and don't report their absence
as a finding against the customer's code. When a future skill version adds
support, its V2 reference will define how to use them.

### API-06 Keep the dev proxy local and quiet

Apps whose calls run in a browser context (SPAs, JavaScript in
server-rendered pages, hybrid web-view apps, Electron renderers) call the
endpoints through a proxy because the endpoints don't support CORS.

- The local dev proxy listens on `localhost` only and stays out of
  production builds and deployment config (SEC-13).
- It forwards only native auth paths to the configured tenant host over
  HTTPS. It must never forward to a URL taken from the request, which would
  make it an open proxy.
- It never logs request or response bodies or `Authorization` headers.
- CORS headers allow only the app's development origin, plus the methods and
  headers V2 needs (`Content-Type`, `client-request-id`, `PUT`).
  Don't add `Access-Control-Allow-Origin: *` to anything that isn't
  local-only.
- A production proxy or gateway outside the repo can't be reviewed. List it
  as manual follow-up with these same rules.

Severity if broken: High for an open proxy or logged bodies; Medium for
over-broad CORS on a local-only proxy.

### API-07 Treat raw error details as diagnostics

- Branch on stable error codes (`error`, `error.code`,
  `error.innerError.code`, detail codes, `suberror`, and AADSTS numbers),
  not message text. Reading an `AADSTS<number>` out of a message is allowed;
  other wording is not (`v2-errors.md`).
- Keep `traceId`, `correlationId`, `timestamp`, and `client-request-id` for
  support; never show `message` or `error_description` to users (SEC-06).

Severity if broken: Medium.

### API-08 Follow only the links the step allows

- Every migrated V2 response goes through one HAL response handler that
  detects errors by the body and never logs bodies.
- For each step, follow only the link relations the flow's step table
  allows. Ignore every other link, even one valid for another step. Never
  follow `self` or `_links.continue`.
- An unknown `state` or `action`, or a missing required link, ends the flow
  (web fallback or generic error). Never skip a step or guess a URL.

Severity if broken: High (Medium if the extra link only reaches a step the
service would also accept, with no new data sent).

## Searches for this approach

| Rule | Search for |
| --- | --- |
| API-01 | `fetch(`, `axios`, `URLSession`, `OkHttp`, `Retrofit`, `Ktor` calls whose URL doesn't come from the link resolver; `new URL(` with response data |
| API-02 | `continuation_token`, `continuationToken` stored in globals shared by flows, persisted, or passed between V1 and V2 code |
| API-03 | `code` from `authorize-challenge` stored, logged, or passed to UI |
| API-06 | Proxy files (`cors.js`, `proxy.config.js`, `vite.config.*`, `setupProxy.js`): `listen(` host, target URL source, body logging, `Access-Control-Allow-Origin` |
| API-08 | `_links`, `.href`, `continue` link usage; response handling that loops over all links or follows a link not in the step table |

## Sources

- [OAuth 2.0 for First-Party Applications (draft-ietf-oauth-first-party-apps)](https://datatracker.ietf.org/doc/draft-ietf-oauth-first-party-apps/), the specification `authorize-challenge` comes from
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [Microsoft Learn: Native authentication API reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-native-authentication-api)
