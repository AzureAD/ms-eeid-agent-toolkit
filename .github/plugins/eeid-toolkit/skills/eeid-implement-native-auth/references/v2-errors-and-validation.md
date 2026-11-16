# V2 errors and verification

Read `v2-api-core.md` first. Normalize HAL object errors and OAuth string
errors from JSON bodies irrespective of HTTP status. Branch on codes, never
localized message wording. Read AADSTS numbers from `error_codes` first,
then `AADSTS<number>` in message/error description only for code extraction.

| Condition | Detection | Outcome |
|---|---|---|
| Browser required | OAuth `invalid_grant` + `web_redirect_required` | Approved browser restart, or explicit blocked outcome |
| Unknown user | `invalidRequest` + inner `userNotFound`, or AADSTS50034 | Non-enumerating sign-in/reset UX |
| Invalid username | `invalidRequest` + AADSTS90100 | Safe input correction |
| Wrong password | `invalidGrant` + inner `invalidUserNameOrPassword` | User correction |
| Wrong/expired OTP | `invalidGrant` + inner `invalidOneTimeCode` | User correction or offered resend |
| Password policy | `invalidRequest` + inner `passwordTooWeak`, `passwordTooShort`, `passwordTooLong`, `passwordIsInvalid`, `passwordRecentlyUsed`, `passwordBanned` | Safe field error |
| Password attribute policy | inner `attributeValidationError`, detail `attributeIds` contains `password` | Password field error regardless of detail code |
| Other invalid/missing attributes | detail `attributeValidationFailed` / `attributeRequired`, `attributeIds` | Correct requested fields |
| Bad/expired continuation, wrong state, or unrecognized error | Other `invalidRequest` / `invalidGrant` or unknown code | Explicit safe error; restart when state is invalid |
| Resume/token error, missing code/access token | OAuth or malformed success | Generic error, new authorization; no code reuse |
| Poll error/exhaustion | Poll failure after password update | Stop; no update replay |
| Throttling/network/non-JSON failure | Rate limit or transport/parse failure | Safe explicit error; no automatic mutation retry |

Diagnostics may include codes and correlation/trace IDs and timestamp;
never raw service text, request/response bodies, identifiers, or secrets.
User correction is not automatic retry: retain only the latest valid state,
then require a deliberate submission. Cancellation clears the active flow.

## Required mock tests

Use the repository's test runner and mock HTTP layer; test selected flows
without tenant credentials. A dry run names the concrete files and cases;
it does not claim these tests ran.

- Entry 401 with a token succeeds; missing token/journey link blocks.
  Initial/resume/token requests use the right encoding and exact fields.
- Relative links, including no leading slash and `{tenant}` prefix, retain
  queries and rebase correctly. Absolute, scheme-relative, malformed, and
  missing links send no request. Extra relations, `self`, and `continue`
  are never followed.
- Tokens/links rotate after responses and failures. Missing/unknown state,
  action, token, or data fails safely without stale-link reuse.
- HAL/OAuth errors normalize; browser-required fallback is checked at start,
  resume, and linked calls. It never leaks the native token into redirects.
- Code-length fallback, non-integer unrestricted input, case-insensitive
  method types, no usable methods, and missing authentication factor.
- Sign-in: selected password/email methods, MFA, JIT, wrong/expired codes,
  resend, throttling, cancellation, code exchange, refresh, session/logout.
- Sign-up: email-first start, requested attributes only, verified email
  reuse, repeated attribute steps, repeated-field loop rejection, password
  policy errors, existing-account challenge without further request,
  completion and JIT with/without automatic sign-in.
- SSPR: PUT update, rotating polls, delay/attempt limit, exhaustion/failure
  without password replay; completed reset with MFA/JIT follow-up, and
  reset-only completion without token exchange.
- JIT: email/phone bodies, unusable methods, code required even for verified
  email, resend, and activation returning another parent-supported action.
- No automatic replay of verify/attributes/update/activation, no duplicate
  submission, no logged bodies/secrets, and no state crossing users.

Run applicable type, lint, unit/UI and accessibility checks. Keep manual
tenant setup, preview enrollment, live sign-in, and fallback tests explicitly
unverified until actually completed; a mock test is not a live journey.
