# Native auth API V2 — core contract (read for every V2 migration)

> V2 is in **private preview**; behavior may change before GA. These V2
> references are authoritative over any other comparison material.

## Model

V2 is **server-driven**. Every response says what comes next through
`state`, `action`, and HAL links (`_links`). The migrated code:

1. Keeps the latest continuation token and links for the active flow.
2. Reads `state` and `action` and looks them up in the **step table** of the
   flow reference (`v2-sign-in.md`, `v2-sign-up.md`, `v2-sspr.md`,
   `v2-jit-registration.md`).
3. Follows only the links that table allows for that step (**link
   allowlist**, below).
4. Replaces the token and links with the newest after every response that
   returns them; after a failure it keeps the latest (`v2-errors.md`).
5. Sends anything it can't handle to the flow's **unhandled outcome**: web
   fallback, or the app's existing generic error (see "Unhandled responses").

Tenant policy decides which steps happen (for example MFA or extra sign-up
attributes), so the code never hard-codes a fixed sequence of calls. It does
hard-code **which actions it handles**: the step tables are the complete
list.

Handle each response by its `state` and `action`, not by the request that
produced it. The service may return any action after any request (for
example MFA right after JIT activation); an action the flow handles is
handled the same way wherever it appears, with that action's links. Two
answers depend on where they come:

- `action: challenge` from sign-up start means the account already exists
  (`v2-sign-up.md`).
- Any response except `poll` after an SSPR password update means the
  password is already reset (`v2-sspr.md`).

## HAL response handler

Add one small HAL response handler to the app, used by every migrated V2
call. If the app already has HAL or hypermedia handling for other APIs,
reuse it when it can meet these rules; record the choice in the plan. The
handler:

- Parses the JSON body. A body that isn't JSON → unhandled response.
- Reads the continuation token from `continuationToken` (JSON endpoints) or
  `continuation_token` (OAuth endpoints).
- Checks for **web fallback** first, on every response, including both
  `authorize-challenge` calls: an OAuth error with `error: invalid_grant`
  and `suberror: web_redirect_required` means web fallback. It's the only
  web fallback signal.
- Detects errors by the **body**, not the HTTP status: an object `error` is
  a HAL error; a string `error` is an OAuth error (see `v2-errors.md`).
- Reads the correlation ID from the `x-ms-request-id` response header (fall
  back to the request's `client-request-id`).
- Returns `state`, `action`, the allowed links for the current step, and the
  step's data (`_embedded.methods`, `attributes`, `hint`, `codeLength`, …).
- Never logs or keeps request or response bodies.

## Link allowlist

- For each step, follow **only** the link relations the flow's step table
  lists. Ignore every other link in `_links` or `_embedded`, even one that is
  valid for another step or endpoint. It may lead to behavior nobody tested.
- A required link that's missing, empty, or not a string → unhandled
  response. Never skip the step or guess the URL.
- Ignore unknown **properties** (they can be added without notice), but an
  unknown `state` or `action` → unhandled response.
- `_links.continue` on `state: continue` is never followed. Resume
  authorization at the configured `authorize-challenge` endpoint instead
  (see "Finish: get tokens").
- `self` links are never followed.

## Base URL and endpoints

`https://{tenant_subdomain}.ciamlogin.com/{tenant}`, where `{tenant}` is
either the tenant domain (`{tenant_subdomain}.onmicrosoft.com`, the form V1
uses) or the tenant ID (GUID). Keep the form the app already uses. Don't
ask for or switch to the GUID if the app uses the domain form.

Only two endpoints are configured. Everything else comes from links:

| Operation | Method | URL |
| --- | --- | --- |
| Start authorization; resume authorization | `POST` | configured `{base}/oauth2/v2.0/authorize-challenge` |
| Exchange the authorization code | `POST` | configured `{base}/oauth2/v2.0/token` |
| Every other step | `POST` (`PUT` for `update`) | the allowed link from the latest response |

Today's links look like `/{tenant}/api/v2.0/signin/start` or
`/{tenant}/api/v2.0/auth/methods/{id}/verify?dc=X`. Their paths can change,
so never hard-code them and never match on them beyond the resolver checks.

## Resolving a link to a URL

Links are always relative. Resolve each one before use:

- **Relative link** (with or without a leading `/`, including templated
  links that start with a `{tenant}` placeholder): keep the path from the
  first `/api/` or `/oauth2/` segment, plus the query string, and append it
  to the configured base URL (or the app's proxy base, for calls made from
  a browser context). Whatever
  comes before that segment (a tenant domain, a tenant GUID, `{tenant}`) is
  dropped. Examples:
  - `/1eb974cd-…/api/v2.0/auth/methods/m1/verify?dc=X` →
    `{base}/api/v2.0/auth/methods/m1/verify?dc=X`
  - `{tenant}/api/v2.0/auth/methods/m1/challenge` →
    `{base}/api/v2.0/auth/methods/m1/challenge`

  A relative link without an `/api/` or `/oauth2/` segment → unhandled
  response.
- **Absolute link** (has a scheme such as `https://`, or starts with
  `//`): the service never returns one, so treat it as an error → unhandled
  response. Never send a request to it, not even to the tenant host, and
  never rebase it.
- Keep the query string exactly as returned. It can carry routing data.

## Requests

| Endpoint kind | Content-Type | Body | Token field |
| --- | --- | --- | --- |
| OAuth (`authorize-challenge`, `token`) | `application/x-www-form-urlencoded` | form fields | `continuation_token` |
| Every link | `application/json` | JSON object | `continuationToken` |

- Every JSON request body includes `continuationToken` (the latest one). A
  request with no token is a bug; don't send it.
- Send `client-request-id: {guid}`, one new GUID per flow. Don't send
  `Accept: application/hal+json` (the service doesn't need it).
- Send nothing else the step table doesn't list. In particular `client_id`,
  `scope`, and `claims` go only on the first `authorize-challenge` request.

## Start authorization

```text
POST {base}/oauth2/v2.0/authorize-challenge   (form-encoded)
client_id={client_id}&scope={the scopes V1 requested}[&claims={claims}]
```

Don't send `response_type` or any other parameter. The normal response is
**HTTP 401**, not an error:

```json
{
  "error": "InsufficientAuthorization",
  "error_description": "No authenticated credentials found in request.",
  "continuation_token": "******",
  "sign_in": "/{tenant}/api/v2.0/signin/start",
  "sign_up": "/{tenant}/api/v2.0/signup/start",
  "reset_password": "/{tenant}/api/v2.0/auth/resetpassword"
}
```

- Check the web fallback signals first (see "HAL response handler").
- Success means the body has `continuation_token`, whatever the status.
  Without it, handle the body as an error (`v2-errors.md`).
- The journey links are flat strings, not HAL `_links`. Use only the one for
  the flow being run. A missing journey link means the tenant doesn't
  enable that journey → the flow's unhandled outcome.

## States and actions

| `state` | `action` | Meaning | Where handled |
| --- | --- | --- | --- |
| `interactionRequired` | `challenge` | Pick a method from `_embedded.methods`, POST its `challenge` link | sign-in, sspr, sign-in MFA; after an SSPR poll it ends the flow (`v2-sspr.md`) |
| `interactionRequired` | `verify` | Submit a password or one-time code to `verify` | all flows |
| `interactionRequired` | `collectAttributes` | Submit requested attributes to `submitAttributes` | sign-up |
| `interactionRequired` | `update` | `PUT` a new password to `update` | sspr |
| `interactionRequired` | `poll` | POST `poll` until the password update finishes | sspr |
| `interactionRequired` | `enroll` | Register a strong-auth method (JIT) | `v2-jit-registration.md` |
| `interactionRequired` | `activate` | Submit the registration code to `activate` | `v2-jit-registration.md` |
| `continue` | — | The flow succeeded; finish (see below) | all flows |

`state` and `action` values are case-sensitive as shown. Anything else →
unhandled response. V2 no longer returns `action: riskverify` (an SMS risk
check); treat it like any unknown action.

## Embedded methods

Challenge methods (in `action: challenge` responses):

```json
{ "id": "m1", "type": "email", "hint": "u***@contoso.com",
  "_links": { "challenge": { "href": "/{tenant}/api/v2.0/auth/methods/m1/challenge" } } }
```

- `type` is `password`, `email`, or `sms` today. Compare it without regard
  to case (the service may send `"SMS"`). A method without a
  `challenge` link can't be used; skip it. No usable method → unhandled
  response.
- `challengeContext.authenticationFactor` says which kind of challenge it
  is: `singleFactor` (first credential, usually at flow start) or
  `multiFactor` (MFA, usually after the first verify). Pick the screen from
  this value, not from the step it follows. A missing or unknown value →
  unhandled response.
- Show only the masked `hint`. Never show `id` to users.

Enrollment methods (in `action: enroll` responses) are described in
`v2-jit-registration.md`.

## Challenge and verify (shared by all flows)

1. **Challenge:** POST the chosen method's `challenge` link with
   `{ "continuationToken" }`. The response is one of:
   - `action: verify` with `type`:
     - `password`: `_links.verify` only. No code is sent.
     - `email` or `sms`: `hint`, `codeLength`, `_links.verify`,
       `_links.resend`.
2. **Resend** (only where the V1 UI offered it; see the parity rule): POST
   the `resend` link with `{ "continuationToken" }`. The
   response is handled exactly like a challenge response (new `verify` and
   `resend` links).
3. **Verify:** POST the `verify` link with `{ "continuationToken",
   "password" }` or `{ "continuationToken", "otp" }`. What can come back
   depends on the flow (see its step table).

**Code length:** read `codeLength`, or `payload.codeLength` if
`codeLength` is absent. If the value isn't an integer, treat the length as
unknown: don't restrict the input length and don't auto-submit on length.

## Finish: get tokens

When a response has `state: continue`:

```text
POST {base}/oauth2/v2.0/authorize-challenge   (form-encoded)
continuation_token={token from the state:continue response}
→ 200 { "code": "{authorization_code}" }   (short-lived, single-use)

POST {base}/oauth2/v2.0/token   (form-encoded)
client_id={client_id}&grant_type=authorization_code&code={authorization_code}
→ 200 { token_type, expires_in, access_token, id_token, refresh_token, … }
```

- Use the configured `authorize-challenge` URL, the same function as the
  start call, not `_links.continue`.
- Check the web fallback signals on the resume response too.
- A resume response without `code`, or a token response without
  `access_token` → error; restart the flow. Never retry with the same code.
- `refresh_token` comes back only if `offline_access` was in the initial
  scope. `scope` may be missing from the token response.
- Whether a flow gets tokens at `state: continue` follows the app's V1
  behavior; see each flow reference.

## Token refresh (unchanged)

Refreshing tokens works the same as in V1: `POST /oauth2/v2.0/token` with
`grant_type=refresh_token`. Keep the app's existing refresh code unchanged;
it isn't part of the migration.

## Unhandled responses

An unknown `state` or `action`, a missing continuation token, a missing
required link or field, a malformed method or attribute list, a link the
resolver rejects, or a step the app doesn't support (see the parity rule in
`references/flows-and-scope.md`) is an **unhandled response**. The flow
stops and:

- shows **web fallback** when the app has V1 `challenge_type: redirect`
  handling (its existing browser sign-in or message), or
- shows the app's existing generic error when it doesn't.

Never continue the flow after an unhandled response, and never send the
current continuation token anywhere else. Web fallback restarts
authentication in the browser; it doesn't resume the native flow.

## Security requirements

- HTTPS only. Continuation tokens, codes, tokens, passwords, OTPs are secrets:
  never in URLs, logs, telemetry, exceptions, analytics.
- Don't reveal account existence (messages, timing, method-list differences).
- Display only masked `hint` values from the service.
- Don't cache credential responses or persist a flow across users.
- Don't auto-retry verify, attribute submission, or password update after a
  failure.
- Respect server resend, attempt, throttling, and polling limits.
