# Approach guide: raw native auth API (`approach: api`)

The app calls the native auth HTTP endpoints itself (no MSAL native auth
SDK). This file lists everything that is specific to this approach. The
workflow, gates, and shared rules stay in `SKILL.md`.

## References for this approach

| File | Load when |
| --- | --- |
| [v1-api-reference.md](v1-api-reference.md) | Inventory and planning, to understand the V1 behavior you find |
| [v1-v2-mapping.md](v1-v2-mapping.md) | Planning and applying (always) |
| [v2-api-core.md](v2-api-core.md) | Planning, applying, and validating (always) |
| [v2-sign-in.md](v2-sign-in.md), [v2-sign-up.md](v2-sign-up.md), [v2-sspr.md](v2-sspr.md) | Planning, applying, and validating each in-scope flow |
| [validation-api.md](validation-api.md) | Planning (tests to add) and validating |
| [security-api.md](security-api.md) | Applying (rules for the code you write) and the security review |

If files disagree, the `v2-*.md` files win over the mapping.

## Inventory (Step 2)

In addition to the V1 call sites from `v1-detection-patterns.md`, find:

- The HTTP client or request helper and where it sets headers and encoding.
- Endpoint config: base URL, tenant subdomain, client ID, scopes.
- Response types and models for V1 responses.
- The CORS or dev proxy (web SPA), and any production proxy or gateway config
  the repo contains.
- UI that reads V1 response fields (`challenge_target_label`, `code_length`,
  `continuation_token`, `challenge_type`) or branches on V1 error codes
  (`user_not_found`, `invalid_oob_value`, `user_already_exists`, suberrors).
- Where tokens are stored after sign-in.
- How the app handles V1 `challenge_type: redirect` (browser sign-in, an
  error message, or nothing). V2 web fallback reuses it.

## Planning (Step 3)

- **Application profile rows:** Integration = "Raw native auth API V1",
  HTTP layer, dev/CORS proxy, production proxy.
- **Shared implementation steps:** add a V2 client next to the V1 client;
  config (reuse the existing base URL; add V2 endpoint paths; keep V1
  constants used by deferred flows);
  dev proxy changes (web SPA).
- **Scopes:** the V2 `authorize-challenge` request must send the scopes the
  V1 code requested today. Record them in the profile.
- **Behavior changes users will see:** sign-up order follows the service
  (email-first or attributes-first, plus extra `collectAttributes` pages);
  sign-in after sign-up or reset is part of the same V2 journey; web fallback
  restarts authentication; gap-list effects (for example users without an
  MFA method).
- **Error handling map:** for each V1 error the UI branches on, the V2
  condition from the flow reference and the UI message that should show.
  Keep messages generic where they could reveal whether an account exists.
  The bundled V2 references don't list every V2 error code yet (pending).
  Map only the conditions the flow references describe; handle anything
  else with the app's existing generic error, and say so in the plan.
- **Manual prerequisites:** tenant enrolled in the V2 preview; public client
  with native auth enabled; production proxy updates
  if the app uses one outside this repo.

## Applying (Step 6)

Leave token refresh code (`grant_type=refresh_token`) unchanged; it works the
same in V2. Follow "Code-change patterns" in [v1-v2-mapping.md](v1-v2-mapping.md):

1. Add the V2 client next to the V1 client; don't rewrite the V1 client while
   any flow stays on V1.
2. Keep V2 transaction state (latest continuation token and links) in memory.
3. Make each migrated flow response-driven (`state`/`action`), with web
   fallback for anything unhandled. Web fallback reuses the app's existing
   handling of V1 `challenge_type: redirect`; never add a new browser
   sign-in. Record which handling is reused in the plan.
4. Keep the UI, routes, and components; map `challenge_target_label` → `hint`
   and `code_length` → `codeLength`.
5. Update config and the dev proxy as the mapping describes.

## Security review (Step 7)

Apply the rules in [security-api.md](security-api.md) together with the
shared guardrails.

## Validating (Step 8)

Use the approach-specific checks and required tests in
[validation-api.md](validation-api.md).

## Report rows

- Manual follow-up: restart the dev proxy after proxy changes; update any
  production proxy or gateway outside this repo with the new V2 paths,
  headers, and methods.
