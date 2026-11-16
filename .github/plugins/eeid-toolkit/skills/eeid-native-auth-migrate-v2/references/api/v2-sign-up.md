# V2 sign-up

Read `v2-api-core.md` first: it defines the HAL handler, the link
allowlist, challenge/verify, finishing, and unhandled responses.

V2 sign-up is **email first**: the email (username) goes in the sign-up
start request, the service sends an email code right away, and the password
and other attributes are collected only after the code is verified. The
service may still list `email` in `collectAttributes`; submit the sign-up
email for it (see "Attributes").

## Step table

The table is the complete list of what the migrated code handles, in the
order it usually happens. Handle each response by its `state` and `action`
(see "Model" in `v2-api-core.md`): an action this table doesn't list →
unhandled response; a listed action after a different request than shown is
handled the same way. Only the links listed for that action are followed.

| Step | Request | Handled responses | Allowed links |
| --- | --- | --- | --- |
| 1. Entry | Start authorization | 401 with `continuation_token` | `sign_up` (flat) |
| 2. Start | `POST sign_up` `{ continuationToken, username }` | `verify` with `type: email` (code sent); `challenge` (**existing account**, see below) | `verify`, `resend`; none for `challenge` |
| 3. Verify email | `POST verify` `{ continuationToken, otp }` | `collectAttributes`; `state: continue`; `enroll` | `submitAttributes`; JIT: see `v2-jit-registration.md` |
| 4. Submit attributes (repeats) | `POST submitAttributes` `{ continuationToken, attributes: { … } }` | `collectAttributes`; `state: continue`; `enroll` | `submitAttributes`; JIT: see `v2-jit-registration.md` |
| 5. Finish | Resume authorization → `code` → `/token` (only if V1 signed in after sign-up) | tokens | none |

Resend (step 2–3): `POST resend` `{ continuationToken }`; the response is a
new `verify` with `type: email`. Offer it only where the V1 UI offered resend.

Response checks, all → unhandled response when they fail:

- Step 2 `verify` must have `type: email`.
- `collectAttributes` must have an `attributes` array whose items each have
  a non-empty string `attributeId`.
- After an attribute submission (step 4), `collectAttributes` must not
  request `password` or an attribute already submitted successfully in this
  flow (it would loop).

## Attributes

Request body: `{ "continuationToken": "…", "attributes": { "password": "…",
"givenName": "…", "extension_…_Team": "…" } }`. Values are strings.
Attribute names are the same as in V1; keep the app's names, including
custom `extension_…` attributes. `password` is submitted as an attribute.

Descriptor fields: `attributeId`, `inputType` (for example `text`,
`password`, `boolean`), `required`, `canChange`, `label`, `validation`
(with `validationRegEx`), `confirmationInput`. Ignore unknown fields.

`validation.validationRegEx` can be HTML-encoded (for example `&amp;`) and
isn't safe to run as-is. Treat it as a hint: keep the app's own V1
validation for fields it already had, and never build a regular expression
from it without decoding it and guarding against invalid or very slow
patterns. A bad pattern is ignored, not an error.

Submit **only** the attributes the latest `collectAttributes` requests:

- `email`: submit the email the user signed up with (the `username` from
  the start request, already verified by the code) automatically. Don't
  ask the user for it again.

- The V1 form already collected the value (one-screen sign-up): keep the
  values in memory only, from the form until they're submitted, then clear
  them. Never store them anywhere else. Submit them **automatically** when
  the service asks: don't show them again in a form or ask the user to
  confirm them. Show a form only for an attribute the V1 form didn't
  collect (see the next item), or after the service rejects a value (for
  example a password that's too weak), so the user can correct it.
- The service asks for an attribute the V1 UI never collected: the V1 code
  rendered `attributes_required` / `required_attributes` dynamically → render
  it the same way. Otherwise → unhandled response.
- Never send the password or attributes in the start request.

## Existing account

When the email already has an account, step 2 returns `action: challenge`
with sign-in methods instead of an email `verify`. No code is sent and it
isn't an error response.

The skill doesn't decide what happens next. **Map it to whatever the V1 app
did on `user_already_exists`** from `signup/v1.0/start` (for example show
"an account already exists", offer a sign-in link, or open the sign-in
screen with the email filled in). Never follow the response's `challenge`
links, never show its method `hint`s, and discard its continuation token.
If the app then signs the user in, that's a new sign-in flow from step 1 of
`v2-sign-in.md` (or the V1 sign-in while sign-in stays on V1).

## Finish

`state: continue` means the account was created.

- The V1 app signed the user in after sign-up (`/token` with
  `grant_type=continuation_token`) → finish with tokens (`v2-api-core.md`).
- The V1 app didn't → end the flow the way V1 did (for example a "sign-up
  complete, please sign in" screen) and discard the continuation token.

`enroll` at step 3 or 4 also means the account exists, but the service
wants a strong-auth method registered before signing the user in. In V1
this came from the automatic sign-in after sign-up (`registration_required`
from `/token`); in V2 the service asks for it inside the sign-up flow.
Follow what the V1 app did:

| V1 app after sign-up | V2 behavior |
| --- | --- |
| Signs in automatically (`/token` with `grant_type=continuation_token`), and that path handles `registration_required` | Follow `v2-jit-registration.md` with the same UI, then `state: continue` → finish with tokens |
| Signs in automatically, but that path doesn't handle `registration_required` | Do what V1 did on that error (its error message, or its web fallback for `challenge_type: redirect`), after the sign-up confirmation |
| Doesn't sign in automatically | End the flow the way V1 did (for example "sign-up complete, please sign in") and discard the continuation token. The user's next sign-in handles registration. |

Never add a web fallback the V1 app didn't have after the account was
created.

**Keep V1's order on screen.** If the V1 app showed a "sign-up complete"
screen before signing the user in (for example a "Continue to sign in"
button that used the continuation token), show it as soon as the account
exists: at `state: continue` or at `enroll`. Keep the flow state in memory.
When the user continues, run the registration (for `enroll`) and finish
with tokens. Don't run registration before the confirmation, and don't skip
the confirmation. Record this order in the plan's "Supported steps" row for sign-up.

## Behavior change to put in the plan

A V1 app that sent email, password, and attributes in one start request now
sends the email first and the rest after the code. The screens can stay the
same (values held in memory as described above), but the order of network
calls changes, and the existing-account answer comes before any password is
sent.

Keeping the one-screen form holds the password in memory until V2 asks for
it, so offer the V2-native alternative (password after the code) as a
"Decisions needed" item, with the one-screen form as the default (see
"V2-native options" in `references/flows-and-scope.md`).

## Notes

- Attribute submission isn't idempotent once the account is created. Never
  replay it.
- Don't log passwords or attributes.
- Errors and their V1 equivalents: `v2-errors.md`.
