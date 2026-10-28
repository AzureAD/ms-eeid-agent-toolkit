# V1 → V2 migration mapping and code patterns

If this file conflicts with the V2 references (`v2-*.md`), the V2
references win.

## What changes conceptually

| Aspect | V1 | V2 |
| --- | --- | --- |
| Driver | Client-driven: client sends `challenge_type`, errors drive steps | Server-driven: `state`, `action`, `_links` drive steps |
| Entry point | `/oauth2/v2.0/initiate`, `/signup/v1.0/start`, `/resetpassword/v1.0/start` | `/oauth2/v2.0/authorize-challenge` (401 with journey links) |
| URL host path | `/{subdomain}.onmicrosoft.com/...` | Same base URL: `/{subdomain}.onmicrosoft.com/...` or `/{tenant-GUID}/...` |
| Encoding | Form-encoded everywhere | Form for OAuth calls; JSON + `Accept: application/hal+json` for `/api/v0.1/...` |
| Token field | `continuation_token` | `continuation_token` (OAuth) / `continuationToken` (JSON) |
| Credential verify | `/oauth2/v2.0/token` with `grant_type=password\|oob\|mfa_oob` | advertised `verify` link |
| Tokens | Directly from `/token` | `state: continue` → resume `authorize-challenge` → `code` → `/token` with `grant_type=authorization_code` |
| Token refresh | `/token` with `grant_type=refresh_token` | **Unchanged.** Keep the app's existing refresh code as it is. |
| Methods | Implicit via `challenge_type` | Explicit `_embedded.methods` |
| OTP info | `challenge_target_label`, `code_length` | `hint`, `codeLength` |
| OTP field | `oob` | `otp` |
| MFA | `mfa_required` error → `/introspect` → `/challenge` + `id` → `/token` `mfa_oob` | another `action: challenge` with methods after first-factor verify |
| Errors | Flat `error`, `suberror` | OAuth errors or nested `error.code` / `innerError.details` |
| Fallback | `challenge_type: redirect` | `invalid_grant` + `web_redirect_required`, or any response the client can't handle |

## Flow mapping

### `sign-in`

| V1 | V2 |
| --- | --- |
| `initiate` (`username`, `challenge_type`) | `authorize-challenge` (`client_id`, `scope`, `response_type=code`) → `POST sign_in` link `{continuationToken, username}` |
| `challenge` | pick method from `_embedded.methods` → `POST` its `challenge` link |
| `token` `grant_type=password` / `oob` | `POST verify` link `{continuationToken, password}` / `{continuationToken, otp}` |
| `mfa_required` → `introspect` → `challenge(id)` → `token mfa_oob` | handle `action: challenge` after verify → challenge + verify second factor |
| `registration_required` → `/register/v1.0/*` | **gap** — not supported in preview |
| tokens from `token` | `state: continue` → `authorize-challenge {continuation_token}` → `code` → `token` `grant_type=authorization_code` |

### `sign-up`

| V1 | V2 |
| --- | --- |
| `signup/v1.0/start` (`username`, `password`, `attributes`, `challenge_type`) (attribute names are the same in V1 and V2; keep the app's names, including custom `extension_…` attributes) | `authorize-challenge` → `POST sign_up` link `{continuationToken}` → `submitAttributes` `{continuationToken, attributes:{email, password, givenName, surname}}` (attributes-first when the form has everything) |
| `signup/v1.0/challenge` (OTP sent) | OTP is sent by the service when it returns `action: verify` |
| `signup/v1.0/continue` `grant_type=oob` | `POST verify` link `{continuationToken, otp}` |
| `continue` `grant_type=password` / `attributes`, `credential_required`, `attributes_required` | further `collectAttributes` responses → `submitAttributes` |
| optional auto sign-in `token grant_type=continuation_token` | `state: continue` → resume authorization → code → token |

### `sspr`

| V1 | V2 |
| --- | --- |
| `resetpassword/v1.0/start` | `authorize-challenge` → `POST reset_password` link `{username, continuationToken}` |
| `resetpassword/v1.0/challenge` | `POST` email method `challenge` link |
| `resetpassword/v1.0/continue` `oob` | `POST verify` link `{otp, continuationToken}` |
| `resetpassword/v1.0/submit` `new_password` | `PUT update` link `{newPassword, continuationToken}` |
| `resetpassword/v1.0/poll_completion` (`status`) | `POST poll` link until `state: continue` |
| optional `token grant_type=continuation_token` | resume authorization → code → token |

## Code-change patterns (apply in the app's own language and style)

Follow the app's existing code patterns, coding style, and standards on
every platform: its HTTP stack, error types, concurrency model, state
management, naming, folder layout, and lint rules. The patterns below say
**what** the V2 code must do, not how it should look.

1. **Add a small V2 client next to the V1 client** (don't rewrite the V1
   client — deferred V1 flows still use it). It provides:
   - `startAuthorization()` → form POST to `authorize-challenge`; treat
     HTTP 401 `InsufficientAuthorization` as the normal result; return the
     `continuation_token` and journey links.
   - `followLink(href, body, method = "POST")` → JSON request with
     `Accept: application/hal+json` and a per-flow `client-request-id`.
   - `completeAuthorization(continuationToken)` → resume
     `authorize-challenge`, then exchange `code` at `/token`.
   - `resolveLink(href)` → validate and map a returned link to a request URL.
   - normalized errors: keep `code`, `traceId`, `correlationId`; never copy
     request bodies or tokens into error objects.
2. **Keep V2 transaction state in memory** (module, service, store, or view
   model): latest continuation token + latest links. Replace both after every
   response. Pass only non-secret UI data (masked `hint`, `codeLength`)
   between screens.
3. **Make each flow response-driven:** a `switch` on `state`/`action` that
   handles what the existing UI supports (`challenge`, `verify`,
   `collectAttributes`, `update`, `poll`, `continue`). Everything else →
   web fallback, handled exactly as the V1 code handles
   `challenge_type: redirect` today (for example, its existing browser
   sign-in, or its existing error message). Don't add a new browser sign-in.
   If the V1 code has no redirect handling, show the app's existing generic
   error.
4. **Keep the UI.** Same pages, routes, and form fields. Map
   `challenge_target_label` → `hint`, `code_length` → `codeLength`.
5. **Config:** reuse the app's existing base URL (domain or GUID form) for
   every environment it defines. Add only the V2 endpoint paths; keep V1
   endpoint constants while any flow stays on V1. Remove them only when no
   V1 flow remains.
6. **Pages reading token fields:** V2 token responses may omit `scope`; make
   UI tolerate missing optional fields.

### Example: V2 client in TypeScript (web SPA)

This example shows the required behavior in one language. Don't copy its
style into an app that does things differently; match the app.

```ts
// client/v2/NativeAuthV2Client.ts
import { CLIENT_ID, ENV_V2 } from "../../config";

export class NativeAuthV2Error extends Error {
  constructor(public code: string, public status: number, public traceId?: string, public correlationId?: string) {
    super(code);
  }
}
export class WebFallbackRequiredError extends Error {}

let requestId = crypto.randomUUID();
export const newFlow = () => { requestId = crypto.randomUUID(); };

// Links look like "/{tenant}/api/v0.1/...". Accept only this tenant's paths
// (or absolute URLs on the expected host) and map them to the configured base.
export function resolveLink(href: string): string {
  const url = new URL(href, `https://${ENV_V2.expectedHost}`);
  if (url.host !== ENV_V2.expectedHost) throw new NativeAuthV2Error("unexpected_link_authority", 0);
  const prefix = `/${ENV_V2.tenantPath}/`; // "contoso.onmicrosoft.com" or the tenant GUID, as configured
  if (!url.pathname.startsWith(prefix)) throw new NativeAuthV2Error("unexpected_link_path", 0);
  return `${ENV_V2.baseUrl}/${url.pathname.slice(prefix.length)}${url.search}`;
}

export async function followLink(href: string, body: object, method: "POST" | "PUT" = "POST") {
  const res = await fetch(resolveLink(href), {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/hal+json", "client-request-id": requestId },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error ?? {};
    throw new NativeAuthV2Error(e.code ?? String(res.status), res.status, e.traceId, e.correlationId);
  }
  return data; // { continuationToken, state, action, _links, _embedded, ... }
}

async function oauthPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${ENV_V2.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "client-request-id": requestId },
    body: new URLSearchParams(params),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// Pass the scopes the V1 code requests today; never invent or broaden them.
export async function startAuthorization(scope: string) {
  newFlow();
  const { status, data } = await oauthPost("/oauth2/v2.0/authorize-challenge", {
    client_id: CLIENT_ID, scope, response_type: "code",
  });
  if (status !== 401 || !data.continuation_token) throw new NativeAuthV2Error(data.error ?? "authorize_failed", status);
  return data as { continuation_token: string; sign_in?: string; sign_up?: string; reset_password?: string };
}

export async function completeAuthorization(continuationToken: string) {
  const resumed = await oauthPost("/oauth2/v2.0/authorize-challenge", { continuation_token: continuationToken });
  if (resumed.data.error === "invalid_grant" && resumed.data.suberror === "web_redirect_required") throw new WebFallbackRequiredError();
  if (resumed.status !== 200 || !resumed.data.code) throw new NativeAuthV2Error(resumed.data.error ?? "resume_failed", resumed.status);
  const token = await oauthPost("/oauth2/v2.0/token", {
    client_id: CLIENT_ID, grant_type: "authorization_code", code: resumed.data.code,
  });
  if (token.status !== 200) throw new NativeAuthV2Error(token.data.error ?? "token_failed", token.status);
  return token.data; // { token_type, expires_in, access_token, id_token, refresh_token }
}
```

iOS, macOS, and Android apps: there's no bundled example. Implement the
same behavior (start authorization, follow validated links, keep the
latest continuation token, complete authorization) inside the app's
existing networking and auth code, using its HTTP stack (for example
`URLSession`, OkHttp/Retrofit, Ktor), concurrency style, and conventions.
The V2 contract checklist and required tests in `validation-api.md` check
the behavior.

## Web SPA dev/CORS proxy gotchas

Native auth endpoints don't support CORS, so SPA samples use a local proxy
(for example `cors.js` mapping `/api/*` → `https://{sub}.ciamlogin.com/{tenant}`).
V2 needs these proxy changes:

- **Answer `OPTIONS` preflight locally with `204`**. V2 sends
  `Content-Type: application/json` and `client-request-id`, so browsers
  preflight; forwarding `OPTIONS` upstream fails the preflight.
- Allow headers: `Content-Type, Accept, client-request-id`; allow `PUT`
  (password update).
- The proxy target keeps the app's existing tenant path
  (`{subdomain}.onmicrosoft.com` or the GUID).
- Map returned links through `resolveLink` (strip `/{tenant}`, prefix the
  proxy base). With a proxy base of `/api`, V2 native auth calls become
  `{proxy}/api/api/v0.1/...` — expected, not a bug.
