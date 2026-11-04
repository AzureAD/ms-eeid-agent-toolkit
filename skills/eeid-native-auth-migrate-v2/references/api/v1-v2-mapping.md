# V1 → V2 migration mapping and code patterns

If this file conflicts with the V2 references (`v2-*.md`), the V2
references win.

## What changes conceptually

| Aspect | V1 | V2 |
| --- | --- | --- |
| Driver | Client-driven: client sends `challenge_type`, errors drive steps | Server-driven: `state`, `action`, `_links` drive steps; the client handles only the steps in the flow's step table |
| Entry point | `/oauth2/v2.0/initiate`, `/signup/v1.0/start`, `/resetpassword/v1.0/start` | `/oauth2/v2.0/authorize-challenge` (401 with journey links) |
| URLs | Fixed endpoint per call | Two configured endpoints (`authorize-challenge`, `token`); every other URL is a link from the latest response |
| URL host path | `/{subdomain}.onmicrosoft.com/...` | Same base URL: `/{subdomain}.onmicrosoft.com/...` or `/{tenant-GUID}/...` |
| Encoding | Form-encoded everywhere | Form for OAuth calls; JSON for every link |
| Token field | `continuation_token` | `continuation_token` (OAuth) / `continuationToken` (JSON) |
| `client_id` | On every request | Only on the first `authorize-challenge` and on `/token` |
| Credential verify | `/oauth2/v2.0/token` with `grant_type=password\|oob\|mfa_oob` | the `verify` link |
| Tokens | Directly from `/token` | `state: continue` → resume `authorize-challenge` → `code` → `/token` with `grant_type=authorization_code` |
| Token refresh | `/token` with `grant_type=refresh_token` | **Unchanged.** Keep the app's existing refresh code as it is. |
| Methods | Implicit via `challenge_type` | Explicit `_embedded.methods` |
| OTP info | `challenge_target_label`, `code_length` | `hint`, `codeLength` |
| OTP field | `oob` | `otp` |
| Resend a code | Call the flow's `challenge` endpoint again | `POST` the `resend` link from the latest `verify` (or `activate`) response |
| Client capabilities | `capabilities` (`mfa_required registration_required`) on `initiate` | None. Don't send it; MFA and JIT come from the response (`challenge` with `multiFactor`, `enroll`) |
| Resend interval, throttling | `interval` in sign-up challenge responses; app-side waits | No equivalent field. The service enforces its limits; a throttling error uses the app's generic error |
| MFA | `mfa_required` error → `/introspect` → `/challenge` + `id` → `/token` `mfa_oob` | `action: challenge` with `multiFactor` after the first verify |
| JIT registration | `registration_required` → `/register/v1.0/*` | `action: enroll` → `enroll` → `activate` |
| Errors | Flat `error`, `suberror` | OAuth errors, or nested HAL `error.code` / `innerError` (`v2-errors.md`) |
| Fallback | `challenge_type: redirect` | `suberror: web_redirect_required`, `error.code: redirect_to_web`, or `state: webFallbackRequired` (any endpoint), or any unhandled response |

## Flow mapping

### `sign-in`

| V1 | V2 |
| --- | --- |
| `initiate` (`username`, `challenge_type`, `capabilities`) | `authorize-challenge` (`client_id`, `scope`) → `POST sign_in` link `{continuationToken, username}`; `challenge_type` and `capabilities` are dropped |
| `challenge` | pick a method from `_embedded.methods` → `POST` its `challenge` link (SMS may add `riskverify`) |
| `token` `grant_type=password` / `oob` | `POST verify` link `{continuationToken, password}` / `{continuationToken, otp}` |
| `mfa_required` → `introspect` → `challenge(id)` → `token mfa_oob` | `challenge` (`multiFactor`) after verify → challenge + verify the second factor |
| `registration_required` → `/register/v1.0/*` | `enroll` → `v2-jit-registration.md` |
| `register/v1.0/challenge` → `challenge_type: preverified` (no code) | no equivalent: `enroll` always returns `activate` and sends a code |
| tokens from `token` | `state: continue` → `authorize-challenge {continuation_token}` → `code` → `token` `grant_type=authorization_code` |

### `sign-up`

| V1 | V2 |
| --- | --- |
| `signup/v1.0/start` (`username`, `password`, `attributes`, `challenge_type`) | `authorize-challenge` → `POST sign_up` link `{continuationToken, username}` only; password and attributes wait for `collectAttributes` |
| `user_already_exists` from `start` | `action: challenge` from sign-up start → the app's V1 `user_already_exists` handling |
| `signup/v1.0/challenge` (OTP sent) | the code is sent by sign-up start (`action: verify`, `type: email`) |
| `signup/v1.0/continue` `grant_type=oob` | `POST verify` link `{continuationToken, otp}` |
| `continue` `grant_type=password` / `attributes`, `credential_required`, `attributes_required` | `collectAttributes` → `POST submitAttributes` `{continuationToken, attributes}` (password is an attribute) |
| optional auto sign-in `token grant_type=continuation_token` | `state: continue` → finish with tokens (only if V1 did) |

### `sspr`

| V1 | V2 |
| --- | --- |
| `resetpassword/v1.0/start` | `authorize-challenge` → `POST reset_password` link `{continuationToken, username}` |
| `resetpassword/v1.0/challenge` | `POST` the email method's `challenge` link |
| `resetpassword/v1.0/continue` `oob` | `POST verify` link `{continuationToken, otp}` |
| `resetpassword/v1.0/submit` `new_password` | `PUT update` link `{continuationToken, newPassword}` |
| `resetpassword/v1.0/poll_completion` (`status`, `poll_interval`) | `POST poll` link until `state: continue` (the V1 app's own interval and limit, or 1.5 s apart, at most 5 attempts; see `v2-sspr.md`) |
| `status: not_started` / `in_progress` | `action: poll` (keep polling with the new token and link) |
| `status: succeeded` | `state: continue` |
| `status: failed` | an error body → the app's generic reset error |
| optional `token grant_type=continuation_token` | finish with tokens (only if V1 did) |

## Code-change patterns (apply in the app's own language and style)

Follow the app's existing code patterns, coding style, and standards on
every platform: its HTTP stack, error types, concurrency model, state
management, naming, folder layout, and lint rules. The patterns below say
**what** the V2 code must do, not how it should look. Never copy code from
an MSAL SDK into the app.

1. **Add a small V2 client next to the V1 client** (don't rewrite the V1
   client — deferred V1 flows still use it). It provides:
   - `authorizeChallenge(params)` → form POST to the configured
     `authorize-challenge`. Used twice per flow: start (`client_id`,
     `scope`, optional `claims`; 401 with `continuation_token` is success)
     and resume (`continuation_token` → `code`).
   - `exchangeCode(code)` → form POST to the configured `/token`.
   - `send(link, body, method = "POST")` → resolve the link, send JSON with
     the per-flow `client-request-id`, and pass the response to the HAL
     handler.
   - `resolveLink(href)` → the link resolver from `v2-api-core.md`.
   - normalized errors: keep the codes and `correlationId`, `traceId`;
     never copy request bodies or tokens into error objects.
2. **Add the HAL response handler** (`v2-api-core.md`), or reuse the app's
   existing HAL handling if it meets the same rules.
3. **Keep V2 transaction state where the V1 code keeps its continuation
   token** (for example a module, store, or view model in client apps, or
   the user's server-side session in a server-rendered web app), with the
   same per-user scope (SEC-03): the latest continuation token and the
   allowed links for the current step. Replace both after every response. Pass only non-secret UI
   data (masked `hint`, `codeLength`) between screens.
4. **Make each flow a step table in code:** for the current step, check
   `state`/`action` against the step's handled responses, take only the
   step's allowed links, and move to the next step. Everything else → the
   unhandled outcome, handled exactly as the V1 code handles
   `challenge_type: redirect` today (its existing browser sign-in or error
   message). Don't add a new browser sign-in. If the V1 code has no redirect
   handling, show the app's existing generic error.
5. **Keep the UI.** Same pages, routes, and form fields. Map
   `challenge_target_label` → `hint`, `code_length` → `codeLength`. Handle
   only the methods and steps the V1 UI handled (parity rule).
6. **Config:** reuse the app's existing base URL (domain or GUID form) for
   every environment it defines. Add only the `authorize-challenge` path;
   `/token` usually exists already. Keep V1 endpoint constants while any
   flow stays on V1. Remove them only when no V1 flow remains.
7. **Pages reading token fields:** V2 token responses may omit `scope`; make
   UI tolerate missing optional fields.

### Example: V2 client core in TypeScript (browser app)

This example shows the required behavior in one language. Don't copy its
style into an app that does things differently; match the app.

```ts
// client/v2/nativeAuthV2.ts
import { CLIENT_ID, ENV_V2 } from "../../config"; // baseUrl

export class NativeAuthV2Error extends Error {
  constructor(public code: string, public innerCode?: string, public details: { code?: string; attributeIds?: string[] }[] = [],
              public subError?: string, public errorCodes: number[] = [], public correlationId?: string) {
    super(code);
  }
}
export class UnhandledResponseError extends Error {} // → web fallback or generic error

let requestId = crypto.randomUUID();
export const newFlow = () => { requestId = crypto.randomUUID(); };

// Links are always relative (with or without a leading "/", or starting with a
// "{tenant}" placeholder): rebase them from their /api/ or /oauth2/ segment.
// An absolute link is an error and is never followed.
export function resolveLink(href: unknown): string {
  if (typeof href !== "string" || !href.trim()) throw new UnhandledResponseError("missing link");
  const link = href.trim();
  if (link.startsWith("//") || link.includes("://")) throw new UnhandledResponseError("rejected link");
  const marker = link.search(/\/(api|oauth2)\//);
  if (marker < 0) throw new UnhandledResponseError("rejected link");
  return `${ENV_V2.baseUrl}${link.slice(marker)}`;
}

// HAL handler: web fallback first, then errors, found by the body, not the status.
async function parse(res: Response) {
  const body = await res.json().catch(() => { throw new UnhandledResponseError("not json"); });
  const correlationId = res.headers.get("x-ms-request-id") ?? requestId;
  const err = body.error;
  if (body.suberror === "web_redirect_required" || err?.code === "redirect_to_web" || body.state === "webFallbackRequired") {
    throw new UnhandledResponseError("web fallback required");
  }
  if (err && typeof err === "object") {
    throw new NativeAuthV2Error(err.code ?? "unexpected_error", err.innerError?.code, err.innerError?.details ?? [],
      undefined, [], err.correlationId ?? correlationId);
  }
  if (typeof err === "string" && !body.continuation_token) {
    throw new NativeAuthV2Error(err, undefined, [], body.suberror, body.error_codes ?? [], body.correlation_id ?? correlationId);
  }
  return body;
}

export async function send(link: unknown, body: { continuationToken: string } & Record<string, unknown>, method: "POST" | "PUT" = "POST") {
  if (!body.continuationToken) throw new UnhandledResponseError("missing token");
  const res = await fetch(resolveLink(link), {
    method,
    headers: { "Content-Type": "application/json", "client-request-id": requestId },
    body: JSON.stringify(body),
  });
  const data = await parse(res);
  if (typeof data.continuationToken !== "string" || !data.continuationToken) throw new UnhandledResponseError("missing token");
  return data; // { continuationToken, state, action, _links, _embedded, ... }
}

async function oauthPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${ENV_V2.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "client-request-id": requestId },
    body: new URLSearchParams(params),
  });
  return parse(res);
}

// Pass the scopes the V1 code requests today; never invent or broaden them.
export async function startAuthorization(scope: string) {
  newFlow();
  const data = await oauthPost("/oauth2/v2.0/authorize-challenge", { client_id: CLIENT_ID, scope });
  if (!data.continuation_token) throw new UnhandledResponseError("no continuation token");
  return data as { continuation_token: string; sign_in?: string; sign_up?: string; reset_password?: string };
}

// state: continue → resume at the configured endpoint (never _links.continue).
export async function completeAuthorization(continuationToken: string) {
  const resumed = await oauthPost("/oauth2/v2.0/authorize-challenge", { continuation_token: continuationToken });
  if (!resumed.code) throw new NativeAuthV2Error("authorization_code_missing");
  const tokens = await oauthPost("/oauth2/v2.0/token", { client_id: CLIENT_ID, grant_type: "authorization_code", code: resumed.code });
  if (!tokens.access_token) throw new NativeAuthV2Error("invalid_token_response");
  return tokens; // { token_type, expires_in, access_token, id_token, refresh_token }
}
```

A flow then checks each response against its step table, for example:

```ts
// sign-in, step 5 (verify): only these outcomes are handled.
const r = await send(state.links.verify, { continuationToken: state.token, password });
if (r.state === "continue") return completeAuthorization(r.continuationToken);
if (r.action === "challenge" && r.challengeContext?.authenticationFactor === "multiFactor" && appHadV1Mfa) {
  return showMfaMethods(r); // keeps only each usable method's challenge link
}
throw new UnhandledResponseError(`unhandled ${r.state}/${r.action}`);
```

Other platforms and languages (iOS, macOS, Android, Flutter, React Native,
MAUI, server-rendered web apps, and so on): there's no bundled example.
Implement the same behavior (start and resume authorization, HAL handler,
link resolver, step tables, latest continuation token) inside the app's
existing networking and auth code, using its HTTP stack (for example
`URLSession`, OkHttp/Retrofit, Ktor, Dart `http`, `HttpClient`, the
server's HTTP client), concurrency style, and conventions. The V2 contract
checklist and required tests in `validation-api.md` check the behavior.

## Dev/CORS proxy gotchas (browser-context calls)

These apply only when the native auth calls run in a browser context: an
SPA, JavaScript in server-rendered pages, a hybrid web-view app (Ionic,
Capacitor, Cordova), or an Electron renderer. Native code, servers, and an
Electron main process call the endpoints directly and need no proxy.

Native auth endpoints don't support CORS, so browser apps use a local proxy
(for example `cors.js` mapping `/api/*` → `https://{sub}.ciamlogin.com/{tenant}`).
V2 needs these proxy changes:

- **Answer `OPTIONS` preflight locally with `204`**. V2 sends
  `Content-Type: application/json` and `client-request-id`, so browsers
  preflight; forwarding `OPTIONS` upstream fails the preflight.
- Allow headers: `Content-Type, client-request-id`; allow `PUT` (password
  update). Expose `x-ms-request-id` if the app reads it.
- The proxy target keeps the app's existing tenant path
  (`{subdomain}.onmicrosoft.com` or the GUID).
- The link resolver rebases links onto the proxy base. With a proxy base of
  `/api`, V2 native auth calls become `{proxy}/api/api/v2.0/...` — expected,
  not a bug. Keep the query string (for example `?dc=…`).
