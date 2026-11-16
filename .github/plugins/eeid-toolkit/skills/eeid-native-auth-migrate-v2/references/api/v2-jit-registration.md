# V2 strong-auth method registration (JIT)

JIT registration isn't a flow of its own. It runs inside `sign-in`,
`sign-up`, or `sspr` when the service returns `action: enroll`, and always
uses the parent flow's version (`references/flows-and-scope.md`).

Handle it only where the app's V1 code handled `registration_required`
(`/register/v1.0/*`) on the matching path: V1 sign-in for `sign-in`, and
the V1 automatic sign-in after sign-up or reset for `sign-up` and `sspr`.
Otherwise `enroll` follows the parent flow's rule (unhandled response in
sign-in; the "Finish" table in `v2-sign-up.md` and `v2-sspr.md`).

Read `v2-api-core.md` first.

## Step table

| Step | Request | Handled responses | Allowed links |
| --- | --- | --- | --- |
| 1. Enroll required | (response from the parent flow) | `enroll` with `_embedded.methods` | each method's `enroll` |
| 2. Register | `POST enroll` with the method's body (below) | `activate` with `hint`, `codeLength` | `activate`, `resend` |
| 3. Activate | `POST activate` `{ continuationToken, otp }` | `state: continue`, or another action the parent flow handles (for example MFA `challenge` with `multiFactor` where V1 handled MFA) | that action's links |
| 4. Finish | Resume authorization → `code` → `/token` | tokens | none |

After `activate`, today's service returns `state: continue`, but any next
step is possible. Handle it as the parent flow handles that action after a
verify; an action the parent flow doesn't handle → unhandled response.

Resend (step 2–3): `POST resend` `{ continuationToken }`; the response is a
new `activate`. Today the `resend` link is the same URL as the method's
`enroll` link; use whatever the response returns. Offer it only where the V1 UI offered resend.

## Methods

Enrollment methods have no `id` or `hint`:

```json
{ "_embedded": { "methods": [
  { "type": "email", "_links": { "enroll": { "href": "/{tenant}/api/v2.0/auth/methods/email" } } },
  { "type": "phone", "channels": ["sms"], "_links": { "enroll": { "href": "/{tenant}/api/v2.0/auth/methods/phone" } } }
] } }
```

| Method | Usable when | Register body |
| --- | --- | --- |
| `type: email` | the V1 registration UI handled email | `{ continuationToken, email }` |
| `type: phone` with `"sms"` in `channels` | the V1 registration UI handled SMS | `{ continuationToken, phoneNumber, channel: "sms" }` |

- Ignore other types and channels. No usable method → unhandled response.
- A method with a missing `type` or a missing `enroll` link can't be used;
  skip it. A `phone` method without `"sms"` in `channels` (including an
  empty or missing `channels`) isn't usable for an SMS-only V1 UI; skip it.
- One usable method → do what the V1 UI did: show its choice if it showed
  one even for one method, otherwise use it. More than one → the V1 method
  choice UI.

## No preverified shortcut

V2 has no equivalent of V1's `challenge_type: preverified`. Every
registration needs the code: even when the user registers the email they
just verified during sign-in, `enroll` returns `activate` and a code is
sent. Remove the V1 preverified branch from the migrated flow (don't map it
to anything), and list this in the plan as a behavior change: users who
skipped the code in V1 now have to enter one.

## Notes

- The email or phone number is user input sent in a JSON body only, never
  in a URL, and never logged.
- `codeLength` follows the rule in `v2-api-core.md`.
- Never retry activation automatically.
- V1 → V2: `register/v1.0/introspect` → the `enroll` methods list;
  `register/v1.0/challenge` (`challenge_target`) → `POST enroll`;
  `register/v1.0/continue` (`grant_type=oob`) → `POST activate`;
  `challenge_type: preverified` + `register/v1.0/continue`
  (`grant_type=continuation_token`) → no equivalent, always `POST activate`
  with the code; `token grant_type=continuation_token` → finish.
