# Detecting native auth V1 usage

Search source files (skip `node_modules`, `build`, `dist`, `Pods`, `.gradle`,
lock files). Report each hit with file, line, flow ID, and kind.

## Raw API V1 — endpoints

| Pattern | Flow | Notes |
| --- | --- | --- |
| `oauth2/v2.0/initiate` | `sign-in` | V1 sign-in start |
| `oauth2/v2.0/challenge` | `sign-in` | V1 challenge (also MFA, with `id`) |
| `oauth2/v2.0/introspect` | `sign-in` (MFA) | V1 MFA method discovery |
| `oauth2/v2.0/token` | `sign-in`, plus auto sign-in after `sign-up`/`sspr` | V1 only with `grant_type` `password`, `oob`, `mfa_oob`, or `continuation_token`. **Not V1:** `grant_type=refresh_token` (token refresh, unchanged in V2; leave it alone) and `grant_type=authorization_code` (V2 code exchange). |
| `register/v1.0/introspect`, `register/v1.0/challenge`, `register/v1.0/continue` | `sign-in` (JIT) | **V2 gap** — see flows-and-scope.md |
| `signup/v1.0/start`, `signup/v1.0/challenge`, `signup/v1.0/continue` | `sign-up` | |
| `resetpassword/v1.0/start`, `/challenge`, `/continue`, `/submit`, `/poll_completion` | `sspr` | |

Endpoints are often built from config constants (for example
`urlOauthInit`, `urlSignupStart`, `urlResetPwdStart`). Follow the constant
to every caller.

## Raw API V1 — request/response markers

- Form-encoded bodies (`application/x-www-form-urlencoded`, `URLSearchParams`)
  with `client_id`, `challenge_type` (`password oob redirect`, `oob redirect`),
  `continuation_token`, `grant_type` (`password`, `oob`, `mfa_oob`,
  `continuation_token`, `attributes`), `oob`, `capabilities`.
- Response fields: `continuation_token`, `challenge_type`,
  `challenge_target_label`, `challenge_channel`, `code_length`,
  `binding_method`, `poll_interval`, `status` (`succeeded`, `in_progress`).
- Error-driven flow control: `credential_required`, `attributes_required`,
  `required_attributes`, `mfa_required`, `registration_required`,
  `invalid_oob_value`, `user_not_found`, `user_already_exists`,
  `challenge_type === "redirect"`.
- Host: `ciamlogin.com`, often behind a local dev/CORS proxy (V1 endpoints
  don't support CORS), for example a `cors.js` + `proxy.config.js` pair.

## Already V2 (don't migrate again)

`authorize-challenge`, `/api/v0.1/`, `application/hal+json`, `_links`,
`_embedded`, `continuationToken` (camelCase), `state: "interactionRequired"`,
`action: "verify"`.

## Native auth SDK (out of scope → stop)

- Apple: `MSALNativeAuthPublicClientApplication`, `MSALNativeAuth*`.
- Android: `INativeAuthPublicClientApplication`,
  `PublicClientApplication.createNativeAuthPublicClientApplication`,
  `NativeAuth*`.
- JavaScript: `CustomAuthPublicClientApplication`, `@azure/msal-custom-auth`,
  `customAuth` config in `@azure/msal-browser`.
