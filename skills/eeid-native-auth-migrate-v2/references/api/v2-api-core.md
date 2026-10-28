# Native auth API V2 — core concepts (read for every V2 migration)

> V2 is in **private preview**; behavior may change before GA. These V2
> references are authoritative over any other comparison material.

## Model

V2 is **server-driven and action-based**. The client doesn't hard-code a
sequence. It loops:

1. Keep the latest continuation token for the active transaction.
2. Read `state` and `action` to decide what to do (render UI, continue, finish).
3. Build UI from returned metadata (methods, attributes, pages, hints).
4. Send input to the advertised link; replace token + response with the newest.
5. Ignore unknown **optional** properties and links.
6. Anything it can't handle (unknown state/action, missing required field,
   malformed response, `invalid_grant` + `web_redirect_required`) → **web
   fallback** (browser interactive flow). In the preview, fallback restarts
   authentication.

Tenant policy can add, skip, repeat, or reorder actions. Any endpoint can
return any state/action.

## Base URL and endpoints

`https://{tenant_subdomain}.ciamlogin.com/{tenant}`, where `{tenant}` is
either form:

- the tenant domain: `{tenant_subdomain}.onmicrosoft.com` (the same base URL
  V1 uses), or
- the tenant ID (GUID).

Keep the form the app already uses for V1. Don't ask for or switch to the
GUID if the app uses the domain form.

| Operation | Method | Path |
| --- | --- | --- |
| Start / resume authorization | `POST` | `/{tenant}/oauth2/v2.0/authorize-challenge` |
| Start sign-in discovery | `POST` | `/{tenant}/api/v0.1/signin/start` |
| Start sign-up | `POST` | `/{tenant}/api/v0.1/signup/start` |
| Submit sign-up attributes | `POST` | `/{tenant}/api/v0.1/signup/submitattributes` |
| Start password recovery | `POST` | `/{tenant}/api/v0.1/auth/resetpassword` |
| Challenge / resend | `POST` | advertised `challenge` / `resend` link |
| Verify credential | `POST` | advertised `verify` link |
| Update password | `PUT` | advertised `update` link |
| Poll password update | `POST` | advertised `poll` link |
| Exchange authorization code | `POST` | `/{tenant}/oauth2/v2.0/token` |

**Use returned links; don't construct method URLs.** Treat each URL as
opaque, validate its authority (same tenant host / expected path prefix),
and use it only with the continuation token from the same response.

## Headers and encodings

| Endpoint kind | Content-Type | Token field name |
| --- | --- | --- |
| OAuth (`authorize-challenge`, `token`) | `application/x-www-form-urlencoded` | `continuation_token` |
| Native auth (`/api/v0.1/...`, links) | `application/json` | `continuationToken` |

Also send `Accept: application/hal+json` (native auth endpoints) and
`client-request-id: {guid}` (new GUID per flow).

## Start authorization

```text
POST /{tenant}/oauth2/v2.0/authorize-challenge   (form-encoded)
client_id={client_id}&scope=openid%20profile%20offline_access&response_type=code
```

`client_id`, `scope`, `claims` are sent **only** on this first request.
Expected response is **HTTP 401** (not an exception in V2 code paths):

```json
{
  "error": "InsufficientAuthorization",
  "continuation_token": "******",
  "reset_password": "/{tenant}/api/v0.1/auth/resetpassword",
  "sign_in": "/{tenant}/api/v0.1/signin/start",
  "sign_up": "/{tenant}/api/v0.1/signup/start"
}
```

Only enabled journeys are returned. Follow the link for the journey.

## States, actions, links

| `state` / `action` | Client behavior |
| --- | --- |
| `state: interactionRequired` | Do what `action` + `_links` say |
| `state: continue` | Follow `_links.continue` → resume authorization |
| `state: completed` | Follow returned links |
| `action: discover` | Submit sign-in identifier |
| `action: collectAttributes` | Render and submit `attributes` |
| `action: challenge` | Pick a method from `_embedded.methods`, follow its `challenge` link |
| `action: verify` | Submit password or OTP to `verify` link |
| `action: update` | Submit a new password to `update` link (`PUT`) |
| `action: poll` | Poll `poll` link until `state: continue` |

Links: `self`, `discover`, `challenge`, `verify`, `resend`,
`submitAttributes`, `update`, `poll`, `continue`.

Embedded method: `{ id, type: "email" | "sms" | "password", hint, isPreferred, _links: { challenge, verify } }`.

## Resume authorization and get tokens

```text
POST /{tenant}/oauth2/v2.0/authorize-challenge   (form-encoded)
continuation_token={latest token from the state:continue response}
→ 200 { "code": "{authorization_code}" }   (short-lived, single-use)

POST /{tenant}/oauth2/v2.0/token   (form-encoded)
client_id={client_id}&grant_type=authorization_code&code={authorization_code}
→ 200 { token_type, expires_in, access_token, id_token, refresh_token }
```

`refresh_token` only if `offline_access` was in the initial scope.

## Token refresh (unchanged)

Refreshing tokens works the same as in V1: `POST /oauth2/v2.0/token` with
`grant_type=refresh_token`. Keep the app's existing refresh code unchanged;
it isn't part of the migration.

## Errors

OAuth endpoints: standard OAuth errors. Native auth endpoints: nested envelope
`{ "error": { "code", "message", "target", "timestamp", "traceId", "correlationId", "innerError": { "code", "details": [ { "code", "message", "attributeIds" } ] } } }`.

| Condition | Status / error | Client action |
| --- | --- | --- |
| Bad OAuth parameter | `400 invalid_request` | Fix; don't retry unchanged |
| Bad/expired auth code | `400 invalid_grant` | Restart authorization |
| App misconfigured | `400 invalid_client` | Fix app registration |
| Bad scope | `400 invalid_scope` | Request valid scopes |
| More auth needed | `401 InsufficientAuthorization` | Follow a journey link |
| Bad continuation token / state | `400 invalidRequest` | Restart the flow |
| Browser needed | `invalid_grant` + `web_redirect_required` | Web fallback |
| Throttled | `429` | Honor `Retry-After` |

Branch on stable codes, not messages. Keep `client-request-id`, `traceId`,
`correlationId`, `timestamp` for support, redacting secrets.

## Security requirements

- HTTPS only. Continuation tokens, codes, tokens, passwords, OTPs are secrets:
  never in URLs, logs, telemetry, exceptions, analytics.
- Don't reveal account existence (messages, timing, method-list differences).
- Display only masked `hint` values from the service.
- Don't cache credential responses or persist a flow across users.
- Don't auto-retry verify or password update after an ambiguous failure.
- Follow links exactly; reject unexpected cross-origin links.
- Respect server resend, attempt, throttling, and polling limits.
