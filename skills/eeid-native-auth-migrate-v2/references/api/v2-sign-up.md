# V2 sign-up

Server-driven attribute collection. The same calls serve email+password and
passwordless email OTP sign-up; the app's user flow decides which applies.

1. Start authorization → follow the `sign_up` link.
2. `POST {sign_up link}` (`/{tenant}/api/v0.1/signup/start`), JSON:
   `{ "continuationToken": "…" }`
3. Response: `action: collectAttributes`, `attributes[]` (first is `email`),
   `_links.submitAttributes`.
4. `POST {submitAttributes link}` (`/{tenant}/api/v0.1/signup/submitattributes`):
   `{ "continuationToken": "…", "attributes": { "email": "…", … } }`
   - **Email-first:** submit only `email` → OTP verify → remaining attributes.
   - **Attributes-first:** submit `email` + other attributes (e.g. `password`,
     `givenName`, `surname`) → remaining attributes → OTP verify.
   An app whose existing form collects everything on one screen maps
   naturally to attributes-first.
5. When the response is `action: verify` (email OTP already sent): show
   `hint`, size input with `codeLength`, `POST` the `verify` link with
   `{ "continuationToken": "…", "otp": "…" }`. `resend` link re-sends.
6. Keep submitting while `action: collectAttributes` (render `attributes`
   and `pages`; use exact `attributeId` keys).
7. `state: continue` → resume authorization → code → token (the user is
   signed in; there is no separate auto-sign-in call as in V1).

Attribute descriptor fields: `attributeId`, `inputType` (`text`, `boolean`,
`date`, `checkboxMultiSelect`), `required`, `hidden`, `canChange`, `label`,
`initialValue`, `regex`, `options`, `confirmationInput`. Pages: `pageId`,
`title`, `description`, `attributes`. Prefer driving UI from descriptors; a
migration that keeps a fixed form must still handle extra
`collectAttributes` responses (render them or fall back to web).

| Condition | Status | Client action |
| --- | --- | --- |
| Bad value / token | `400` | Restart or fix value |
| Sign-up unavailable | `403`/`404` | Don't offer flow |
| Missing/invalid attribute | `400` or another `collectAttributes` | Show field errors (`error.innerError.details[].attributeIds`) |
| User already exists | `400 invalidRequest` | Offer sign-in / recovery |
| Password policy | `400` | Ask for compliant password |
| Bad/expired OTP | `400 invalidRequest` | Retry or `resend` |
| Throttled | `429` | Follow server guidance |

Attribute submission isn't idempotent after user creation — never replay.
Don't log passwords or sensitive attributes.
