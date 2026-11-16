# Approach guide: raw native auth API (`approach: api`)

The app calls the native auth HTTP endpoints itself (no MSAL native auth
SDK). This file lists everything that is specific to this approach. The
workflow and gates stay in `SKILL.md`; shared procedures are in
[../migration-lifecycle.md](../migration-lifecycle.md),
[../security-guardrails.md](../security-guardrails.md), and
[../validation-strategy.md](../validation-strategy.md).

## References for this approach

| File | Load when |
| --- | --- |
| [v1-api-reference.md](v1-api-reference.md) | Inventory and planning, to understand the V1 behavior you find |
| [v1-v2-mapping.md](v1-v2-mapping.md) | Planning and applying (always) |
| [v2-api-core.md](v2-api-core.md) | Planning, applying, and validating (always) |
| [v2-sign-in.md](v2-sign-in.md), [v2-sign-up.md](v2-sign-up.md), [v2-sspr.md](v2-sspr.md) | Planning, applying, and validating each in-scope flow |
| [v2-jit-registration.md](v2-jit-registration.md) | Planning, applying, and validating when the app's V1 code handles `registration_required` |
| [v2-errors.md](v2-errors.md) | Planning (error mapping), applying, and validating (always) |
| [validation-api.md](validation-api.md) | Planning (tests to add) and validating |
| [security-api.md](security-api.md) | Applying (rules for the code you write) and the security review |

If files disagree, the `v2-*.md` files win over the mapping.

## Inventory (Step 2)

In addition to the V1 call sites from `references/v1-detection-patterns.md`, find:

- The HTTP client or request helper and where it sets headers and encoding.
- Endpoint config: base URL, tenant subdomain, client ID, scopes, and how
  the tenant gets into the service URL in each environment (a full URL
  value, or built from parts).
- Response types and models for V1 responses.
- Where the V1 calls run: in a **browser context** (an SPA, JavaScript in
  server-rendered pages, a hybrid web-view app such as Ionic, Capacitor, or
  Cordova, or an Electron renderer) or outside one (native code, a server,
  an Electron main process). Browser-context calls go through a CORS or dev
  proxy, because the endpoints don't support CORS; find it, and any
  production proxy or gateway config the repo contains.
- Where the V1 code keeps its continuation token (memory, server-side
  session, or somewhere else); V2 flow state goes in the same place
  (SEC-03).
- UI that reads V1 response fields (`challenge_target_label`, `code_length`,
  `continuation_token`, `challenge_type`) or branches on V1 error codes
  (`user_not_found`, `invalid_oob_value`, `user_already_exists`, suberrors).
- Where tokens are stored after sign-in.
- How the app handles V1 `challenge_type: redirect` (browser sign-in, an
  error message, or nothing). V2 web fallback reuses it.
- Which methods and steps the V1 UI handles, per flow (parity rule in
  `references/flows-and-scope.md`): password, email OTP, SMS OTP, MFA
  (`mfa_required`, `introspect`), JIT registration (`registration_required`,
  `/register/v1.0/*`), method choice screens, dynamic sign-up attributes
  (`attributes_required`), automatic sign-in after sign-up or reset
  (`grant_type=continuation_token`), and whether that automatic sign-in
  handles `mfa_required` and `registration_required` (V2 asks for MFA or
  registration inside the sign-up or reset flow), what the UI does on
  `user_already_exists`, and the SSPR polling interval and limit (its own
  constants, or the server's `poll_interval`).
- Any existing HAL or hypermedia response handling the app has for other
  APIs (a reuse candidate for the V2 HAL handler).

## Planning (Step 3)

- **What we found:** Native auth today = "Raw native auth API V1" and the
  file with the HTTP layer; Config = the config file and the dev/CORS
  proxy.
- **Shared files to change:** add a V2 client next to the V1 client;
  config (reuse the existing base URL, with the tenant ID as **Tenant ID**
  says; add V2 endpoint paths; keep V1 constants used by deferred flows);
  dev proxy changes (browser-context calls only), including its target.
- **Tenant ID:** follow **Tenant ID in the service path** in
  [../flows-and-scope.md](../flows-and-scope.md).
  - **What to check:** calls made outside a browser context: the base URL
    or endpoint values. Browser-context calls: the target of the dev proxy
    in the repo. For browser-context calls, always add the "Risks and
    actions for you" item for the proxy or gateway used outside local
    development, because the repo's proxy is usually only for local testing.
  - **Where it goes:** one full base URL value (a constant, an environment
    variable, a config key) → replace the tenant segment in that value. A
    URL built from parts (for example a tenant subdomain plus
    `.onmicrosoft.com`) → add the tenant ID next to the existing tenant
    setting and build the path from it; the subdomain stays for the host.
    V1 endpoint values used only by deferred flows can stay as they are.
    The dev proxy → its target, set the way the proxy sets it today.
- **Scopes:** the V2 `authorize-challenge` request must send the scopes the
  V1 code requested today. Record them in `working-notes.md`.
- **Supported steps per flow:** the methods and sub-flows the V1 UI
  handles (parity rule); every other step in the V2 step table goes to the
  unhandled outcome. Record, for each flow, whether it signs the user in
  after sign-up or reset, and what sign-up does when the account exists.
- **HAL handler:** new, or the app's existing HAL handling reused.
- **What users will notice (section 3):** sign-up sends the email first and the
  password and attributes after the code is verified (the screens can stay
  the same); the service may ask for extra sign-up attributes; steps the V1
  UI never handled go to web fallback (for example a user who must register
  an MFA method in an app without V1 JIT registration); a user asked to add
  the email they just signed in with as a method now gets a code to enter
  (V1 skipped the code); web fallback restarts authentication.
- **V2-native options:** where keeping the V1 behavior has a real cost (for
  example one-screen sign-up holding the password in memory until V2 asks
  for it), add a "Decisions needed" item with both choices and keeping V1
  as the default ("V2-native options" in
  [../flows-and-scope.md](../flows-and-scope.md)).
- **Error mapping (`working-notes.md`):** for each V1 error the UI branches on, the V2
  condition from [v2-errors.md](v2-errors.md) and the UI message that
  should show. Keep V1's messages and each distinction the V1 UI made,
  including any service error text it showed (**When a rule conflicts with
  V1's behavior** in [../security-guardrails.md](../security-guardrails.md)).
  Note each conflict under "Security notes" in `working-notes.md` (for
  example SEC-06); the security review reports it as a pre-existing finding. Anything else uses the
  fallback the V1 code has for that call.
- **Risks and actions for you:** production proxy updates if the app uses
  one outside this repo. Don't list the app registration (public client,
  native auth enabled): an app already on V1 has it.

## Applying (Step 6)

Leave token refresh code (`grant_type=refresh_token`) unchanged; it works the
same in V2. Follow "Code-change patterns" in [v1-v2-mapping.md](v1-v2-mapping.md):

1. Add the V2 client next to the V1 client; don't rewrite the V1 client while
   any flow stays on V1.
2. Add the HAL response handler, or reuse the app's existing one as the plan
   says.
3. Keep V2 transaction state (latest continuation token and allowed links)
   where the V1 code keeps its continuation token, with the same per-user
   scope (SEC-03).
4. Implement each migrated flow as its step table: handle only the listed
   responses for the current step, follow only the allowed links, and send
   everything else to the unhandled outcome. Web fallback reuses the app's
   existing handling of V1 `challenge_type: redirect`; never add a new
   browser sign-in.
5. Keep the UI, routes, and components; map `challenge_target_label` → `hint`
   and `code_length` → `codeLength`. Map only what the V1 code read; a
   field it didn't use stays unused (**No improvements** in
   [../flows-and-scope.md](../flows-and-scope.md)).
6. Update config and the dev proxy as the mapping describes.

## Security review (Step 7)

Apply the rules in [security-api.md](security-api.md) together with the
shared guardrails.

## Validating (Step 8)

Use the approach-specific checks and required tests in
[validation-api.md](validation-api.md).

## Report rows

- Actions for you: restart the dev proxy after proxy changes; update any
  production proxy or gateway outside this repo with the tenant ID path and
  the new V2 paths,
  headers, and methods.
