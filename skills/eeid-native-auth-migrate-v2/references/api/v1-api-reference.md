# Native auth API V1 (what you are migrating from)

Source: [Native authentication API reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-native-authentication-api?tabs=emailOtp).

- Base URL: `https://{tenant_subdomain}.ciamlogin.com/{tenant_subdomain}.onmicrosoft.com/`
- Every call: `POST`, `Content-Type: application/x-www-form-urlencoded`, JSON
  response, `client_id` on every request.
- Client-driven: the client advertises `challenge_type` (always including
  `redirect`) and optional `capabilities` (`mfa_required`,
  `registration_required`). Errors drive the next step.
- `{"challenge_type": "redirect"}` (HTTP 200) on any call → switch to browser flow.
- Error shape: `error`, `error_description`, `error_codes`, `timestamp`,
  `trace_id`, `correlation_id`, optional `suberror`.

## Sign-in

| Call | Key params | Result |
| --- | --- | --- |
| `POST oauth2/v2.0/initiate` | `username`, `challenge_type` | `continuation_token` (errors: `user_not_found`, `unsupported_challenge_type`) |
| `POST oauth2/v2.0/challenge` | `continuation_token`, `challenge_type`, optional `id` (MFA) | `challenge_type: password` or `oob` + `challenge_target_label`, `challenge_channel`, `code_length`, `binding_method` |
| `POST oauth2/v2.0/token` | `continuation_token`, `grant_type` (`password` + `password`, `oob` + `oob`, `mfa_oob` + `oob`, `continuation_token`), `scope` | tokens: `token_type`, `scope`, `expires_in`, `access_token`, `refresh_token`, `id_token` |

- MFA: token returns `invalid_grant` + `suberror: mfa_required` →
  `POST oauth2/v2.0/introspect` (`methods[]`: `id`, `challenge_type`,
  `challenge_channel`, `login_hint`) → `challenge` with `id` → `token` with
  `grant_type=mfa_oob`.
- JIT registration: token returns `suberror: registration_required` →
  `register/v1.0/introspect` → `register/v1.0/challenge`
  (`challenge_type=oob`, `challenge_channel`, `challenge_target`) →
  `register/v1.0/continue` (`grant_type=oob`, `oob`) → `token` with
  `grant_type=continuation_token`.

## Sign-up

| Call | Key params | Result |
| --- | --- | --- |
| `POST signup/v1.0/start` | `username`, `challenge_type`, optional `password`, `attributes` (JSON string) | `continuation_token` (errors: `user_already_exists`, password `invalid_grant` suberrors) |
| `POST signup/v1.0/challenge` | `continuation_token`, `challenge_type` | `challenge_type: oob` + `challenge_target_label`, `code_length`, `interval`; or `password` |
| `POST signup/v1.0/continue` | `continuation_token`, `grant_type` (`oob`, `password`, `attributes`) + value | `continuation_token` (user created); or `credential_required`, `attributes_required` (+ `required_attributes`), `invalid_grant` (`invalid_oob_value`, `attribute_validation_failed`, `password_*`) |
| `POST oauth2/v2.0/token` (optional) | `grant_type=continuation_token` | auto sign-in after sign-up |

## SSPR (reset password)

| Call | Key params | Result |
| --- | --- | --- |
| `POST resetpassword/v1.0/start` | `username`, `challenge_type=oob redirect` | `continuation_token` (`user_not_found`) |
| `POST resetpassword/v1.0/challenge` | `continuation_token`, `challenge_type` | `challenge_type: oob`, `challenge_target_label`, `code_length`, `binding_method`, `challenge_channel` |
| `POST resetpassword/v1.0/continue` | `continuation_token`, `grant_type=oob`, `oob` | `continuation_token`, `expires_in` (`invalid_oob_value`) |
| `POST resetpassword/v1.0/submit` | `continuation_token`, `new_password` | `continuation_token`, `poll_interval` (`password_*` suberrors) |
| `POST resetpassword/v1.0/poll_completion` | `continuation_token` | `status`: `succeeded`, `failed`, `not_started`, `in_progress` + `continuation_token` |
| `POST oauth2/v2.0/token` (optional) | `grant_type=continuation_token` | auto sign-in after reset |
